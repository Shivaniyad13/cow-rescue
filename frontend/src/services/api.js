import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Auto attach admin token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== PUBLIC APIs ====================

export const reportCow = async (data) => {
  const response = await api.post('/cases/report', data);
  return response.data;
};

export const trackCase = async (caseId) => {
  const response = await api.get(`/cases/track/${caseId}`);
  return response.data;
};

export const getCaseTimeline = async (caseId) => {
  const response = await api.get(`/cases/track/${caseId}/timeline`);
  return response.data;
};

// ==================== ALERT APIs ====================

export const getAlertDetails = async (token) => {
  const response = await api.get(`/alerts/${token}`);
  return response.data;
};

export const acceptAlert = async (token, note) => {
  const response = await api.post(`/alerts/${token}/accept`, { note });
  return response.data;
};

export const rejectAlert = async (token, note) => {
  const response = await api.post(`/alerts/${token}/reject`, { note });
  return response.data;
};

// ==================== ADMIN APIs ====================

export const adminLogin = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const adminGetStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export default api;