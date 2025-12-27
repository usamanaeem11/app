const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  login: (credentials) => ipcRenderer.invoke('login', credentials),
  logout: () => ipcRenderer.invoke('logout'),
  
  // Tracking
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Event listeners
  onTrackingStarted: (callback) => ipcRenderer.on('tracking-started', (event, data) => callback(data)),
  onTrackingStopped: (callback) => ipcRenderer.on('tracking-stopped', () => callback()),
  onScreenshotCaptured: (callback) => ipcRenderer.on('screenshot-captured', () => callback()),
  onIdleDetected: (callback) => ipcRenderer.on('idle-detected', (event, seconds) => callback(seconds)),
  onError: (callback) => ipcRenderer.on('error', (event, message) => callback(message)),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', () => callback()),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
