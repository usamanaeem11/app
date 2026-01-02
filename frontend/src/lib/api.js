import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not on public pages
      const publicPaths = ['/login', '/signup', '/pricing', '/checkout'];
      const isPublicPath = publicPaths.some(path => window.location.pathname.includes(path));
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  processSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Company APIs
export const companyAPI = {
  get: () => api.get('/company'),
  update: (data) => api.put('/company', data),
  invite: (data) => api.post('/company/invite', data),
};

// Team APIs
export const teamAPI = {
  getAll: () => api.get('/team'),
  getMember: (userId) => api.get(`/team/${userId}`),
  updateMember: (userId, data) => api.put(`/team/${userId}`, data),
};

// Time Entry APIs
export const timeEntryAPI = {
  create: (data) => api.post('/time-entries', data),
  getAll: (params) => api.get('/time-entries', { params }),
  getActive: () => api.get('/time-entries/active'),
  update: (entryId, data) => api.put(`/time-entries/${entryId}`, data),
  delete: (entryId) => api.delete(`/time-entries/${entryId}`),
};

// Screenshot APIs
export const screenshotAPI = {
  create: (data) => api.post('/screenshots', data),
  getAll: (params) => api.get('/screenshots', { params }),
};

// Activity Log APIs
export const activityAPI = {
  create: (data) => api.post('/activity-logs', data),
  getAll: (params) => api.get('/activity-logs', { params }),
};

// Timesheet APIs
export const timesheetAPI = {
  getAll: (params) => api.get('/timesheets', { params }),
  generate: () => api.post('/timesheets/generate'),
  approve: (timesheetId) => api.put(`/timesheets/${timesheetId}/approve`),
  reject: (timesheetId, reason) => api.put(`/timesheets/${timesheetId}/reject`, { reason }),
};

// Leave APIs
export const leaveAPI = {
  create: (data) => api.post('/leaves', data),
  getAll: (params) => api.get('/leaves', { params }),
  approve: (leaveId) => api.put(`/leaves/${leaveId}/approve`),
  reject: (leaveId) => api.put(`/leaves/${leaveId}/reject`),
};

// Payroll APIs
export const payrollAPI = {
  getAll: (params) => api.get('/payroll', { params }),
  generate: (periodStart, periodEnd) => api.post(`/payroll/generate?period_start=${periodStart}&period_end=${periodEnd}`),
  process: (payrollId) => api.put(`/payroll/${payrollId}/process`),
};

// Time Card APIs
export const timeCardAPI = {
  getEmployeeTimeCard: (userId, params) => api.get(`/time-cards/employee/${userId}`, { params }),
  getSummary: (params) => api.get('/time-cards/summary', { params }),
  updateEntry: (entryId, data) => api.put(`/time-cards/entry/${entryId}`, data),
  approveEntry: (entryId, data) => api.post(`/time-cards/entry/${entryId}/approve`, data),
  bulkApprove: (data) => api.post('/time-cards/approve-bulk', data),
};

// Payroll Calculator APIs
export const payrollCalculatorAPI = {
  calculate: (data) => api.post('/payroll-calculator/calculate', data),
  calculateBulk: (data) => api.post('/payroll-calculator/calculate-bulk', data),
  previewAndCreate: (data) => api.post('/payroll-calculator/preview-and-create', data),
  getDeductionTemplates: () => api.get('/payroll-calculator/deduction-templates'),
};

// GPS & Location APIs
export const gpsAPI = {
  trackLocation: (data) => api.post('/gps/locations', data),
  getLocations: (params) => api.get('/gps/locations', { params }),
  createGeofence: (data) => api.post('/gps/geofences', data),
  getGeofences: () => api.get('/gps/geofences'),
  updateGeofence: (id, data) => api.put(`/gps/geofences/${id}`, data),
  deleteGeofence: (id) => api.delete(`/gps/geofences/${id}`),
  createFieldSite: (data) => api.post('/gps/field-sites', data),
  getFieldSites: () => api.get('/gps/field-sites'),
  startRoute: (data) => api.post('/gps/routes/start', data),
  endRoute: (id, data) => api.post(`/gps/routes/${id}/end`, data),
  getRoutes: (params) => api.get('/gps/routes', { params }),
};

// Productivity Monitoring APIs
export const productivityAPI = {
  trackAppUsage: (data) => api.post('/productivity/app-usage', data),
  trackWebsiteUsage: (data) => api.post('/productivity/website-usage', data),
  getAppUsageSummary: (params) => api.get('/productivity/app-usage/summary', { params }),
  getWebsiteUsageSummary: (params) => api.get('/productivity/website-usage/summary', { params }),
  createAppCategory: (data) => api.post('/productivity/app-categories', data),
  getAppCategories: () => api.get('/productivity/app-categories'),
  createWebsiteCategory: (data) => api.post('/productivity/website-categories', data),
  getWebsiteCategories: () => api.get('/productivity/website-categories'),
  blockApp: (data) => api.post('/productivity/blocked-apps', data),
  getBlockedApps: () => api.get('/productivity/blocked-apps'),
  blockWebsite: (data) => api.post('/productivity/blocked-websites', data),
  getBlockedWebsites: () => api.get('/productivity/blocked-websites'),
  getProductivityScore: (params) => api.get('/productivity/productivity-score', { params }),
};

// Idle & Break Tracking APIs
export const trackingAPI = {
  startIdle: (data) => api.post('/tracking/idle/start', data),
  endIdle: (id, data) => api.post(`/tracking/idle/${id}/end`, data),
  getIdlePeriods: (params) => api.get('/tracking/idle', { params }),
  startBreak: (data) => api.post('/tracking/breaks/start', data),
  endBreak: (id, data) => api.post(`/tracking/breaks/${id}/end`, data),
  getBreaks: (params) => api.get('/tracking/breaks', { params }),
  getBreakSummary: (params) => api.get('/tracking/breaks/summary', { params }),
};

// Integration APIs
export const integrationAPI = {
  create: (data) => api.post('/integrations', data),
  getAll: () => api.get('/integrations'),
  get: (id) => api.get(`/integrations/${id}`),
  update: (id, data) => api.put(`/integrations/${id}`, data),
  delete: (id) => api.delete(`/integrations/${id}`),
  sync: (id, data) => api.post(`/integrations/${id}/sync`, data),
  getLogs: (id, params) => api.get(`/integrations/${id}/logs`, { params }),
  getAvailableTypes: () => api.get('/integrations/types/available'),
};

// Security & Compliance APIs
export const securityAPI = {
  createAuditLog: (data) => api.post('/security/audit-logs', data),
  getAuditLogs: (params) => api.get('/security/audit-logs', { params }),
  logUSBEvent: (data) => api.post('/security/usb-events', data),
  getUSBEvents: (params) => api.get('/security/usb-events', { params }),
  createDLPIncident: (data) => api.post('/security/dlp-incidents', data),
  getDLPIncidents: (params) => api.get('/security/dlp-incidents', { params }),
  createAlert: (data) => api.post('/security/alerts', data),
  getAlerts: (params) => api.get('/security/alerts', { params }),
  resolveAlert: (id, data) => api.put(`/security/alerts/${id}/resolve`, data),
  getDashboard: () => api.get('/security/dashboard'),
};

// Analytics APIs
export const analyticsAPI = {
  getProductivityDashboard: (params) => api.get('/analytics/productivity-dashboard', { params }),
  trackFocusTime: (data) => api.post('/analytics/focus-time', data),
  getFocusTime: (params) => api.get('/analytics/focus-time', { params }),
  createMeeting: (data) => api.post('/analytics/meetings', data),
  getMeetings: (params) => api.get('/analytics/meetings', { params }),
  getMeetingSummary: (params) => api.get('/analytics/meetings/summary', { params }),
  getBurnoutRisk: (params) => api.get('/analytics/burnout-risk', { params }),
  getTeamProductivity: (params) => api.get('/analytics/team-productivity', { params }),
  getTrends: (params) => api.get('/analytics/trends', { params }),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getTeamStatus: () => api.get('/dashboard/team-status'),
  getActivityChart: (days) => api.get('/dashboard/activity-chart', { params: { days } }),
};

// Project APIs
export const projectAPI = {
  create: (data) => api.post('/projects', data),
  getAll: (params) => api.get('/projects', { params }),
  get: (projectId) => api.get(`/projects/${projectId}`),
  update: (projectId, data) => api.put(`/projects/${projectId}`, data),
  delete: (projectId) => api.delete(`/projects/${projectId}`),
};

// Task APIs
export const taskAPI = {
  create: (data) => api.post('/tasks', data),
  getAll: (params) => api.get('/tasks', { params }),
  get: (taskId) => api.get(`/tasks/${taskId}`),
  update: (taskId, data) => api.put(`/tasks/${taskId}`, data),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
};

// Shift APIs
export const shiftAPI = {
  create: (data) => api.post('/shifts', data),
  getAll: () => api.get('/shifts'),
  update: (shiftId, data) => api.put(`/shifts/${shiftId}`, data),
  delete: (shiftId) => api.delete(`/shifts/${shiftId}`),
  createAssignment: (data) => api.post('/shift-assignments', data),
  getAssignments: (params) => api.get('/shift-assignments', { params }),
};

// Attendance APIs
export const attendanceAPI = {
  clockIn: () => api.post('/attendance/clock-in'),
  clockOut: () => api.post('/attendance/clock-out'),
  getAll: (params) => api.get('/attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  getReport: (startDate, endDate) => api.get('/attendance/report', { params: { start_date: startDate, end_date: endDate } }),
};

// Invoice APIs
export const invoiceAPI = {
  create: (data) => api.post('/invoices', data),
  getAll: (params) => api.get('/invoices', { params }),
  get: (invoiceId) => api.get(`/invoices/${invoiceId}`),
  update: (invoiceId, data) => api.put(`/invoices/${invoiceId}`, data),
  delete: (invoiceId) => api.delete(`/invoices/${invoiceId}`),
  generateFromProject: (invoiceId, projectId, startDate, endDate) => 
    api.post(`/invoices/${invoiceId}/generate-from-project?project_id=${projectId}&start_date=${startDate}&end_date=${endDate}`),
};

// Subscription APIs
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  get: () => api.get('/subscription'),
  create: (data) => api.post('/subscription', data),
  update: (data) => api.put('/subscription', data),
  getHistory: () => api.get('/subscription/history'),
  activate: (sessionId) => api.post(`/subscription/activate?session_id=${sessionId}`),
};

// Payment APIs
export const paymentAPI = {
  createCheckoutSession: (data) => api.post('/payments/checkout/session', data),
  getCheckoutStatus: (sessionId) => api.post('/payments/checkout/status', { session_id: sessionId }),
};

// User Management APIs
export const userManagementAPI = {
  updateRole: (userId, role) => api.put(`/users/${userId}/role?role=${role}`),
  getManagers: () => api.get('/managers'),
  assignUsersToManager: (managerId, userIds) => api.post(`/managers/${managerId}/assign-users`, { manager_id: managerId, user_ids: userIds }),
  getManagerUsers: (managerId) => api.get(`/managers/${managerId}/users`),
  getMyUsers: () => api.get('/team/my-users'),
  getDisapprovalLogs: (params) => api.get('/disapproval-logs', { params }),
  createDisapproval: (data) => api.post('/disapprove', data),
};

// AI Insights APIs
export const aiInsightsAPI = {
  analyzeProductivity: (data) => api.post('/ai/analyze-productivity', data),
  getProductivityTrends: (params) => api.get('/ai/productivity-trends', { params }),
  getAppUsageBreakdown: (params) => api.get('/ai/app-usage-breakdown', { params }),
};

// PDF Generation APIs
export const pdfAPI = {
  generateInvoice: (data) => api.post('/pdf/invoice', data),
  downloadInvoice: (data) => api.post('/pdf/invoice/download', data, { responseType: 'blob' }),
  generateTimesheet: (data) => api.post('/pdf/timesheet', data),
  downloadTimesheet: (data) => api.post('/pdf/timesheet/download', data, { responseType: 'blob' }),
};

// Email APIs
export const emailAPI = {
  send: (data) => api.post('/email/send', data),
  sendCustom: (data) => api.post('/email/send-custom', data),
  getStatus: () => api.get('/email/status'),
  getTemplates: () => api.get('/email/templates'),
};

// Storage APIs
export const storageAPI = {
  uploadScreenshot: (data) => api.post('/storage/upload-screenshot', data),
  getPresignedUrl: (fileKey) => api.post('/storage/presigned-url', { file_key: fileKey }),
  deleteScreenshot: (screenshotId) => api.delete(`/storage/screenshot/${screenshotId}`),
  getStatus: () => api.get('/storage/storage-status'),
};

// Calendar APIs
export const calendarAPI = {
  connect: () => api.get('/calendar/connect'),
  getEvents: (params) => api.get('/calendar/events', { params }),
  createEvent: (userId, data) => api.post(`/calendar/events?user_id=${userId}`, data),
  syncTimeEntry: (userId, data) => api.post(`/calendar/sync-time-entry?user_id=${userId}`, data),
  disconnect: (userId) => api.delete(`/calendar/disconnect?user_id=${userId}`),
  getStatus: (userId) => api.get(`/calendar/status?user_id=${userId}`),
};

// SSO APIs
export const ssoAPI = {
  getConfig: () => api.get('/sso/config'),
  configure: (data) => api.post('/sso/configure', data),
  login: (relayState) => api.get('/sso/login', { params: { relay_state: relayState } }),
  getStatus: () => api.get('/sso/status'),
};

export default api;
