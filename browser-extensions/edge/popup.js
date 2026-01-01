// Working Tracker - Chrome Extension Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Get elements
  const loginForm = document.getElementById('loginForm');
  const dashboard = document.getElementById('dashboard');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const loginError = document.getElementById('loginError');
  const timer = document.getElementById('timer');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const currentSite = document.getElementById('currentSite');
  const currentUrl = document.getElementById('currentUrl');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');
  
  // Check if logged in
  const data = await chrome.storage.local.get(['user', 'token']);
  
  if (data.user && data.token) {
    showDashboard(data.user);
    updateStatus();
  } else {
    showLogin();
  }
  
  // Login handler
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }
    
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    chrome.runtime.sendMessage({
      action: 'login',
      credentials: { email, password }
    }, (response) => {
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
      
      if (response.success) {
        showDashboard(response.user);
      } else {
        showError(response.error);
      }
    });
  });
  
  // Logout handler
  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      showLogin();
    });
  });
  
  // Start tracking
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startTracking' }, () => {
      updateStatus();
    });
  });
  
  // Stop tracking
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopTracking' }, () => {
      updateStatus();
    });
  });
  
  function showLogin() {
    loginForm.classList.add('active');
    dashboard.classList.remove('active');
  }
  
  function showDashboard(user) {
    loginForm.classList.remove('active');
    dashboard.classList.add('active');
    
    userName.textContent = user.name || 'User';
    userEmail.textContent = user.email || '';
    userAvatar.textContent = (user.name || 'U').charAt(0).toUpperCase();
  }
  
  function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
    setTimeout(() => loginError.classList.remove('show'), 3000);
  }
  
  function updateStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response.isTracking) {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        statusDot.classList.add('active');
        statusText.textContent = 'Tracking';
        
        // Get current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            currentSite.style.display = 'block';
            try {
              const url = new URL(tabs[0].url);
              currentUrl.textContent = url.hostname;
            } catch {
              currentUrl.textContent = tabs[0].url?.substring(0, 40) || 'Unknown';
            }
          }
        });
      } else {
        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';
        statusDot.classList.remove('active');
        statusText.textContent = 'Not tracking';
        currentSite.style.display = 'none';
      }
      
      // Update timer
      const seconds = response.totalToday || 0;
      timer.textContent = formatTime(seconds);
    });
  }
  
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  
  function pad(n) {
    return n.toString().padStart(2, '0');
  }
  
  // Update status every second
  setInterval(updateStatus, 1000);
});
