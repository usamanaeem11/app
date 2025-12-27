const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const schedule = require('node-schedule');
const screenshot = require('screenshot-desktop');
const activeWin = require('active-win');

// Initialize store for settings
const store = new Store({
  defaults: {
    apiUrl: process.env.WORKMONITOR_API_URL || 'http://localhost:8001/api',
    token: null,
    userId: null,
    companyId: null,
    screenshotInterval: 300, // 5 minutes in seconds
    idleTimeout: 300, // 5 minutes in seconds
    autoStart: true,
    blurScreenshots: false,
    trackingEnabled: false,
    lastActivity: Date.now()
  }
});

let mainWindow = null;
let tray = null;
let isTracking = false;
let currentTimeEntry = null;
let screenshotJob = null;
let activityJob = null;
let idleCheckJob = null;
let lastMousePosition = { x: 0, y: 0 };
let lastKeyTime = Date.now();
let idleSeconds = 0;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Create system tray
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  
  updateTrayMenu();
  
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// Update tray menu based on tracking state
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'WorkMonitor Tracker',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isTracking ? '⏹ Stop Tracking' : '▶ Start Tracking',
      click: () => toggleTracking()
    },
    {
      label: 'Take Screenshot Now',
      click: () => captureScreenshot(),
      enabled: isTracking
    },
    { type: 'separator' },
    {
      label: 'Open Window',
      click: () => mainWindow.show()
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip(isTracking ? 'WorkMonitor - Tracking' : 'WorkMonitor - Not Tracking');
}

// API helper
async function apiRequest(method, endpoint, data = null) {
  const token = store.get('token');
  const apiUrl = store.get('apiUrl');
  
  try {
    const response = await axios({
      method,
      url: `${apiUrl}${endpoint}`,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Start time tracking
async function startTracking() {
  if (isTracking) return;
  
  const token = store.get('token');
  if (!token) {
    mainWindow.webContents.send('error', 'Please login first');
    return;
  }
  
  try {
    // Create time entry
    const entry = await apiRequest('POST', '/time-entries', {
      start_time: new Date().toISOString(),
      source: 'desktop'
    });
    
    currentTimeEntry = entry.entry_id;
    isTracking = true;
    store.set('trackingEnabled', true);
    
    // Start screenshot capture
    startScreenshotCapture();
    
    // Start activity monitoring
    startActivityMonitoring();
    
    // Start idle detection
    startIdleDetection();
    
    updateTrayMenu();
    mainWindow.webContents.send('tracking-started', entry);
    
    console.log('Tracking started:', currentTimeEntry);
  } catch (error) {
    mainWindow.webContents.send('error', 'Failed to start tracking');
  }
}

// Stop time tracking
async function stopTracking() {
  if (!isTracking) return;
  
  try {
    if (currentTimeEntry) {
      await apiRequest('PUT', `/time-entries/${currentTimeEntry}`, {
        end_time: new Date().toISOString(),
        idle_time: idleSeconds
      });
    }
    
    isTracking = false;
    store.set('trackingEnabled', false);
    currentTimeEntry = null;
    idleSeconds = 0;
    
    // Stop all jobs
    if (screenshotJob) screenshotJob.cancel();
    if (activityJob) activityJob.cancel();
    if (idleCheckJob) idleCheckJob.cancel();
    
    updateTrayMenu();
    mainWindow.webContents.send('tracking-stopped');
    
    console.log('Tracking stopped');
  } catch (error) {
    mainWindow.webContents.send('error', 'Failed to stop tracking');
  }
}

// Toggle tracking
function toggleTracking() {
  if (isTracking) {
    stopTracking();
  } else {
    startTracking();
  }
}

// Capture screenshot
async function captureScreenshot() {
  if (!isTracking || !currentTimeEntry) return;
  
  try {
    // Capture screenshot
    const imgBuffer = await screenshot({ format: 'png' });
    
    // Convert to base64
    const base64Image = imgBuffer.toString('base64');
    
    // Get active window info
    let activeWindow = null;
    try {
      activeWindow = await activeWin();
    } catch (e) {
      console.log('Could not get active window');
    }
    
    // Upload to server
    const screenshotData = {
      time_entry_id: currentTimeEntry,
      image_data: base64Image,
      taken_at: new Date().toISOString(),
      app_name: activeWindow?.owner?.name || 'Unknown',
      window_title: activeWindow?.title || 'Unknown',
      blurred: store.get('blurScreenshots')
    };
    
    await apiRequest('POST', '/screenshots/upload', screenshotData);
    
    console.log('Screenshot captured and uploaded');
    mainWindow.webContents.send('screenshot-captured');
  } catch (error) {
    console.error('Screenshot error:', error);
  }
}

// Start screenshot capture job
function startScreenshotCapture() {
  const interval = store.get('screenshotInterval');
  
  // Schedule screenshot capture
  screenshotJob = schedule.scheduleJob(`*/${Math.ceil(interval / 60)} * * * *`, () => {
    captureScreenshot();
  });
  
  // Take first screenshot after 30 seconds
  setTimeout(() => captureScreenshot(), 30000);
}

// Monitor activity (app usage)
async function recordActivity() {
  if (!isTracking) return;
  
  try {
    const activeWindow = await activeWin();
    
    if (activeWindow) {
      const activityData = {
        app_name: activeWindow.owner?.name || 'Unknown',
        window_title: activeWindow.title || 'Unknown',
        url: activeWindow.url || null,
        activity_level: calculateActivityLevel()
      };
      
      await apiRequest('POST', '/activity-logs', activityData);
    }
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

// Start activity monitoring
function startActivityMonitoring() {
  // Record activity every minute
  activityJob = schedule.scheduleJob('* * * * *', () => {
    recordActivity();
  });
}

// Calculate activity level (0-100)
function calculateActivityLevel() {
  const timeSinceActivity = Date.now() - store.get('lastActivity');
  const idleTimeout = store.get('idleTimeout') * 1000;
  
  if (timeSinceActivity < 10000) return 100; // Very active
  if (timeSinceActivity < 30000) return 80;  // Active
  if (timeSinceActivity < 60000) return 60;  // Moderate
  if (timeSinceActivity < idleTimeout) return 40; // Low
  return 0; // Idle
}

// Check for idle
function checkIdle() {
  const currentPos = screen.getCursorScreenPoint();
  const now = Date.now();
  const idleTimeout = store.get('idleTimeout') * 1000;
  
  // Check if mouse moved
  if (currentPos.x !== lastMousePosition.x || currentPos.y !== lastMousePosition.y) {
    lastMousePosition = currentPos;
    store.set('lastActivity', now);
    return;
  }
  
  // Check idle time
  const lastActivity = store.get('lastActivity');
  const idleTime = now - lastActivity;
  
  if (idleTime > idleTimeout) {
    idleSeconds += Math.floor(idleTime / 1000);
    mainWindow.webContents.send('idle-detected', idleSeconds);
  }
}

// Start idle detection
function startIdleDetection() {
  // Check idle every 10 seconds
  idleCheckJob = schedule.scheduleJob('*/10 * * * * *', () => {
    checkIdle();
  });
}

// IPC handlers
ipcMain.handle('login', async (event, credentials) => {
  try {
    const apiUrl = store.get('apiUrl');
    const response = await axios.post(`${apiUrl}/auth/login`, credentials);
    
    store.set('token', response.data.token);
    store.set('userId', response.data.user.user_id);
    store.set('companyId', response.data.user.company_id);
    
    return { success: true, user: response.data.user };
  } catch (error) {
    return { success: false, error: error.response?.data?.detail || 'Login failed' };
  }
});

ipcMain.handle('logout', async () => {
  await stopTracking();
  store.set('token', null);
  store.set('userId', null);
  store.set('companyId', null);
  return { success: true };
});

ipcMain.handle('start-tracking', async () => {
  await startTracking();
  return { success: isTracking };
});

ipcMain.handle('stop-tracking', async () => {
  await stopTracking();
  return { success: !isTracking };
});

ipcMain.handle('get-status', () => {
  return {
    isTracking,
    currentTimeEntry,
    idleSeconds,
    user: store.get('userId') ? {
      userId: store.get('userId'),
      companyId: store.get('companyId')
    } : null
  };
});

ipcMain.handle('get-settings', () => {
  return {
    apiUrl: store.get('apiUrl'),
    screenshotInterval: store.get('screenshotInterval'),
    idleTimeout: store.get('idleTimeout'),
    autoStart: store.get('autoStart'),
    blurScreenshots: store.get('blurScreenshots')
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  Object.keys(settings).forEach(key => {
    store.set(key, settings[key]);
  });
  return { success: true };
});

ipcMain.handle('take-screenshot', async () => {
  await captureScreenshot();
  return { success: true };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Auto-start tracking if enabled
  if (store.get('autoStart') && store.get('token')) {
    setTimeout(() => startTracking(), 5000);
  }
});

app.on('window-all-closed', () => {
  // Keep app running in tray on all platforms
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  await stopTracking();
});

// Auto-launch on startup (platform specific)
if (process.platform === 'darwin' || process.platform === 'win32') {
  app.setLoginItemSettings({
    openAtLogin: store.get('autoStart'),
    openAsHidden: true
  });
}
