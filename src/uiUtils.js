// --- 1. Environment & State ---
export const isExtension =
  // @ts-ignore
  typeof chrome !== "undefined" &&
  // @ts-ignore
  chrome.runtime &&
  // @ts-ignore
  chrome.runtime.id;


export function formatLinkedInUrl(url) {
    // Regular expression to find the profile slug after "/in/"
    const regex = /\/in\/([a-zA-Z0-9\-_%]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
        const username = match[1];
        return `http://www.linkedin.com/in/${username}`;
    } else {
        return "Invalid LinkedIn URL";
    }
}


// @ts-ignore
export function sendProfileUrl(url) {
  console.log("LinkedIn profile detected:", url);

  // @ts-ignore
  chrome.runtime.sendMessage({
    type: "LINKEDIN_PROFILE_URL",
    profileUrl: url
  });
}


export const sendMessageAsync = (message) => {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    chrome.runtime.sendMessage(message, (response) => {
      // @ts-ignore
      if (chrome.runtime.lastError) {
        // @ts-ignore
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response);
    });
  });
};




// @ts-ignore
export function getPendingContactKey(userId,profileUrl) {
  // @ts-ignore
  return `${userId}_${profileUrl}`;
}

// @ts-ignore
export function setPendingPhoneState(key) {
  const value = {
    ts: Date.now()
  };

  if (isExtension) {
    return new Promise((resolve) => {
      // @ts-ignore
      chrome.runtime.sendMessage(
        {
          type: "SAVE_PENDING_CONTACT_KEY",
          key,
          value
        },
        () => resolve(true)
      );
    });
  }

  localStorage.setItem(key, JSON.stringify(value));
  return Promise.resolve(true);
}

// @ts-ignore
export function getPendingPhoneState(key) {
  if (isExtension) {
    return new Promise((resolve) => {
      // @ts-ignore
      chrome.runtime.sendMessage(
        {
          type: "GET_PENDING_CONTACT_KEY",
          key
        },
        (response) => {
          resolve(response?.value || null);
        }
      );
    });
  }

  const rawData = localStorage.getItem(key);

  if (!rawData) return Promise.resolve(null);

  try {
    return Promise.resolve(JSON.parse(rawData));
  } catch {
    localStorage.removeItem(key);
    return Promise.resolve(null);
  }
}

// @ts-ignore
export function removePendingPhoneState(key) {
  if (isExtension) {
    return new Promise((resolve) => {
      // @ts-ignore
      chrome.runtime.sendMessage(
        {
          type: "DELETE_PENDING_CONTACT_KEY",
          key
        },
        () => resolve(true)
      );
    });
  }

  localStorage.removeItem(key);
  return Promise.resolve(true);
}