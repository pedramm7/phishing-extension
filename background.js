const lastScan = {};
const SCAN_INTERVAL = 1000;

function throttleScan(details) {
    const { tabId } = details;
    const now = Date.now();
  
    // Skip if we scanned this tab < SCAN_INTERVAL ago
    if (lastScan[tabId] && (now - lastScan[tabId] < SCAN_INTERVAL)) {
      return;
    }
    lastScan[tabId] = now;
  
    // Fire the content-script scan exactly once per interval
    chrome.tabs.sendMessage(tabId, { action: "scan" }, response => {
      // optional: update icon/banner if needed
    });
}

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log("Phishing Detector Extension Installed.");
    refreshBlockingRules();
});

refreshBlockingRules();

// This function checks if the current site is reported as phishing
async function checkReportedSite(tabId, url) {
    // 1) Check local cache first
    const localList = await new Promise(resolve =>
        chrome.storage.local.get({ blocked_sites: [] }, res => resolve(res.blocked_sites))
    );
    if (localList.includes(url)) {
        markAsPhishing(tabId);
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/get-reports");
        const data = await response.json();

        if (data.reported_sites.includes(url)) {
            chrome.storage.local.get({ blocked_sites: [] }, result => {
                const list = result.blocked_sites;
                if (!list.includes(url)) {
                  list.push(url);
                  chrome.storage.local.set({ blocked_sites: list });
                }
            });

            markAsPhishing(tabId);
        } else {
            markAsSafe(tabId);
        }
    } catch (error) {
        console.error("Error checking reported sites:", error);
        markAsSafe(tabId);
    }
}

function markAsPhishing(tabId) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/warning.png",
      title: "⚠️ Phishing Alert!",
      message: "This site has been reported as phishing. Proceed with caution."
    });
    chrome.action.setIcon({ path: "icons/warning.png", tabId });
}
  
function markAsSafe(tabId) {
    chrome.action.setIcon({ path: "icons/safe.png", tabId });
}

// Listen for tab changes and check if it's a reported site
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        checkReportedSite(tabId, tab.url);
    }
});

// Handle reporting phishing sites from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reportSite") {
        const urlToReport = request.url;

        fetch("http://127.0.0.1:5000/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: urlToReport })
        })
        .then(response => response.json())
        .then(data => {
            chrome.storage.local.get({ blocked_sites: [] }, result => {
                const list = result.blocked_sites;
                if (!list.includes(urlToReport)) {
                  list.push(urlToReport);
                  chrome.storage.local.set({ blocked_sites: list }, ()=> {
                    refreshBlockingRules();
                  });
                }
              });

            sendResponse({ success: data.success, message: data.message });
        })
        .catch(error => {
            console.error("Error reporting site:", error);
            sendResponse({ success: false, message: "Error reporting site." });
        });

        return true; // Keeps sendResponse active
    }
});

// This function is to handle scanning and extract data from the website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        // Send message to content.js to extract data
        chrome.tabs.sendMessage(tabId, { action: "extractData" }, function(response) {
            // Log or send extracted data to backend
            console.log("Extracted Data: ", response);

            // Optionally, send this data to your backend (Flask API)
            fetch('http://127.0.0.1:5000/api/store_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response)
            }).then(res => res.json())
              .then(data => console.log("Data sent to backend:", data))
              .catch(error => console.error("Error sending data to backend:", error));
        });
    }
});

// Detect phishing before a site loads
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        // Sending a message to content script to check phishing
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "scan" }, function(response) {
                    if (response && response.phishing) {
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'icons/icon48.png',
                            title: 'Phishing Warning',
                            message: 'This site has been flagged as a phishing site.'
                        });
                    }
                });
            }
        });
    },
    { urls: ["<all_urls>"] }
);

// Re-build DNR rules from chrome.storage.local.blocked_sites
async function refreshBlockingRules() {
    const { blocked_sites = [] } = await new Promise(r =>
      chrome.storage.local.get({ blocked_sites: [] }, r)
    );
  
    // Map each URL to a declarativeNetRequest rule
    const newRules = blocked_sites.map((site, i) => ({
      id:       1000 + i,            // unique rule IDs
      priority: 1,
      action:   { type: 'block' },
      condition: {
        urlFilter: site,             // exact match; you can expand to patterns
        resourceTypes: ['main_frame'] 
      }
    }));
  
    // Fetch existing dynamic rules so we can remove them all first
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeIds = existing.map(r => r.id);
  
    // Atomically remove old rules and add the new set
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeIds,
      addRules: newRules
    });
}