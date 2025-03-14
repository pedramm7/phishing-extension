// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log("Phishing Detector Extension Installed.");
});

// Function to check if the current site is reported as phishing
async function checkReportedSite(tabId, url) {
    try {
        let response = await fetch("http://127.0.0.1:5000/get-reports");
        let data = await response.json();

        if (data.reported_sites.includes(url)) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/warning.png",
                title: "⚠️ Phishing Alert!",
                message: "This site has been reported as phishing. Proceed with caution."
            });

            chrome.action.setIcon({ path: "icons/warning.png", tabId: tabId });
        } else {
            chrome.action.setIcon({ path: "icons/safe.png", tabId: tabId });
        }
    } catch (error) {
        console.error("Error checking reported sites:", error);
    }
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
        fetch("http://127.0.0.1:5000/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: request.url })
        })
        .then(response => response.json())
        .then(data => {
            sendResponse({ success: data.success, message: data.message });
        })
        .catch(error => {
            console.error("Error reporting site:", error);
            sendResponse({ success: false, message: "Error reporting site." });
        });

        return true; // Keeps sendResponse active
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
