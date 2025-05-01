// block.js

// Read the original URL from the query string
const params = new URLSearchParams(window.location.search);
const originalUrl = params.get('url') || 'unknown';
document.getElementById('url').textContent = originalUrl;

// “Go Back” just goes back in history
document.getElementById('back').addEventListener('click', () => {
  history.back();
});

// “Proceed Anyway” navigates to the original URL
document.getElementById('proceed').addEventListener('click', () => {
  window.location.href = originalUrl;
});
