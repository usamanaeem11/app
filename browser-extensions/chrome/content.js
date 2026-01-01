// Working Tracker - Content Script
// Runs on every page to track activity

(function() {
  // Track idle time
  let lastActivity = Date.now();
  let isIdle = false;
  const IDLE_THRESHOLD = 60000; // 1 minute
  
  // Listen for user activity
  ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      lastActivity = Date.now();
      if (isIdle) {
        isIdle = false;
        chrome.runtime.sendMessage({ action: 'userActive' });
      }
    }, { passive: true });
  });
  
  // Check for idle state periodically
  setInterval(() => {
    if (Date.now() - lastActivity > IDLE_THRESHOLD && !isIdle) {
      isIdle = true;
      chrome.runtime.sendMessage({ action: 'userIdle' });
    }
  }, 10000);
  
  // Notify background of page load
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    data: {
      url: window.location.href,
      title: document.title
    }
  });
})();
