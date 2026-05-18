import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
};

// Food API
export const foodAPI = {
  create: (donationData) => api.post('/food/create', donationData),
  getPending: () => api.get('/food/pending'),
  getDonorDonations: (donorId) =>
    api.get(donorId ? `/food/donor/${donorId}` : '/food/donor'),
  accept: (id) => api.put(`/food/accept/${id}`),
  reject: (id, reason) => api.put(`/food/reject/${id}`, { rejectedReason: reason }),
  updateStatus: (id, status) => api.put(`/food/status/${id}`, { status }),
};

// NGO API
export const ngoAPI = {
  getRequests: () => api.get('/ngo/requests'),
  assignVolunteer: (donationId, volunteerId, deliveryAddress) =>
    api.post(`/ngo/assign/${donationId}`, { volunteerId, deliveryAddress }),
  getVolunteers: () => api.get('/ngo/volunteers'),
};

// Volunteer API
export const volunteerAPI = {
  getTasks: () => api.get('/volunteer/tasks'),
  updateTaskStatus: (taskId, status, currentLocation, otp) =>
    api.put(`/volunteer/task/${taskId}`, { status, currentLocation, otp }),
  getHistory: () => api.get('/volunteer/history'),
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDonations: (params) => api.get('/admin/donations', { params }),
  getAnalytics: () => api.get('/admin/analytics'),
};

// Routing API (OSRM)
export const routingAPI = {
  getRoute: (donationId) => api.get(`/food/route/${donationId}`),
};

// Geocoding API (server-side Nominatim + Photon)
export const geocodeAPI = {
  search: (address) => api.get('/geocode', { params: { address } }),
};

export default api;

