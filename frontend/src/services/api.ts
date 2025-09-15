import axios from 'axios';
import { Scan, Issue, Stats, AuthResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password });
    return response.data;
  },
};

export const scansApi = {
  getAll: async (): Promise<Scan[]> => {
    const response = await api.get('/scans');
    return response.data;
  },
};

export const issuesApi = {
  getAll: async (params?: { severity?: string; scan_id?: string }): Promise<Issue[]> => {
    const response = await api.get('/issues', { params });
    return response.data;
  },
};

export const statsApi = {
  get: async (): Promise<Stats> => {
    const response = await api.get('/stats');
    return response.data;
  },
};

export const exportApi = {
  exportData: async (format: 'csv' | 'json'): Promise<Blob> => {
    const response = await api.get(`/export/${format}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export const scanApi = {
  startScan: async (config: any): Promise<any> => {
    // Transform frontend payload to backend format - only send required fields
    const payload = {
      target_url: config.targetUrl,
      scan_name: config.scanName || 'Security Scan'
    };
    console.log('Original config:', config);
    console.log('Transformed payload:', payload);
    const response = await api.post('/scans/start', payload);
    return response.data;
  },
  getActiveScans: async (): Promise<any[]> => {
    const response = await api.get('/scans/active');
    return response.data;
  },
  getCompletedScans: async (): Promise<any[]> => {
    const response = await api.get('/scans/completed');
    return response.data;
  },
  pauseScan: async (scanId: string): Promise<any> => {
    const response = await api.post(`/scans/${scanId}/pause`);
    return response.data;
  },
  resumeScan: async (scanId: string): Promise<any> => {
    const response = await api.post(`/scans/${scanId}/resume`);
    return response.data;
  },
  stopScan: async (scanId: string): Promise<any> => {
    const response = await api.post(`/scans/${scanId}/stop`);
    return response.data;
  },
};
