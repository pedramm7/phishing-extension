chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        fetch('http://localhost:5000/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: details.url })
        })
        .then(response => response.json())
        .then(data => {
            if (data.phishing) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Phishing Warning',
                    message: 'This site has been flagged as a phishing site.'
                });
            }
        });
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);
