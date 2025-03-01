chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scan") {
        const url = window.location.href;
        fetch('http://localhost:5000/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        })
        .then(response => response.json())
        .then(data => {
            sendResponse({ phishing: data.phishing });
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ phishing: false });
        });

        return true;
    }
});
