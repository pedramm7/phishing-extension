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
