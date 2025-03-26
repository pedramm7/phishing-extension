
// Here are some data that can be extracted form the website
// This data might be used for the AI model training
function getPageTitle() {
    const title = document.title;
    console.log('Page Title: ', title);
    return title;
}

function getMetaDescription() {
    const metaTag = document.querySelector('meta[name="description"]');
    const description = metaTag ? metaTag.content : 'No description available';
    console.log('Meta Description: ', description);
    return description;
}

function getLinks() {
    const links = Array.from(document.querySelectorAll('a')).map(link => link.href);
    console.log('Links: ', links);
    return links;
}

function getForms() {
    const forms = Array.from(document.querySelectorAll('form')).map(form => {
        return {
            action: form.action,
            method: form.method,
            inputs: Array.from(form.querySelectorAll('input')).map(input => input.name)
        };
    });
    console.log('Forms: ', forms);
    console.log('Favicon: ', favicon)
    return forms;
}

function getImages() {
    const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
    const favicon = document.querySelector("link[rel='icon']") ? 
        document.querySelector("link[rel='icon']").href : 'No favicon';
    console.log('Images:', images);
    console.log('Favicon:', favicon);
    return { images, favicon };
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "extractData") {
        const pageTitle = getPageTitle();
        const metaDescription = getMetaDescription();
        const links = getLinks();
        const forms = getForms();
        const { images, favicon } = getImages();

        sendResponse({
            pageTitle,
            metaDescription,
            links,
            forms,
            images,
            favicon
        });
    }

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
