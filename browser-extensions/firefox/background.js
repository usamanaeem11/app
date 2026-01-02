// Working Tracker - Firefox Extension Background Service Worker

const API_URL = 'http://localhost:8001/api';

// Track active tab and time
let activeTabId = null;
let activeUrl = null;
let activeTitle = null;
let trackingStartTime = null;
let isTracking = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Working Tracker extension installed');
  chrome.storage.local.set({ isTracking: false, totalToday: 0 });
});

// Listen for tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (isTracking) {
    await logTimeSpent();
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    startNewSession(tab);
  }
});

// Listen for URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url && isTracking) {
    await logTimeSpent();
    startNewSession(tab);
  }
});

// Start a new tracking session
function startNewSession(tab) {
  activeTabId = tab.id;
  activeUrl = tab.url;
  activeTitle = tab.title;
  trackingStartTime = Date.now();
}

// Log time spent on previous page
async function logTimeSpent() {
  if (!trackingStartTime || !activeUrl) return;
  
  const duration = Math.floor((Date.now() - trackingStartTime) / 1000);
  if (duration < 5) return; // Ignore very short visits
  
  const token = await getToken();
  if (!token) return;
  
  try {
    // Extract domain from URL
    const url = new URL(activeUrl);
    const domain = url.hostname;
    
    // Categorize the URL
    const category = categorizeUrl(domain);
    
    // Log activity
    await fetch(`${API_URL}/activity-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        app_name: domain,
        url: activeUrl,
        window_title: activeTitle,
        activity_level: 100, // Full activity since user is browsing
        duration: duration,
        category: category
      })
    });
    
    // Update local total
    const data = await chrome.storage.local.get(['totalToday']);
    await chrome.storage.local.set({ totalToday: (data.totalToday || 0) + duration });
    
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Categorize URL by domain
function categorizeUrl(domain) {
  const productivePatterns = [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'stackoverflow.com', 'docs.google.com', 'notion.so',
    'figma.com', 'trello.com', 'asana.com', 'jira.atlassian.com',
    'slack.com', 'zoom.us', 'teams.microsoft.com'
  ];
  
  const distractingPatterns = [
    'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
    'youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com',
    'linkedin.com/feed'
  ];
  
  if (productivePatterns.some(p => domain.includes(p))) {
    return 'productive';
  }
  if (distractingPatterns.some(p => domain.includes(p))) {
    return 'distracting';
  }
  return 'neutral';
}

// Get stored auth token
async function getToken() {
  const data = await chrome.storage.local.get(['token']);
  return data.token;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startTracking') {
    isTracking = true;
    chrome.storage.local.set({ isTracking: true });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) startNewSession(tabs[0]);
    });
    sendResponse({ success: true });
  }
  
  if (request.action === 'stopTracking') {
    logTimeSpent().then(() => {
      isTracking = false;
      activeUrl = null;
      activeTitle = null;
      trackingStartTime = null;
      chrome.storage.local.set({ isTracking: false });
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getStatus') {
    chrome.storage.local.get(['isTracking', 'totalToday'], (data) => {
      sendResponse({
        isTracking: data.isTracking || false,
        totalToday: data.totalToday || 0
      });
    });
    return true;
  }
  
  if (request.action === 'login') {
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.credentials)
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        chrome.storage.local.set({ token: data.token, user: data.user });
        sendResponse({ success: true, user: data.user });
      } else {
        sendResponse({ success: false, error: data.detail || 'Login failed' });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  
  if (request.action === 'logout') {
    chrome.storage.local.remove(['token', 'user', 'isTracking', 'totalToday']);
    isTracking = false;
    sendResponse({ success: true });
  }
});

// Reset daily total at midnight
chrome.alarms.create('resetDaily', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDaily') {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() < 60) {
      chrome.storage.local.set({ totalToday: 0 });
    }
  }
});
