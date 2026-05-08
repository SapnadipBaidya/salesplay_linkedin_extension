// @ts-nocheck
let lastUrl = location.href;
console.log("mounted content.js");

function sendProfileUrl(url) {
  // Only send if this tab is active and visible
  if (document.visibilityState !== "visible") return;

  console.log("LinkedIn profile detected:", url);
  chrome.runtime.sendMessage({
    type: "LINKEDIN_PROFILE_URL",
    profileUrl: url,
  });
}

// Initial trigger
sendProfileUrl(lastUrl);

// Detect URL changes (SPA navigation)
const observer = new MutationObserver(() => {
  console.log("MutationObserver", location);
  if (location.href !== lastUrl) {
    lastUrl = location.href;

    if (lastUrl.includes("linkedin.com")) {
      sendProfileUrl(lastUrl);
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also fire when user switches back to this tab
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    sendProfileUrl(lastUrl);
  }
});