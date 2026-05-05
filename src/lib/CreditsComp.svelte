<script>
let { deductCredits = $bindable() } = $props();
  import { getContext, onMount } from "svelte";
  import { getCreditBalance, getCreditTransactions } from "../apiUtils";

  const fmt = (n) => n.toLocaleString();
  const user = getContext("userContext");

  let currentBalance = $state(0);
  let totalBalance = $state(0);
  let loading = $state(true);
  deductCredits = (amount) => {
    if (typeof amount !== "number" || amount <= 0) return;
    currentBalance = Math.max(0, currentBalance - amount);
  };
  const pct = $derived(
    totalBalance > 0 ? Math.min((currentBalance / totalBalance) * 100, 100) : 0
  );

  onMount(async () => {
    const [balanceResp, transactionsResp] = await Promise.all([
      getCreditBalance($user?.id),
      getCreditTransactions($user?.id),
    ]);

    currentBalance = balanceResp ?? 0;

    const creditsArray = Array.isArray(transactionsResp) ? transactionsResp : [];
    totalBalance = creditsArray
      .filter((item) => item?.type === "credit")
      .reduce((sum, item) => sum + (item?.credits ?? 0), 0);

    loading = false;
    console.log("user credit", currentBalance, totalBalance);
  });
</script>

<div class="credits-bar">
  <div class="row">
    <span class="label">Credits</span>
    {#if loading}
      <span class="skeleton skeleton-count"></span>
    {:else}
      <span class="count">{fmt(currentBalance)} / {fmt(totalBalance)}</span>
    {/if}
  </div>

  <div class="track">
    {#if loading}
      <div class="fill shimmer"></div>
    {:else}
      <div class="fill" style="width: {pct}%"></div>
    {/if}
  </div>
</div>

<style>
  .credits-bar {
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 1rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .label {
    font-size: 11px;
    font-weight: 500;
    color: #888780;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .count {
    font-size: 12px;
    font-weight: 500;
    color: #888780;
  }

  /* --- track --- */
  .track {
    height: 5px;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 99px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: #7f77dd;
    border-radius: 99px;
    transition: width 0.5s ease;
  }

  /* --- skeleton base --- */
  .skeleton {
    display: inline-block;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.06) 25%,
      rgba(0, 0, 0, 0.12) 50%,
      rgba(0, 0, 0, 0.06) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  .skeleton-count {
    width: 110px;
    height: 12px;
  }

  /* --- shimmer fill on the bar itself --- */
  .fill.shimmer {
    width: 40%;
    opacity: 0.45;
    background: linear-gradient(
      90deg,
      #afa9ec 25%,
      #7f77dd 50%,
      #afa9ec 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
  }

  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>