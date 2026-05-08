<script>
  import axios from "axios";
  import { loginToSP } from "../authUtils";

  let email = $state("");
  let password = $state("");
  let userStat = "user";

  let loading = $state(false);
  let errorMessage = $state("");
  let successMessage = $state("");

  let showPassword = $state(false);
  let emailTouched = $state(false);
  let passwordTouched = $state(false);

  export const getUserStatsObject = (
    type = "",
    action = "",
    data = "",
    page = "",
    account_id = ""
  ) => {
    let userStat = { type, action, data, page, account_id };
    return userStat;
  };

  let { onLoginSuccess, isExtension = false } = $props();

  // ── Validation ──
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const emailError = $derived(
    emailTouched
      ? !email
        ? "Email is required."
        : !emailRegex.test(email)
          ? "Enter a valid email address."
          : ""
      : ""
  );

  const passwordError = $derived(
    passwordTouched
      ? !password
        ? "Password is required."
        : password.length < 6
          ? "Password must be at least 6 characters."
          : ""
      : ""
  );

  const isFormValid = $derived(emailRegex.test(email) && password.length >= 6);

  async function handleLogin() {
    emailTouched = true;
    passwordTouched = true;
    errorMessage = "";
    successMessage = "";

    if (!email || !password) {
      errorMessage = "Please enter email and password.";
      return;
    }

    if (!isFormValid) {
      errorMessage = "Please fix the highlighted fields.";
      return;
    }

    loading = true;

    try {
      const userStat = getUserStatsObject(
        "Login",
        "login",
        "Login successful",
        "salesPlay_chrome_extension"
      );

      const isLoggedIn = await loginToSP(
        email,
        password,
        userStat,
        isExtension
      );

      if (isLoggedIn) {
       await onLoginSuccess?.(isLoggedIn);
        successMessage = "Login successful.";
      } else {
        errorMessage = "Invalid login response.";
      }
    } catch (error) {
      errorMessage =
        error?.message ||
        error?.detail ||
        "Login failed. Please try again.";
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    await handleLogin();
  }
</script>

<div class="login-page">
  <div class="login-card">
    <header class="brand">
      <img class="logo" src="/mnm_logo.png" alt="MarketsandMarkets" />

      <div class="brand-text">
        <p>Sign in to continue</p>
      </div>
    </header>

    <div class="divider"></div>

    <form onsubmit={handleSubmit}>
      <div class="field">
        <label for="email">Email</label>

        <input
          id="email"
          type="email"
          bind:value={email}
          onblur={() => (emailTouched = true)}
          placeholder="Enter your email"
          autocomplete="email"
          class:is-error={emailError}
          disabled={loading}
        />

        {#if emailError}
          <span class="field-error">{emailError}</span>
        {/if}
      </div>

      <div class="field">
        <label for="password">Password</label>

        <div class="pw-wrap">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            bind:value={password}
            onblur={() => (passwordTouched = true)}
            placeholder="Enter your password"
            autocomplete="current-password"
            class:is-error={passwordError}
            disabled={loading}
          />

          <button
            type="button"
            class="eye-btn"
            onclick={() => (showPassword = !showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabindex="-1"
          >
            {#if showPassword}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                />
                <path
                  d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </div>

        {#if passwordError}
          <span class="field-error">{passwordError}</span>
        {/if}
      </div>

      {#if errorMessage}
        <div class="msg-box error-box" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          {errorMessage}
        </div>
      {/if}

      {#if successMessage}
        <div class="msg-box success-box" role="status">
          {successMessage}
        </div>
      {/if}

      <button type="submit" class="btn-submit" disabled={loading}>
        {#if loading}
          <span class="spinner"></span> Logging in…
        {:else}
          Login
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :global(:root) {
    --bg-page: #f2f4f7;
    --bg-card: #ffffff;
    --accent-blue: #dbeafe;
    --blue-border: #bfdbfe;
    --text-black: #000000;
    --text-grey: #4b5563;
    --border-grey: #e5e7eb;
    --red: #dc2626;
    --red-bg: #fef2f2;
    --red-border: #fecaca;
    --green: #15803d;
    --green-bg: #f0fdf4;
    --green-border: #bbf7d0;
    --font-family: "DM Sans", sans-serif;
  }

  .login-page {
    width: 100%;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 32px 16px;
    background: var(--bg-page);
    font-family: var(--font-family);
    overflow-y: auto;
  }

  .login-card {
    width: 100%;
    max-width: 320px;
    background: var(--bg-card);
    border: 1px solid var(--border-grey);
    border-radius: 12px;
    padding: 28px 20px 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .logo {
    height: 1.5rem;
  }

  .brand-text p {
    margin: 0;
    font-size: 13px;
    color: var(--text-grey);
  }

  .divider {
    height: 1px;
    background: var(--border-grey);
    margin: 0 -20px 20px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-black);
  }

  .pw-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .pw-wrap input {
    padding-right: 38px;
  }

  .eye-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text-grey);
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }

  .eye-btn:hover {
    color: var(--text-black);
  }

  input {
    width: 100%;
    height: 42px;
    background: var(--bg-page);
    border: 1px solid var(--border-grey);
    border-radius: 8px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--text-black);
    font-family: inherit;
    outline: none;
    transition:
      border-color 0.18s,
      background 0.18s;
  }

  input::placeholder {
    color: #9ca3af;
  }

  input:focus {
    background: var(--accent-blue);
    border-color: var(--blue-border);
  }

  input.is-error {
    border-color: var(--red);
    background: var(--red-bg);
  }

  input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .field-error {
    font-size: 11px;
    color: var(--red);
    font-weight: 500;
    padding-left: 2px;
  }

  .msg-box {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 11px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
  }

  .error-box {
    background: var(--red-bg);
    color: var(--red);
    border: 1px solid var(--red-border);
  }

  .success-box {
    background: var(--green-bg);
    color: var(--green);
    border: 1px solid var(--green-border);
  }

  .btn-submit {
    width: 100%;
    height: 42px;
    background: var(--text-black);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    transition: opacity 0.18s;
  }

  .btn-submit:hover:not(:disabled) {
    opacity: 0.82;
  }

  .btn-submit:disabled {
    background: var(--text-grey);
    cursor: not-allowed;
  }

  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>