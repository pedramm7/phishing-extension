
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
        })
        .catch(error => {
            console.error("❌ Fetch Error:", error);
            sendResponse({ phishing: false });
        });

        return true; // Allows sendResponse to work asynchronously
    }
});
