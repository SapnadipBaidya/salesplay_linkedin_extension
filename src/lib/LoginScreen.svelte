<script>
  import axios from "axios";
    import { loginToSP } from "../authUtils";
  
  let email = "";
  let password = "";
  let userStat = "user";

  let loading = false;
  let errorMessage = "";
  let successMessage = "";



  
  export const getUserStatsObject = (type = "", action = "", data = "", page = "", account_id = "") =>{
  let userStat = {
    type: type,
    action: action,
    data: data,
    page: page,
    account_id: account_id,
    // request_page_domain: window.location.hostname,
    // request_page_url: window.location.href
  };
  return userStat;
}




  let { onLoginSuccess , isExtension= false} = $props();
  async function handleLogin() {
    errorMessage = "";
    successMessage = "";

    if (!email || !password) {
      errorMessage = "Please enter email and password.";
      return;
    }

    loading = true;

    try {
      const userStat = getUserStatsObject("Login", "login", "Login successful", "salesPlay_chrome_extension");
      const isLoggedIn = await loginToSP(email, password, userStat,isExtension);


      if (isLoggedIn) {
        // @ts-ignore
        onLoginSuccess?.(isLoggedIn);
        successMessage = "Login successful.";

      } else {
        errorMessage = "Invalid login response.";
      }
    } catch (error) {
      errorMessage =
        error?.message ||
        error?.detail ||
        error?.message ||
        "Login failed. Please try again.";
    } finally {
      loading = false;
    }
  }
</script>
<div class="login-page">
  <div class="login-card">
    <header class="brand">
      <div class="logo">SP</div>
      <div class="brand-text">
        <p>Sign in to continue</p>
      </div>
    </header>

    <div class="divider"></div>

    <form onsubmit={(e) => e.preventDefault()}>
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="Enter your email"
          autocomplete="email"
        />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter your password"
          autocomplete="current-password"
        />
      </div>

      {#if errorMessage}
        <div class="error-box" role="alert">
          {errorMessage}
        </div>
      {/if}

      <button type="button" class="btn-submit" onclick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  </div>
</div>

<style>
  /* ────────── YOUR THEME PALETTE ────────── */
  :global(:root) {
    --bg-page: #f2f4f7;        /* Very light grey background */
    --bg-card: #ffffff;        /* Pure white card */
    --accent-blue: #dbeafe;    /* Your light blue theme */
    --blue-border: #bfdbfe;    /* Darker light blue for focus */
    --text-black: #000000;     /* Solid black for fonts */
    --text-grey: #4b5563;      /* Muted black/grey for subtext */
    --border-grey: #e5e7eb;    /* Light grey for lines */
    --font-family: 'DM Sans', sans-serif;
  }

  .login-page {
    width: 100%;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--bg-page);
    font-family: var(--font-family);
  }

  .login-card {
    width: 100%;
    max-width: 350px;
    background: var(--bg-card);
    border: 1px solid var(--border-grey);
    border-radius: 12px;
    padding: 32px 24px;
    /* Removed heavy shadows for a cleaner look */
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  /* Header & Logo */
  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .logo {
    width: 48px;
    height: 48px;
    background: var(--text-black); /* Black logo base */
    color: var(--bg-card);         /* White text on logo */
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
  }

  .brand-text h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-black);
  }

  .brand-text p {
    margin: 4px 0 0;
    font-size: 14px;
    color: var(--text-grey);
  }

  .divider {
    height: 1px;
    background: var(--border-grey);
    margin: 0 -24px 24px;
  }

  /* Inputs & Labels */
  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-black);
    text-align: center; /* Center labels to match your screenshot style */
  }

  input {
    width: 100%;
    height: 44px;
    background: var(--bg-page); /* Light grey input background */
    border: 1px solid var(--border-grey);
    border-radius: 8px;
    padding: 0 16px;
    font-size: 14px;
    color: var(--text-black); /* SOLID BLACK TEXT */
    font-family: inherit;
    outline: none;
    transition: all 0.2s ease;
  }

  input::placeholder {
    color: #9ca3af;
  }

  input:focus {
    background: var(--accent-blue); /* Light blue background on focus */
    border-color: var(--blue-border);
  }

  /* Solid Black Button */
  .btn-submit {
    width: 100%;
    height: 46px;
    background: var(--text-black);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.2s;
  }

  .btn-submit:hover:not(:disabled) {
    opacity: 0.85;
  }

  .btn-submit:disabled {
    background: var(--text-grey);
    cursor: not-allowed;
  }

  .error-box {
    background: #fee2e2;
    color: #b91c1c;
    padding: 10px;
    border-radius: 6px;
    font-size: 12px;
    text-align: center;
    font-weight: 500;
  }
</style>