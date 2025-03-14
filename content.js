console.log("Phishing Detector Content Script Loaded");

// Listen for scan requests from popup.js
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

            if (data.phishing || heuristicCheck(url)) {
                showWarningBanner();
            }
        })
        .catch(error => {
            console.error("❌ Fetch Error:", error);
            sendResponse({ phishing: false });
        });

        return true; // Allows sendResponse to work asynchronously
    }
});

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

// Run heuristic checks on page load
if (heuristicCheck(window.location.href)) {
    showWarningBanner();
}
