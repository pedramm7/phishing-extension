// block.js

// Read the original URL and reason from the query string
const params      = new URLSearchParams(window.location.search);
const originalUrl = params.get('url')    || 'unknown';
const reason      = params.get('reason') || '';

// Show the URL
document.getElementById('url').textContent = originalUrl;

// Display the reason, if any
if (reason) {
  document.getElementById('reason').textContent = `Reason: ${reason}`;
}

// “Go Back” just goes back in history
document.getElementById('back').addEventListener('click', () => {
  history.back();
});

// “Proceed Anyway” navigates to the original URL once
document.getElementById('proceed').addEventListener('click', () => {
  chrome.storage.local.get({ bypass_list: [] }, ({ bypass_list }) => {
    if (!bypass_list.includes(originalUrl)) {
      bypass_list.push(originalUrl);
      chrome.storage.local.set({ bypass_list }, () => {
        window.location.href = originalUrl;
      });
    } else {
      window.location.href = originalUrl;
    }
  });
});
