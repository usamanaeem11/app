// Browser Extension Configuration
// Copy this file to config.js and update the API URL

const CONFIG = {
  // API URL for the backend server
  API_URL: 'http://localhost:8001/api',

  // Activity logging interval in seconds
  LOG_INTERVAL: 60,

  // Idle timeout in seconds
  IDLE_TIMEOUT: 300
};

// For Chrome/Edge extensions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
