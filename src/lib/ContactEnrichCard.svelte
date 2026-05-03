<script>
  let { profileUrl = "", onEnrich = () => {} } = $props();

  function handleEnrich() {
    onEnrich(profileUrl);
  }
</script>

<button onclick={handleEnrich}>
  Enrich Contact
</button>