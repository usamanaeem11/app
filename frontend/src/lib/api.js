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
      // Only redirect if not on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
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

export default api;
