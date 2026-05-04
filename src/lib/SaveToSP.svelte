<!-- SaveToSP.svelte -->
<script>
  import { onMount, getContext } from "svelte";
  import { fade, slide } from "svelte/transition";
  import {
    getSavedGlobalContactsPerUserId,
    createGlobalContactList
  } from "../apiUtils";

  const user = getContext("userContext");
  let { newArrival, contactData } = $props();

  // ── State ──
  let contactLists   = $state([]);
  let filteredLists  = $state([]);
  let searchText     = $state("");
  let loading        = $state(false);
  let creating       = $state(false);
  let savingStatus   = $state("idle"); // "idle" | "saving" | "success" | "error"
  let error          = $state("");
  let selectedList   = $state(null);
  let open           = $state(false);
  let fetchError     = $state("");

  async function fetchContactLists() {
    const userId = $user?.id || user?.id;
    if (!userId) return;
    fetchError = "";
    loading = true;
    try {
      const response = await getSavedGlobalContactsPerUserId(userId);
      contactLists  = response || [];
      filteredLists = contactLists;
    } catch (err) {
      console.error("Failed to fetch lists:", err);
      fetchError = "Could not load lists. Tap to retry.";
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (newArrival) {
      fetchContactLists();
    }
  });

  function handleSearch(value) {
    searchText    = value;
    const query   = value.toLowerCase().trim();
    filteredLists = contactLists.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }

  function isExactMatch() {
    return contactLists.some(
      (item) => item.name.toLowerCase() === searchText.toLowerCase().trim()
    );
  }

  function resetSelection() {
    savingStatus = "idle";
    selectedList = null;
    open         = true;
    fetchContactLists();
  }
 

    async function createNewList() {
    if (!searchText.trim()) return;
    savingStatus = "saving";
    error        = "";
    const userId = $user?.id || user?.id;
    try {
     await createGlobalContactList(
        "save", [], userId, {}, [], [], [contactData], null, searchText
      );
      searchText=""
      savingStatus = "success";
    } catch (err) {
      console.error("Save failed:", err);
      savingStatus = "error";
      error        = "Failed to save contact. Please try again.";
    }
  }

  async function selectList(item) {
    selectedList = item;
    open         = false;
    searchText   = "";
    await performSave(item);
  }

  async function performSave(list) {
    savingStatus = "saving";
    error        = "";
    const userId = $user?.id || user?.id;
    try {
      await createGlobalContactList(
        "save", [], userId, {}, [], [], [contactData], list?.id, null
      );
      savingStatus = "success";
    } catch (err) {
      console.error("Save failed:", err);
      savingStatus = "error";
      error        = "Failed to save contact. Please try again.";
    }
  }
</script>

<!-- ────────── SNIPPETS ────────── -->

{#snippet triggerButton()}
  <button
    class="trigger"
    onclick={() => (open = !open)}
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    <div class="trigger-body">
      <span class="trigger-eyebrow">Add to Contact List</span>
      <strong class="trigger-value">{selectedList?.name || "Select a list…"}</strong>
    </div>
    <span class="chevron" class:open aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  </button>
{/snippet}

{#snippet searchBar()}
  <div class="search-wrap">
    <span class="search-icon" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M8 8l2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </span>
    <input
      class="search-input"
      type="search"
      placeholder="Search or create list…"
      value={searchText}
      oninput={(e) => handleSearch(e.target.value)}
      aria-label="Search contact lists"
      autocomplete="off"
    />
  </div>
{/snippet}

{#snippet listItems()}
  <div class="scroll-area" role="listbox" aria-label="Contact lists">
    {#if loading}
      {@render listLoader()}
    {:else if fetchError}
      {@render fetchErrorState()}
    {:else if filteredLists.length === 0}
      {@render emptyState()}
    {:else}
      {#each filteredLists as item (item.id)}
        <button
          class="list-item"
          role="option"
          aria-selected="false"
          onclick={() => selectList(item)}
        >
          <span class="item-name">{item.name}</span>
          <span class="item-count">{item.count} contacts</span>
        </button>
      {/each}
    {/if}

    {#if searchText && !isExactMatch() && !loading}
      {@render createButton()}
    {/if}
  </div>
{/snippet}

{#snippet createButton()}
  <button
    class="btn-create"
    disabled={creating}
    onclick={createNewList}
    aria-label={`Create list named ${searchText}`}
  >
    {#if creating}
      <span class="spinner mini" aria-hidden="true"></span>
      <span>Creating…</span>
    {:else}
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
        <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <span>Create "<strong>{searchText}</strong>"</span>
    {/if}
  </button>
{/snippet}

{#snippet listLoader()}
  <div class="loader-row" role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>
    <span>Loading lists…</span>
  </div>
{/snippet}

{#snippet emptyState()}
  <p class="empty-msg" role="status">
    {searchText ? "No matches found" : "No lists yet"}
  </p>
{/snippet}

{#snippet fetchErrorState()}
  <div class="fetch-error" role="alert">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/>
      <path d="M7 4.5V7.5M7 9.5h.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
    <span>{fetchError}</span>
    <button class="retry-link" onclick={fetchContactLists}>Retry</button>
  </div>
{/snippet}

{#snippet savingCard()}
  <div class="status-card saving" role="status" aria-live="polite" in:fade>
    <span class="spinner lg" aria-hidden="true"></span>
    <p class="status-msg">Saving to <strong>{selectedList?.name}</strong>…</p>
  </div>
{/snippet}

{#snippet resultCard()}
  <div
    class="status-card {savingStatus}"
    role="alert"
    aria-live="assertive"
    in:fade
  >
    <div class="result-icon {savingStatus}" aria-hidden="true">
      {#if savingStatus === "success"}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      {/if}
    </div>

    <div class="result-text">
      <h3>{savingStatus === "success" ? "Contact Saved" : "Save failed"}</h3>
      <p>{error || `Successfully added to ${selectedList?.name}`}</p>
    </div>

    <!-- The Prompt Section -->
    <div class="next-steps">
      <p class="prompt-text">Would you like to save this contact to another list?</p>
      <div class="button-group">
        <button class="btn-primary" onclick={resetSelection}>
          Yes, choose another
        </button>
        <button class="btn-secondary" onclick={() => (newArrival = false)}>
          No, I'm done
        </button>
      </div>
    </div>
  </div>
{/snippet}

<!-- ────────── MARKUP ────────── -->

{#if newArrival}
  <div class="wrapper">
    <div class="section-divider" aria-hidden="true"></div>

    {#if savingStatus === "idle"}
      {@render triggerButton()}

      {#if open}
        <div class="panel" transition:slide={{ duration: 180 }} role="dialog" aria-label="Select contact list">
          {@render searchBar()}
          {@render listItems()}
        </div>
      {/if}

    {:else if savingStatus === "saving"}
      {@render savingCard()}
    {:else}
      {@render resultCard()}
    {/if}
  </div>
{/if}

<style>
  /* ── Tokens (inherit from LinkedExtractor, redefine locally as fallback) ── */
  .wrapper {
    --c-bg:       #ffffff;
    --c-surface:  #f7f7f6;
    --c-border:   #e8e6e1;
    --c-border2:  #f0ede8;
    --c-ink:      #1a1917;
    --c-ink2:     #6b6660;
    --c-ink3:     #a09c97;
    --c-accent:   #2d5be3;
    --c-accent-h: #1e46c4;
    --c-success:  #1a7a51;
    --c-success-bg: #ebf7f2;
    --c-success-bdr: #a8dfca;
    --c-err:      #c0392b;
    --c-err-bg:   #fdf1f0;
    --c-err-bdr:  #f5c2bd;
    --font: 'DM Sans', system-ui, sans-serif;

    width: 100%;
    max-width: 380px;
    font-family: var(--font);
    position: relative;
  }

  .section-divider {
    height: 1px;
    background: var(--c-border2);
    margin-bottom: 14px;
  }

  /* ── Trigger ── */
  .trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 13px;
    background: var(--c-surface);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    cursor: pointer;
    font-family: var(--font);
    transition: border-color .15s, background .15s, box-shadow .15s;
    text-align: left;
  }

  .trigger:hover {
    background: var(--c-bg);
    border-color: #c5c0b8;
  }

  .trigger:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(45,91,227,.15);
    border-color: var(--c-accent);
  }

  .trigger-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .trigger-eyebrow {
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .09em;
    color: var(--c-ink3);
    line-height: 1;
  }

  .trigger-value {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--c-ink);
  }

  .chevron {
    color: var(--c-ink3);
    transition: transform .2s ease;
    display: flex;
    flex-shrink: 0;
  }

  .chevron.open { transform: rotate(180deg); }

  /* ── Dropdown panel ── */
  .panel {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 14px;
    box-shadow: 0 8px 24px -4px rgba(26,25,23,.12), 0 2px 6px rgba(26,25,23,.06);
    z-index: 100;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Search bar ── */
  .search-wrap {
    position: relative;
    padding: 10px 10px 8px;
    border-bottom: 1px solid var(--c-border2);
  }

  .search-icon {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-55%);
    color: var(--c-ink3);
    display: flex;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    height: 36px;
    padding: 0 11px 0 32px;
    border: 1px solid var(--c-border);
    border-radius: 9px;
    background: var(--c-surface);
    font-size: 12px;
    font-family: var(--font);
    color: var(--c-ink);
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none;
  }

  .search-input:focus {
    border-color: var(--c-accent);
    background: var(--c-bg);
    box-shadow: 0 0 0 3px rgba(45,91,227,.1);
  }

  .search-input::placeholder { color: var(--c-ink3); }

  /* ── Scroll area ── */
  .scroll-area {
    max-height: 240px;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    scrollbar-width: thin;
    scrollbar-color: var(--c-border) transparent;
  }

  /* ── List item ── */
  .list-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 10px;
    border-radius: 9px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: var(--font);
    transition: background .12s;
    text-align: left;
  }

  .list-item:hover { background: var(--c-surface); }

  .item-name {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--c-ink);
  }

  .item-count {
    font-size: 10.5px;
    color: var(--c-ink3);
    font-weight: 500;
  }

  /* ── Create button ── */
  .btn-create {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: calc(100% - 12px);
    margin: 4px 6px 6px;
    padding: 9px 12px;
    border-radius: 9px;
    border: 1px dashed var(--c-accent);
    background: transparent;
    color: var(--c-accent);
    font-size: 11.5px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: background .12s, border-style .12s;
    position: sticky;
    bottom: 0;
  }

  .btn-create:hover:not(:disabled) {
    background: rgba(45,91,227,.06);
    border-style: solid;
  }

  .btn-create:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  /* ── Empty / error / loader states ── */
  .empty-msg {
    font-size: 11.5px;
    color: var(--c-ink3);
    text-align: center;
    padding: 20px 10px;
    font-style: italic;
  }

  .loader-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    font-size: 11.5px;
    color: var(--c-ink3);
  }

  .fetch-error {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 6px;
    padding: 9px 10px;
    background: var(--c-err-bg);
    border: 1px solid var(--c-err-bdr);
    border-radius: 9px;
    font-size: 11px;
    font-weight: 500;
    color: var(--c-err);
  }

  .retry-link {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--c-accent);
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* ── Status cards ── */
  .status-card {
    width: 100%;
    padding: 20px 16px;
    border-radius: 14px;
    border: 1px solid var(--c-border);
    background: var(--c-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    font-family: var(--font);
  }

  .status-msg {
    font-size: 12.5px;
    color: var(--c-ink2);
  }

  .result-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .result-icon.success { background: var(--c-success-bg); color: var(--c-success); }
  .result-icon.error   { background: var(--c-err-bg);     color: var(--c-err); }

  .result-text h3 {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--c-ink);
    margin-bottom: 3px;
  }

  .result-text p {
    font-size: 11.5px;
    color: var(--c-ink2);
  }

  .btn-again {
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-ink2);
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font);
    cursor: pointer;
    transition: background .12s, border-color .12s;
  }

  .btn-again:hover {
    background: var(--c-bg);
    border-color: #c5c0b8;
  }

  /* ── Spinner ── */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--c-border);
    border-top-color: var(--c-accent);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
    flex-shrink: 0;
  }

  .spinner.mini {
    width: 13px;
    height: 13px;
    border-width: 1.8px;
    border-top-color: currentColor;
  }

  .spinner.lg {
    width: 26px;
    height: 26px;
    border-width: 2.5px;
  }
  .next-steps {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--c-border2);
    width: 100%;
  }

  .prompt-text {
    font-size: 11.5px;
    color: var(--c-ink);
    margin-bottom: 12px;
    font-weight: 500;
  }

  .button-group {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .btn-primary {
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--c-accent);
    color: white;
    border: none;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    padding: 8px 14px;
    border-radius: 8px;
    background: var(--c-surface);
    color: var(--c-ink2);
    border: 1px solid var(--c-border);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary:hover { background: var(--c-accent-h); }
  .btn-secondary:hover { background: var(--c-bg); }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>