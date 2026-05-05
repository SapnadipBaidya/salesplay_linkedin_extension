<!-- LinkedExtractor.svelte -->
<script>
  // @ts-nocheck

  import { onMount, getContext } from "svelte";

  import { isExtension } from "../authUtils";
  import { formatLinkedInUrl, getPendingContactKey, getPendingPhoneState, removePendingPhoneState, setPendingPhoneState } from "../uiUtils";
  import { enrichContactV3, getApolloContactDetails } from "../apiUtils";

  import SaveToSP from "./SaveToSP.svelte";

  /* -------------------------------------------------------------------------- */
  /* Props                                                                       */
  /* -------------------------------------------------------------------------- */

  let { accessToken, onLogout } = $props();

  /* -------------------------------------------------------------------------- */
  /* Context                                                                     */
  /* -------------------------------------------------------------------------- */

  const user = getContext("userContext");

  /* -------------------------------------------------------------------------- */
  /* Constants                                                                   */
  /* -------------------------------------------------------------------------- */

  const EMAIL_CREDITS = 2;
  const PHONE_CREDITS = 10;

  /* -------------------------------------------------------------------------- */
  /* State                                                                       */
  /* -------------------------------------------------------------------------- */

  let gettingProfile = $state(false);
  let accessingEmail = $state(false);
  let accessingPhone = $state(false);

  let profileUrl = $state("");
  let loading = $state(true);

  let profileError = $state(null);
  let emailError = $state(null);
  let phoneError = $state(null);

  let contactDetails = $state({
    email: null,
    phone: null,
    id: null
  });

  let newArrival = $state(false);

  let lastFetchedUrl = $state("");
  let isValidLinkedInUrl = $state(false);

  /* -------------------------------------------------------------------------- */
  /* URL Helpers                                                                 */
  /* -------------------------------------------------------------------------- */

  function clearUrl() {
    profileUrl = "";
    lastFetchedUrl = "";
    isValidLinkedInUrl = false;
    resetContactData();
  }

  function isValidLinkedInProfileUrl(url) {
    if (!url || typeof url !== "string") return false;

    try {
      const parsed = new URL(url.trim());

      const isLinkedIn =
        parsed.hostname === "linkedin.com" ||
        parsed.hostname === "www.linkedin.com";

      const isProfilePath = /^\/in\/[^/]+\/?$/.test(parsed.pathname);

      return isLinkedIn && isProfilePath;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Reset Helpers                                                               */
  /* -------------------------------------------------------------------------- */

  function resetContactData() {
    contactDetails = {
      email: null,
      phone: null,
      id: null
    };

    newArrival = false;

    profileError = null;
    emailError = null;
    phoneError = null;
  }

  function dismissProfileError() {
    profileError = null;
  }

  function dismissEmailError() {
    emailError = null;
  }

  function dismissPhoneError() {
    phoneError = null;
  }


  async function checkPendingPhoneState(key) {
  const data = await getPendingPhoneState(key);

  if (!data) {
    accessingPhone = false;
    return;
  }

  const tenMinutes = 10 * 60 * 1000;
  const isExpired = Date.now() - data?.ts > tenMinutes;

  if (isExpired) {
    await removePendingPhoneState(key);
    console.log("Expired pending phone key deleted:", key);
    accessingPhone = false;
    return;
  }

  const hasValidPhone =
    contactDetails?.phone?.length > 8 &&
    contactDetails?.phone !== "not found" &&
    contactDetails?.phone != null;

  if (hasValidPhone) {
    await removePendingPhoneState(key);
    accessingPhone = false;
    return;
  }

  accessingPhone = true;
}

  /* -------------------------------------------------------------------------- */
  /* Reactive Effect                                                             */
  /* -------------------------------------------------------------------------- */

$effect(() => {
  const linkedinURL = profileUrl
  isValidLinkedInUrl = isValidLinkedInProfileUrl(linkedinURL);

  if (!loading && isValidLinkedInUrl && linkedinURL !== lastFetchedUrl) {
    extractLinkedInProfile();
  }

  if (!linkedinURL) {
    return;
  }

  if (!isValidLinkedInUrl) {
    lastFetchedUrl = "";
    resetContactData();
    return;
  }

  const key = getPendingContactKey($user?.id,linkedinURL);

  checkPendingPhoneState(key);
});

  /* -------------------------------------------------------------------------- */
  /* Messaging                                                                   */
  /* -------------------------------------------------------------------------- */

  async function sendPhoneStreamMessage(payload) {
    if (isExtension) {
      chrome.runtime.sendMessage(payload);
      return;
    }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;

      const worker =
        navigator.serviceWorker.controller ||
        registration.active ||
        registration.waiting ||
        registration.installing;

      if (worker) {
        worker.postMessage(payload);
        return;
      }
    }

    console.warn("No messaging channel available.");
  }

  function handleIncomingMessages(event) {
    const message = event.data || event;

    if (message?.type === "LINKEDIN_PROFILE_URL") {
      profileUrl = message.profileUrl || "";
    }

    if (
      message?.type === "PHONE_UPDATE" &&
      message.apolloId === contactDetails.id
    ) {
      contactDetails.phone = message.phone;
      accessingPhone = false;
      newArrival = true;

      const key = getPendingContactKey($user?.id,$profileUrl);
      removePendingPhoneState(key); 
    }

    console.log("PHONE_EVENT", message, contactDetails);

    if (
      message?.type === "PHONE_UPDATE_ERROR" &&
      message.apolloId === contactDetails.id
    ) {
      phoneError = message.message;
      contactDetails.phone = phoneError;
      accessingPhone = false;
      newArrival = true;

      const key = getPendingContactKey($user?.id,$profileUrl);
      removePendingPhoneState(key); 
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Lifecycle                                                                   */
  /* -------------------------------------------------------------------------- */

  onMount(() => {
    if (!isExtension && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/background.js")
        .then((registration) => {
          console.log("SW Registered");
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          navigator.serviceWorker.addEventListener(
            "message",
            handleIncomingMessages
          );

          loading = false;
        })
        .catch((error) => {
          console.error("SW failed:", error);
          loading = false;
        });
    } else if (isExtension) {
      chrome.runtime.onMessage.addListener(handleIncomingMessages);
      chrome.runtime.sendMessage({ type: "GET_PROFILE_URL" }, (response) => {

        profileUrl = response?.profileUrl || "";
        loading = false;
        // clearUrl();
      });
    } else {
      loading = false;
    }
  });

  /* -------------------------------------------------------------------------- */
  /* API Handlers                                                                */
  /* -------------------------------------------------------------------------- */

  async function extractLinkedInProfile() {
    if (!isValidLinkedInProfileUrl(profileUrl)) return;

    profileError = null;

    try {
      gettingProfile = true;
      lastFetchedUrl = profileUrl;

      const formattedUrl = formatLinkedInUrl(profileUrl);

      const data = await getApolloContactDetails(
        formattedUrl,
        $user?.company_id
      );

      contactDetails=data
      newArrival=true
    } catch (error) {
      console.error("Profile extraction failed:", error);
      profileError = "Could not fetch contact data. Try again.";
    } finally {
      gettingProfile = false;
    }
  }

  async function handleAccessEmail() {
    if (!isValidLinkedInProfileUrl(profileUrl)) {
      emailError = "Please enter a valid LinkedIn profile URL.";
      return;
    }

    newArrival = false;
    emailError = null;

    try {
      accessingEmail = true;

      const data = await enrichContactV3(
        $user?.id,
        formatLinkedInUrl(profileUrl),
        false
      );

      contactDetails = {
        ...contactDetails,
        ...data,
        email: data?.email || "Not Found"
      };

      if (data?.email) {
        newArrival = true;
      }
    } catch (error) {
      console.error("Email access failed:", error);
      emailError = "Could not reveal email. Credits not charged.";
    } finally {
      accessingEmail = false;
    }
  }

 async function handleAccessPhone() {
  if (!isValidLinkedInProfileUrl(profileUrl)) {
    phoneError = "Please enter a valid LinkedIn profile URL.";
    return;
  }

  newArrival = false;
  phoneError = null;

  const key = getPendingContactKey();
  await setPendingPhoneState(key);

  try {
    accessingPhone = true;

    const data = await enrichContactV3(
      $user?.id,
      formatLinkedInUrl(profileUrl),
      true
    );

    contactDetails = data;

    const payload = {
      type: "START_PHONE_STREAM",
      independent: true,
      apolloId: contactDetails.id
    };

    await sendPhoneStreamMessage(payload);
  } catch (error) {
    console.error("Phone access failed:", error);
    phoneError = "Could not reveal phone.";
    accessingPhone = false;

    await removePendingPhoneState(key);
  }
}
</script>

<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
  rel="stylesheet"
/>

<!-- ----------------------------------------------------------------------- -->
<!-- Snippets                                                                -->
<!-- ----------------------------------------------------------------------- -->

{#snippet brandHeader()}
  <header class="header">
    <div class="brand">
      <div>
        <p class="brand-eyebrow">SalesPlay Contact Finder</p>
      </div>
    </div>

    <button class="btn-logout" onclick={onLogout} aria-label="Log out">
      Logout
    </button>
  </header>
{/snippet}

{#snippet skeletonLoader()}
  <div class="skeleton-stack" aria-busy="true" aria-label="Loading contact data">
    <div class="skeleton sk-tall"></div>
    <div class="skeleton sk-short"></div>
    <div class="skeleton sk-short"></div>
  </div>
{/snippet}

{#snippet profileBlock()}
  <section class="section">
    <p class="section-label">Active Profile</p>

    {#if isValidLinkedInUrl}
      <div class="profile-box">
        <span class="li-badge" aria-label="LinkedIn">in</span>

        <div class="profile-url-block">
          <strong class="profile-url">{profileUrl}</strong>
        </div>

        <button class="btn-edit" onclick={clearUrl} aria-label="Edit URL">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
            ></path>
          </svg>
        </button>
      </div>
    {:else}
      <div class="input-row">
        <span class="input-prefix" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M11 11L8.5 8.5M9.5 5.5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </span>

        <input
          id="profileUrl"
          type="url"
          bind:value={profileUrl}
          placeholder="https://www.linkedin.com/in/username"
          aria-label="LinkedIn profile URL"
        />
      </div>

      {#if profileUrl}
        <div class="inline-error" role="alert">
          <span class="error-icon">!</span>
          <span>Please enter a valid LinkedIn profile URL.</span>
        </div>
      {/if}
    {/if}

    {#if profileError}
      {@render inlineError(profileError, dismissProfileError)}
    {/if}
  </section>
{/snippet}

{#snippet fetchingIndicator()}
  {#if gettingProfile && isValidLinkedInUrl}
    <div class="fetching-row" role="status" aria-live="polite">
      <span class="pulse-dot" aria-hidden="true"></span>
      <span>Fetching contact data…</span>
    </div>
  {/if}
{/snippet}

{#snippet contactCard()}
  <section class="section">
    <p class="section-label">Contact Details</p>

    <div class="contact-card" role="list">
      <!-- Email Row -->
      <div class="contact-row" role="listitem">
        <div class="row-icon email-bg" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect
              x="1"
              y="2.5"
              width="11"
              height="8"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.3"
            />

            <path
              d="M1 4.5l5.5 3.5L12 4.5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <div class="row-meta">
          <span class="row-label">Email Address</span>

          {#if contactDetails?.email}
            <strong class="row-value">{contactDetails.email}</strong>
          {:else}
            <span class="credits-hint">
              <span class="dot-bullet" aria-hidden="true"></span>
              {EMAIL_CREDITS} credits to reveal
            </span>
          {/if}

          {#if emailError}
            {@render inlineError(emailError, dismissEmailError)}
          {/if}
        </div>

        {#if !contactDetails?.email}
          <button
            class="btn-reveal btn-email"
            onclick={handleAccessEmail}
            disabled={accessingEmail || gettingProfile || !isValidLinkedInUrl}
          >
            {accessingEmail ? "Accessing…" : "Access Email"}
          </button>
        {/if}
      </div>

      <div class="row-divider" role="separator"></div>

      <!-- Phone Row -->
      <div class="contact-row" role="listitem">
        <div class="row-icon phone-bg" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
            ></path>
          </svg>
        </div>

        <div class="row-meta">
          <span class="row-label">Phone Number</span>

          {#if contactDetails?.phone}
            <strong class="row-value">{contactDetails.phone}</strong>
          {:else if accessingPhone}
            <div class="fetching-row mini">
              <span class="pulse-dot"></span>
              <span>Revealing...</span>
            </div>
          {:else}
            <span class="credits-hint">
              <span class="dot-bullet" aria-hidden="true"></span>
              {PHONE_CREDITS} credits to reveal
            </span>
          {/if}

          {#if phoneError}
            {@render inlineError(phoneError, dismissPhoneError)}
          {/if}
        </div>

        {#if !contactDetails?.phone && !accessingPhone}
          <button
            class="btn-reveal btn-phone"
            onclick={handleAccessPhone}
            disabled={gettingProfile || !isValidLinkedInUrl}
          >
            Access Both
          </button>
        {/if}
      </div>
    </div>
  </section>
{/snippet}

{#snippet cardFooter()}
  <footer class="card-footer">
    <span>Credits consumed on reveal</span>
    <span class="footer-dot" aria-hidden="true">·</span>
    <span>Powered by Apollo</span>
  </footer>
{/snippet}

{#snippet inlineError(message, onDismiss)}
  <div class="inline-error" role="alert">
    <span>{message}</span>

    <button class="error-dismiss" onclick={onDismiss} aria-label="Dismiss error">
      ×
    </button>
  </div>
{/snippet}

<!-- ----------------------------------------------------------------------- -->
<!-- Markup                                                                  -->
<!-- ----------------------------------------------------------------------- -->

<div class="card">
  {@render brandHeader()}

  <div class="divider"></div>

  {#if loading}
    {@render skeletonLoader()}
  {:else}
    {@render profileBlock()}
    {@render fetchingIndicator()}

    {#if !gettingProfile}
      {@render contactCard()}
    {/if}

    {@render cardFooter()}
  {/if}
</div>

{#if contactDetails?.id != null}
  <SaveToSP contactData={contactDetails} newArrival={newArrival} />
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --c-bg: #ffffff;
    --c-surface: #f7f7f6;
    --c-border: #e8e6e1;
    --c-border2: #f0ede8;
    --c-ink: #1a1917;
    --c-ink2: #6b6660;
    --c-ink3: #a09c97;
    --c-accent: #2d5be3;
    --c-accent-h: #1e46c4;
    --c-email-bg: #eef3fd;
    --c-phone-bg: #edf7f1;
    --c-err: #c0392b;
    --c-err-bg: #fdf1f0;
    --c-err-bdr: #f5c2bd;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-card: 0 1px 3px rgba(26, 25, 23, 0.06),
      0 6px 20px rgba(26, 25, 23, 0.07);
    --font: "DM Sans", system-ui, sans-serif;
  }

  .card {
    width: 100%;
    max-width: 380px;
    padding: 18px 18px 14px;
    background: var(--c-bg);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    border: 1px solid var(--c-border);
    font-family: var(--font);
    color: var(--c-ink);
    /* Remove height/overflow restrictions */
    height: auto;
    margin-bottom: 16px; /* Space before SaveToSP component */
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .brand-mark {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--c-accent);
    flex-shrink: 0;
  }

  .brand-eyebrow {
    font-size: 9.5px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--c-ink3);
    line-height: 1;
  }

  .btn-logout {
    padding: 5px 11px;
    border-radius: 99px;
    border: 1px solid var(--c-border);
    background: transparent;
    color: var(--c-ink2);
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font);
    cursor: pointer;
  }

  .btn-logout:hover {
    background: #fdf1f0;
    color: var(--c-err);
    border-color: var(--c-err-bdr);
  }

  .divider {
    height: 1px;
    background: var(--c-border2);
    margin: 0 -18px 16px;
  }

  .section {
    margin-bottom: 14px;
  }

  .section-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--c-ink3);
    margin-bottom: 7px;
  }

  .profile-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    animation: fadeUp 0.22s ease both;
  }

  .li-badge {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: #0a66c2;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-edit {
    margin-left: auto;
    background: transparent;
    border: none;
    color: var(--c-ink3);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .btn-edit:hover {
    background: var(--c-border2);
    color: var(--c-accent);
  }

  .profile-box {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    animation: fadeUp 0.22s ease both;
    position: relative; /* Context for button */
  }

  /* Ensure the URL doesn't overlap the edit button */
  .profile-url-block {
    flex: 1;
    min-width: 0;
  }

  .meta-label {
    font-size: 9.5px;
    color: var(--c-ink3);
    font-weight: 600;
  }

  .profile-url {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--c-ink);
    word-break: break-all;
    line-height: 1.3;
  }

  .input-row {
    position: relative;
    animation: fadeUp 0.22s ease both;
  }

  .input-prefix {
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--c-ink3);
    pointer-events: none;
    display: flex;
  }

  .input-row input {
    width: 100%;
    height: 40px;
    padding: 0 12px 0 34px;
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    background: var(--c-surface);
    font-size: 12.5px;
    font-family: var(--font);
    color: var(--c-ink);
    outline: none;
  }

  .input-row input:focus {
    border-color: var(--c-accent);
    background: var(--c-bg);
    box-shadow: 0 0 0 3px rgba(45, 91, 227, 0.1);
  }

  .fetching-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: #eef3fd;
    border: 1px solid #c5d6fb;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    color: var(--c-accent);
    margin-bottom: 12px;
  }

  .pulse-dot {
    width: 5px;
    height: 5px;
    border-radius: 99px;
    background: var(--c-accent);
    animation: pulse 1.1s ease-in-out infinite;
  }

  .contact-card {
    border: 1px solid var(--c-border);
    border-radius: var(--radius-lg);
    background: var(--c-bg);
    overflow: hidden;
  }

  .contact-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 13px;
    min-height: 54px;
  }

  .contact-row:hover {
    background: var(--c-surface);
  }

  .row-divider {
    height: 1px;
    background: var(--c-border2);
    margin: 0 13px;
  }

  .row-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--c-ink2);
  }

  .email-bg {
    background: var(--c-email-bg);
  }

  .phone-bg {
    background: var(--c-phone-bg);
  }

  .row-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .row-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--c-ink3);
  }

  .row-value {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--c-ink);
    word-break: break-all;
    overflow-wrap: anywhere;
  }

  .credits-hint {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    color: var(--c-ink3);
  }

  .dot-bullet {
    width: 4px;
    height: 4px;
    border-radius: 99px;
    background: var(--c-border);
    flex-shrink: 0;
  }

  .btn-reveal {
    flex-shrink: 0;
    height: 30px;
    padding: 0 11px;
    border-radius: 99px;
    border: none;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-email {
    background: var(--c-accent);
    color: #fff;
  }

  .btn-phone {
    background: var(--c-ink);
    color: #fff;
  }

  .btn-reveal:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .inline-error {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
    padding: 5px 8px;
    background: var(--c-err-bg);
    border: 1px solid var(--c-err-bdr);
    border-radius: 7px;
    font-size: 10.5px;
    font-weight: 500;
    color: var(--c-err);
  }

  .error-dismiss {
    margin-left: auto;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-err);
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding-top: 12px;
    font-size: 10px;
    font-weight: 500;
    color: var(--c-ink3);
  }

  .skeleton-stack {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .skeleton {
    border-radius: var(--radius-md);
    background: linear-gradient(
      90deg,
      var(--c-border2) 25%,
      var(--c-surface) 50%,
      var(--c-border2) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  .sk-tall {
    height: 50px;
  }

  .sk-short {
    height: 54px;
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.8);
    }

    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }

    to {
      background-position: -200% 0;
    }
  }
</style>