// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Phishing Detection Extension installed.");

  // Fetch reported phishing URLs from your backend
  fetch("http://127.0.0.1:5000/get-reports")
    .then(res => res.json())
    .then(data => {
      const phishingUrls = data.reported_sites || [];

      const rules = phishingUrls.map((url, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: "block" },
        condition: {
          urlFilter: url,
          resourceTypes: ["main_frame"]
        }
      }));

      // Remove all previous dynamic rules, then add new ones
      const ruleIdsToRemove = rules.map(rule => rule.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: rules
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error updating dynamic rules:", chrome.runtime.lastError.message);
        } else {
          console.log("Blocking rules updated:", rules);
        }
      });
    })
    .catch(error => {
      console.error("Failed to fetch phishing URLs from backend:", error);
    });
});
