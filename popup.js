// popup.js - Handles UI interactions
document.addEventListener("DOMContentLoaded", function () {
    let siteStatus = document.getElementById("site-status");
    let reportButton = document.getElementById("report-phishing");

    // Get the active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
        let currentUrl = tabs[0].url;
        
        // Check if the site is in the phishing database
        let isPhishing = await checkPhishing(currentUrl);
        
        if (isPhishing) {
            siteStatus.innerHTML = "🚨 Warning: This site is flagged as phishing!";
            siteStatus.style.color = "red";
        } else {
            siteStatus.innerHTML = "✅ This site appears safe.";
            siteStatus.style.color = "green";
        }
    });

    // Function to check phishing status via backend API
    async function checkPhishing(url) {
        try {
            let response = await fetch("https://your-backend-api.com/check?url=" + encodeURIComponent(url));
            let data = await response.json();
            return data.isPhishing; // Returns true if phishing detected
        } catch (error) {
            console.error("Error checking site status:", error);
            return false;
        }
    }

    // Report phishing button functionality
    reportButton.addEventListener("click", async function () {
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
            let currentUrl = tabs[0].url;
            
            let response = await fetch("https://your-backend-api.com/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: currentUrl, reason: "User Reported" })
            });

            let data = await response.json();
            if (data.success) {
                alert("✅ Thank you! This site has been reported for review.");
            } else {
                alert("❌ Error reporting site. Try again later.");
            }
        });
    });
});

