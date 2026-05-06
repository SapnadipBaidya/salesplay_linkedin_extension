<!-- App.svelte -->
<script>
  import { onMount, setContext } from "svelte";
  import { writable } from "svelte/store";
  import LoginScreen from "./lib/LoginScreen.svelte";
  import LinkedExtractor from "./lib/LinkedExtractor.svelte";
  import { fetchUserDetails, isExtension, removeTokens } from "./authUtils";
    import { sendMessageAsync } from "./uiUtils";

  let accessToken    = $state("");
  let isUserLoggedIn = $state(false);
  let loading        = $state(true);
  let loadError      = $state("");

  const userStore = writable({});
  setContext("userContext", userStore);

// @ts-ignore
async function getTokenFromWebApp() {
  const APP_URL   = "https://salesplay.marketsandmarkets.com/*";
  const LOGIN_URL = "https://salesplay.marketsandmarkets.com/clients_accounts";

  // @ts-ignore
  let [tab] = await chrome.tabs.query({ url: APP_URL });
  let createdTab = false; // track if WE opened it

  if (!tab) {
    // @ts-ignore
    tab = await chrome.tabs.create({ url: LOGIN_URL, active: false });
    createdTab = true;

    await new Promise((resolve) => {
      // @ts-ignore
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          // @ts-ignore
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });

    await new Promise(r => setTimeout(r, 500));
  }

  // @ts-ignore
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      accessToken:  localStorage.getItem("access_token"),
      refreshToken: localStorage.getItem("refresh_token"),
    }),
  });

  if (createdTab) {
    // @ts-ignore
    chrome.tabs.remove(tab.id);
  }

  const { accessToken, refreshToken } = result.result;

  if (accessToken) {
    await sendMessageAsync({ type: "SAVE_AUTH", accessToken, refreshToken });
  } else {
    console.log("Tab found but user is not logged in.");
  }
}

  onMount(async () => {
    if (!isExtension) {
      try {
        accessToken = localStorage.getItem("access_token") || "";
        const data  = await fetchUserDetails();
        if (data?.id) {
          userStore.set(data);
          isUserLoggedIn = true;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        loadError = "Could not verify session. Please refresh.";
      } finally {
        loading = false;
      }
      return;
    }

    // @ts-ignore
   await getTokenFromWebApp()

    // @ts-ignore
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, async (response) => {
      try {
        accessToken = response?.accessToken || "";
        if (accessToken) {
          const data = await fetchUserDetails();
          if (data?.id) {
            userStore.set(data);
            isUserLoggedIn = true;
          }
        }
      } catch (err) {
        console.error("Extension auth check failed:", err);
        loadError = "Could not verify session. Please try again.";
      } finally {
        loading = false;
      }
    });
  });

  async function handleLoginSuccess(isLoggedIn) {
    try {
      isUserLoggedIn = isLoggedIn;
      const data = await fetchUserDetails();
       console.log("handleLoginSuccess",data)
      if (data?.id) {
        userStore.set(data);
      }
    } catch (err) {
      console.error("Post-login user fetch failed:", err);
    }
  }

  function handleLogout() {
    isUserLoggedIn = false;
    userStore.set({});
    removeTokens();
  }

</script>

<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
  rel="stylesheet"
/>

<!-- ────────── SNIPPETS ────────── -->

{#snippet loadingView()}
  <div class="shell" aria-busy="true" aria-label="Checking login status">
    <div class="loading-layout">
      <div class="spinner" aria-hidden="true">
        <div class="spinner-track"></div>
        <div class="spinner-arc"></div>
      </div>
      <p class="loading-label">Checking session…</p>
    </div>
  </div>
{/snippet}

{#snippet errorView()}
  <div class="shell" role="alert">
    <div class="error-layout">
      <div class="error-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M11 7v5M11 14.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <p class="error-title">Something went wrong</p>
      <p class="error-msg">{loadError}</p>
      <!-- <button class="btn-retry" onclick={handleRetry}>Try again</button> -->
    </div>
  </div>
{/snippet}

<!-- ────────── ROOT ────────── -->

<div class="root">
  {#if loading}
    {@render loadingView()}
  {:else if loadError}
    {@render errorView()}
  {:else if isUserLoggedIn}
    <div class="shell">
      <LinkedExtractor {accessToken} onLogout={handleLogout} />
    </div>
  {:else}
    <div class="shell">
      <LoginScreen onLoginSuccess={handleLoginSuccess} {isExtension} />
    </div>
  {/if}
</div>

<style>
  :global(html),
  :global(body) {
    /* Change height to min-height and remove overflow hidden */
    min-height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    background: #f7f7f6;
    font-family: 'DM Sans', sans-serif; /* Global Font */
  }

  :global(#app) {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .root {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 20px 0; /* Give some breathing room at top/bottom */
  }

  .shell {
    width: 100%;
    max-width: 400px; /* Standard extension width */
    padding: 0 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.45; }
  50%       { opacity: 1; }
}


.loading-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.spinner {
  position: relative;
  width: 28px;
  height: 28px;
}

.spinner-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, currentColor 15%, transparent);
}

.spinner-arc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: currentColor;
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.loading-label {
  font-size: 13px;
  color: var(--your-muted-color);
  letter-spacing: 0.01em;
  animation: pulse 2s ease-in-out infinite;
}
</style>