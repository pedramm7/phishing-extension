// this function is to check if the current site is reported as phishing
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

// this function is to handle scanning and extract data from the website
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

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        // sending a message to content script to check phishing
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
