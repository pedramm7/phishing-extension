// content.js - Phishing Detection Script
console.log("Phishing Detector Content Script Loaded");

// Get the current website URL
let currentUrl = window.location.href;

// Function to check if the URL is in a phishing database
async function checkPhishing(url) {
    try {
        let response = await fetch("https://your-backend-api.com/check?url=" + encodeURIComponent(url));
        let data = await response.json();
        return data.isPhishing; // Returns true if phishing detected
    } catch (error) {
        console.error("Error checking phishing database:", error);
        return false; // Assume safe if there's an error
    }
}

// Heuristic-based phishing detection
function heuristicCheck(url) {
    let phishingPatterns = [
        /paypal.*\.com/i,  // Example: "paypal-secure.com"
        /login.*\.net/i,   // Example: "login-facebook.net"
        /secure.*\.xyz/i,  // Example: "secure-banking.xyz"
    ];

    if (!url.startsWith("https://")) {
        console.warn("🚨 Warning: Site does not use HTTPS! Potential phishing risk.");
        return true; // Non-HTTPS sites are risky
    }

    return phishingPatterns.some(pattern => pattern.test(url));
}

// Display warning banner on suspicious websites
function showWarningBanner() {
    let banner = document.createElement("div");
    banner.innerHTML = `
        🚨 WARNING: This site may be a phishing attempt! 🚨 <br>
        <button id="leave-site" style="margin-right:10px;">Leave Site</button>
        <button id="report-site">Report as Safe</button>
    `;
    banner.style.backgroundColor = "red";
    banner.style.color = "white";
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.width = "100%";
    banner.style.padding = "15px";
    banner.style.textAlign = "center";
    banner.style.zIndex = "9999";
    document.body.prepend(banner);

    document.getElementById("leave-site").addEventListener("click", () => {
        window.location.href = "https://google.com";
    });

    document.getElementById("report-site").addEventListener("click", () => {
        alert("✅ Site reported. We will review it.");
    });
}

// Allow users to report a suspicious site
async function reportPhishingSite(url) {
    try {
        let response = await fetch("https://your-backend-api.com/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: url, reason: "User Reported" })
        });

        let data = await response.json();
        if (data.success) {
            alert("✅ Thank you for reporting! This site will be reviewed.");
        } else {
            alert("❌ Error reporting site. Try again later.");
        }
    } catch (error) {
        console.error("Error reporting phishing site:", error);
    }
}

// Main function to analyze the website
async function analyzeWebsite() {
    let isPhishing = await checkPhishing(currentUrl);
    
    if (isPhishing || heuristicCheck(currentUrl)) {
        showWarningBanner();
    }
}

// Run the analysis when the page loads
analyzeWebsite();

