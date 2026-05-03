// @ts-nocheck
/**
 * --- STATE & CONSTANTS ---
 */
const isExtension = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.runtime.id;

const phoneControllers = {}; // apolloId → AbortController
const phoneSources = {};     // apolloId → EventSource
const phoneBuffers = {};     // apolloId → latest phone value

/**
 * --- INITIALIZATION ---
 */
if (isExtension) {
chrome.runtime.onInstalled.addListener(() => {
  console.log("SalesPlay extension installed");
});
}

/**
 * --- MESSAGING HANDLERS (EXTENSION) ---
 */
if (isExtension) {
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START_PHONE_STREAM":
      debugger
      startPhoneStream(message?.independent, message.apolloId);
      break;

    case "STOP_PHONE_STREAM":
      stopPhoneStream(message.apolloId);
      break;

    case "LINKEDIN_PROFILE_URL":
      chrome.storage.session.set({ linkedinProfileUrl: message.profileUrl }, () => {
        sendResponse({ success: true });
      });
      return true; // Keep channel open for async response

    case "GET_PROFILE_URL":
      chrome.storage.session.get("linkedinProfileUrl", (result) => {
        sendResponse({ profileUrl: result.linkedinProfileUrl || null });
      });
      return true;

    case "SAVE_AUTH":
      chrome.storage.session.set({
        accessToken: message.accessToken,
        refreshToken: message.refreshToken
      }, () => {
        sendResponse({ success: true });
      });
      return true;

    case "GET_AUTH_STATUS":
      chrome.storage.session.get(["accessToken", "refreshToken"], (result) => {
        sendResponse({
          isAuthenticated: Boolean(result.accessToken),
          accessToken: result.accessToken || null,
          refreshToken: result.refreshToken || null
        });
      });
      return true;
  }
});
}
/**
 * --- MESSAGING HANDLERS (WEB/SERVICE WORKER) ---
 */
self.addEventListener("message", (event) => {
  const { type, independent, apolloId } = event.data;
  
  if (type === "START_PHONE_STREAM") {
    debugger
    startPhoneStream(independent, apolloId);
  } else if (type === "STOP_PHONE_STREAM") {
    stopPhoneStream(apolloId);
  }
});

/**
 * --- SIDE PANEL / POPUP LOGIC ---
 */
if (isExtension) {
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel?.open && tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    // Fallback for older Chrome versions or if sidePanel isn't configured
    chrome.action.setPopup({ popup: "index.html" });
  }
});
}
/**
 * --- CORE LOGIC & STREAMING ---
 */

async function broadcast(msg) {
  if (isExtension) {
    // 1. To internal views (Popup/Sidepanel)
    chrome.runtime.sendMessage(msg).catch(() => {/* No active listeners */});

    // 2. To all open Tabs (Content Scripts)
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {/* Tab not ready */});
      }
    }
  } else {
    // --- NORMAL WEB APP / PWA LOGIC ---
    const allClients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: "window",
    });
    for (const client of allClients) {
      client.postMessage(msg);
    }
  }
}

async function broadcastPhone(payload) {
  console.log(`[${isExtension ? 'Extension' : 'Web'}] Broadcasting Phone:`, payload);
  await broadcast(payload);
}

async function startPhoneStream(source, apolloId) {
  if (phoneSources[apolloId]) {
    console.log("Phone SSE already running for", apolloId);
    return;
  }

  const url = `https://api-salesplay.marketsandmarkets.com/v2/contact/enriched_contact_sse/${apolloId}`;
  const evt = new EventSource(url);
  phoneSources[apolloId] = evt;

  evt.addEventListener("phoneUpdate", (e) => {
    const phone = e.data;
    phoneBuffers[apolloId] = phone;
debugger
    broadcastPhone({ type: "PHONE_UPDATE", apolloId, phone });
    
    evt.close();
    delete phoneSources[apolloId];
  });

  evt.onerror = async (err) => {
    console.warn("Phone SSE Error:", err);
    
    try {
      const resp = await fetch(url);
      const text = await resp.text();

      if (text && text.startsWith("{")) {
        const json = JSON.parse(text);
        broadcastPhone({
          type: "PHONE_UPDATE_ERROR",
          apolloId,
          message: json.error || "Unknown error",
        });
      } else {
        throw new Error("Invalid Response");
      }
    } catch (e2) {
      broadcast({
        type: "PHONE_UPDATE_ERROR",
        apolloId,
        message: "Error Fetching",
      });
    } finally {
      evt.close();
      delete phoneSources[apolloId];
    }
  };
}

function stopPhoneStream(apolloId) {
  if (phoneSources[apolloId]) {
    phoneSources[apolloId].close();
    delete phoneSources[apolloId];
  }
}