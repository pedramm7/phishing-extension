chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "scan") {
        const url = window.location.href;
        console.log("🔍 Scanning URL:", url);

        fetch('http://127.0.0.1:5000/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url })
        })
        .then(response => response.json())
        .then(data => {
            console.log("✅ API Response:", data);
            sendResponse({ phishing: data.phishing });
        })
        .catch(error => {
            console.error("❌ Fetch Error:", error);
            sendResponse({ phishing: false });
        });

        return true; // Allows sendResponse to work asynchronously
    }
});
