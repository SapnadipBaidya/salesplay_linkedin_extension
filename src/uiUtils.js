export function formatLinkedInUrl(url) {
    // Regular expression to find the profile slug after "/in/"
    const regex = /\/in\/([a-zA-Z0-9\-_%]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
        const username = match[1];
        return `http://www.linkedin.com/in/${username}`;
    } else {
        return "Invalid LinkedIn URL";
    }
}


// @ts-ignore
export function sendProfileUrl(url) {
  console.log("LinkedIn profile detected:", url);

  // @ts-ignore
  chrome.runtime.sendMessage({
    type: "LINKEDIN_PROFILE_URL",
    profileUrl: url
  });
}


export const sendMessageAsync = (message) => {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    chrome.runtime.sendMessage(message, (response) => {
      // @ts-ignore
      if (chrome.runtime.lastError) {
        // @ts-ignore
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response);
    });
  });
};
