document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const scanButton = document.getElementById('scanButton');

    scanButton.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "scan" }, function(response) {
                if (response.phishing) {
                    statusElement.textContent = "Warning: Phishing detected!";
                    statusElement.style.color = "red";
                } else {
                    statusElement.textContent = "No phishing detected.";
                    statusElement.style.color = "green";
                }
            });
        });
    });
});
