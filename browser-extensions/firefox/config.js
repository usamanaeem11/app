// Browser Extension Configuration
// Update API_URL before building for production

const CONFIG = {
  // API URL for the backend server
  // Development: http://localhost:8001/api
  // Production: https://api.yourdomain.com/api
  API_URL: 'http://localhost:8001/api',

  // Activity logging interval in seconds
  LOG_INTERVAL: 60,

  // Idle timeout in seconds
  IDLE_TIMEOUT: 300
};

// For Firefox extensions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
