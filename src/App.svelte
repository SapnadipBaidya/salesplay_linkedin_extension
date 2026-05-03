<!-- App.svelte -->
<script>
  import { onMount, setContext } from "svelte";
  import { writable } from "svelte/store";
  import LoginScreen from "./lib/LoginScreen.svelte";
  import LinkedExtractor from "./lib/LinkedExtractor.svelte";
  import { fetchUserDetails, isExtension, removeTokens } from "./authUtils";

  let accessToken    = $state("");
  let isUserLoggedIn = $state(false);
  let loading        = $state(true);
  let loadError      = $state("");

  const userStore = writable({});
  setContext("userContext", userStore);

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

  // function handleRetry() {
  //   loadError = "";
  //   loading   = true;
  //   // Re-trigger the mount logic by resetting + re-fetching
  //   (async () => {
  //     try {
  //       accessToken = localStorage.getItem("access_token") || "";
  //       const data  = await fetchUserDetails();
  //       if (data?.id) {
  //         userStore.set(data);
  //         isUserLoggedIn = true;
  //       }
  //     } catch (err) {
  //       loadError = "Still unable to connect. Check your network.";
  //     } finally {
  //       loading = false;
  //     }
  //   })();
  // }
</script>

<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
  rel="stylesheet"
/>

<!-- ────────── SNIPPETS ────────── -->

{#snippet loadingView()}
  <div class="shell" aria-busy="true" aria-label="Checking login status">
    <div class="loading-layout">
      <div class="loading-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.6" stroke-opacity=".18"/>
          <path d="M10 1.5A8.5 8.5 0 0 1 18.5 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
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
</style>