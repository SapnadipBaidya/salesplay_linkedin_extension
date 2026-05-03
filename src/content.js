let lastUrl = location.href;
console.log("mounted content.js")
function sendProfileUrl(url) {
  console.log("LinkedIn profile detected:", url);

  // @ts-ignore
  chrome.runtime.sendMessage({
    type: "LINKEDIN_PROFILE_URL",
    profileUrl: url
  });
}

// Initial trigger
sendProfileUrl(lastUrl);

// Detect URL changes (SPA navigation)
const observer = new MutationObserver(() => {
  console.log("MutationObserver",location)
  if (location.href !== lastUrl) {
    lastUrl = location.href;

    if (lastUrl.includes("linkedin.com")) {
      sendProfileUrl(lastUrl);
    }
  }
});

// Observe DOM changes (LinkedIn updates DOM on route change)
observer.observe(document.body, {
  childList: true,
  subtree: true
});