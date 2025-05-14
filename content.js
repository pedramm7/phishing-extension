// content.js

// Data extraction helpers
function getPageTitle() {
    const title = document.title;
    return title ? title : "No Title Found";
}
  
function getMetaDescription() {
    const metaTag = document.querySelector('meta[name="description"]');
    const description = metaTag ? metaTag.content : 'No description available';
    return description ? description : "No Description Found";
}
  
function getLinks() {
    return Array.from(document.querySelectorAll('a')).map(a => a.href);
}
  
function getForms() {
    return Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input')).map(i => i.name)
    }));
}
  
function getPageText() {
    return document.body.innerText || "No Text Found";
}
  
function getImages() {
    const images = Array.from(document.querySelectorAll('img')).map(i => i.src);
    const favicon = document.querySelector("link[rel='icon']")?.href || 'No favicon';
    return { images, favicon };
}
  
// Listen for extension messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractData") {
        sendResponse({
            pageTitle: getPageTitle(),
            metaDescription: getMetaDescription(),
            links: getLinks(),
            forms: getForms(),
            images: getImages().images,
            favicon: getImages().favicon,
            pageText: getPageText()
        });
    }
  
    if (request.action === "scan") {
        const url             = window.location.href;
        const pageTitle       = getPageTitle();
        const metaDescription = getMetaDescription();
        const links           = getLinks();
        const forms           = getForms();
        const { images, favicon } = getImages();
        const pageText        = getPageText();
  
        fetch('http://127.0.0.1:5000/api/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, pageTitle, metaDescription, links, forms, images, favicon, pageText })
        })
        .then(res => res.json())
        .then(data => {
            sendResponse({ phishing: data.phishing, phishing_by_ai: data.phishing_by_ai });
            if (data.phishing) showBlockPage(data.reason);
        })
        .catch(err => {
            console.error("Fetch Error:", err);
            sendResponse({ phishing: false, phishing_by_ai: false });
        });
  
        return true;  // keep sendResponse alive
    }
});
  
  // Heuristic-based phishing detection
// function heuristicCheck(url) {
//     const patterns = [
//         /paypal.*\.com/i,
//         /login.*\.net/i,
//         /secure.*\.xyz/i];
//     if (!url.startsWith("https://")) return true;
//     return patterns.some(p => p.test(url));
// }

function showBlockPage(reason) {
    const blockUrl = chrome.runtime.getURL('block.html')
      + '?url='    + encodeURIComponent(window.location.href)
      + '&reason=' + encodeURIComponent(reason || '');
    window.location.replace(blockUrl);
}

// Redirect to full-page block warning
// function showBlockPage() {
//     const blockPage = chrome.runtime.getURL('block.html') + '?url=' + encodeURIComponent(window.location.href);
//     window.location.replace(blockPage);
// }
  
// On load: check bypass_list first, then heuristics
chrome.storage.local.get({ bypass_list: [] }, ({ bypass_list }) => {
    const current = window.location.href;
    if (bypass_list.includes(current)) {
      // one-time bypass: remove and continue
      chrome.storage.local.set({ bypass_list: bypass_list.filter(u => u !== current) });
      return;
    }
    // if (heuristicCheck(current)) {
    //   showBlockPage("Heuristic rules triggered");
    // }
});
  