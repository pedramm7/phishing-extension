document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const scanButton = document.getElementById('scanButton');
    const reportButton = document.getElementById('reportButton');
    const reportStatus = document.getElementById('reportStatus');

    scanButton.disabled = true;
    statusElement.textContent = "Scanning...";
    statusElement.style.color = "black";

    let currentUrl = "";

    function performScan() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length === 0) return;

            currentUrl = tabs[0].url; // Store URL for reporting

            chrome.tabs.sendMessage(tabs[0].id, { action: "scan" }, function(response) {
                if (!response) {
                    statusElement.textContent = "Error: No response from content script.";
                    statusElement.style.color = "orange";
                    scanButton.disabled = false;
                    return;
                }

                if (response.phishing) {
                    statusElement.textContent = "⚠️ Warning: Phishing detected!";
                    statusElement.style.color = "red";
                } else {
                    statusElement.textContent = "✅ No phishing detected.";
                    statusElement.style.color = "green";
                }

                scanButton.disabled = false;
            });
        });
    }

    performScan();

    scanButton.addEventListener('click', function() {
        scanButton.disabled = true;
        statusElement.textContent = "Scanning...";
        statusElement.style.color = "black";
        performScan();
    });

    reportButton.addEventListener('click', function() {
        if (!currentUrl) {
            reportStatus.textContent = "❌ No URL found.";
            reportStatus.style.color = "red";
            return;
        }

        fetch('http://127.0.0.1:5000/api/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentUrl })
        })
        .then(response => response.json())
        .then(data => {
            reportStatus.textContent = "✅ " + data.message;
            reportStatus.style.color = "green";
        })
        .catch(error => {
            reportStatus.textContent = "❌ Error reporting site.";
            reportStatus.style.color = "red";
            console.error("Report Error:", error);
        });
    });
});

