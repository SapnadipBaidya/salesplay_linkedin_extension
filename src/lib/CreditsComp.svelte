<script>
  import { Progress } from "bits-ui";

  export let usedCredits = 120;
  export let totalCredits = 200;
  export let label = "Credits";

  $: safeTotal = Math.max(Number(totalCredits) || 0, 0);
  $: safeUsed = Math.max(Number(usedCredits) || 0, 0);
  $: leftCredits = Math.max(safeTotal - safeUsed, 0);
  $: progress = safeTotal ? Math.min((safeUsed / safeTotal) * 100, 100) : 0;
  $: state = progress >= 90 ? "danger" : progress >= 70 ? "warn" : "ok";
</script>

<section class="credits-card" aria-label="Credit usage">
  <div class="content">
    <div class="main">
      <span class="label">{label}</span>

      <div class="value">
        <span class="used">{safeUsed}</span>
        <span class="total">/{safeTotal}</span>
      </div>
    </div>

    <span class="chip {state}">
      {leftCredits} left
    </span>
  </div>

  <Progress.Root
    class="progress-root {state}"
    value={progress}
    max={100}
    aria-label="Credit usage"
  />
</section>

<style>
  .credits-card {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 11px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 14px;
    color: #fff;
    background:
      radial-gradient(circle at 0% 0%, rgba(96, 165, 250, 0.28), transparent 34%),
      linear-gradient(135deg, #020617, #0f172a);
    box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
  }

  .content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .label {
    display: block;
    margin-bottom: 3px;
    color: rgba(255, 255, 255, 0.62);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .value {
    display: flex;
    align-items: baseline;
    line-height: 1;
  }

  .used {
    font-size: 24px;
    font-weight: 850;
    line-height: 0.9;
    letter-spacing: -0.06em;
  }

  .total {
    color: rgba(255, 255, 255, 0.48);
    font-size: 13px;
    font-weight: 750;
  }

  .chip {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    min-height: 21px;
    padding: 0 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #bbf7d0;
    font-size: 10.5px;
    font-weight: 800;
    white-space: nowrap;
  }

  .chip.warn {
    color: #fde68a;
  }

  .chip.danger {
    color: #fecaca;
  }

  :global(.progress-root) {
    height: 6px;
    margin-top: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.13);
  }

  :global(.progress-root > div) {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #60a5fa, #2563eb);
    transition: width 320ms ease;
  }

  :global(.progress-root.warn > div) {
    background: linear-gradient(90deg, #fbbf24, #f59e0b);
  }

  :global(.progress-root.danger > div) {
    background: linear-gradient(90deg, #fb7185, #ef4444);
  }
</style>