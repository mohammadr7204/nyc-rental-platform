import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
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

// Auth Service
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: string;
    phone?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
};

// User Service
export const userService = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.put('/users/change-password', data);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/users/dashboard-stats');
    return response.data;
  },
};

// Property Service
export const propertyService = {
  getProperties: async (params?: {
    page?: number;
    limit?: number;
    borough?: string;
    minRent?: number;
    maxRent?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/properties', { params });
    return response.data;
  },

  getProperty: async (id: string) => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  createProperty: async (data: any) => {
    const response = await api.post('/properties', data);
    return response.data;
  },

  updateProperty: async (id: string, data: any) => {
    const response = await api.put(`/properties/${id}`, data);
    return response.data;
  },

  deleteProperty: async (id: string) => {
    const response = await api.delete(`/properties/${id}`);
    return response.data;
  },

  getMyProperties: async () => {
    const response = await api.get('/properties/owner/my-properties');
    return response.data;
  },

  saveProperty: async (id: string) => {
    const response = await api.post(`/properties/${id}/save`);
    return response.data;
  },

  getSavedProperties: async () => {
    const response = await api.get('/properties/saved/my-saved');
    return response.data;
  },
};

// Application Service
export const applicationService = {
  submitApplication: async (data: {
    propertyId: string;
    moveInDate: string;
    employmentInfo: any;
    references: any;
    monthlyIncome: number;
    notes?: string;
  }) => {
    const response = await api.post('/applications', data);
    return response.data;
  },

  getMyApplications: async () => {
    const response = await api.get('/applications/my-applications');
    return response.data;
  },

  getPropertyApplications: async (propertyId?: string, status?: string) => {
    const params: any = {};
    if (propertyId) params.propertyId = propertyId;
    if (status) params.status = status;
    const response = await api.get('/applications/property-applications', { params });
    return response.data;
  },

  getApplication: async (id: string) => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  updateApplicationStatus: async (id: string, status: string, notes?: string) => {
    const response = await api.put(`/applications/${id}/status`, { status, notes });
    return response.data;
  },

  withdrawApplication: async (id: string) => {
    const response = await api.put(`/applications/${id}/withdraw`);
    return response.data;
  },
};

// Message Service
export const messageService = {
  sendMessage: async (data: {
    receiverId: string;
    content: string;
    propertyId?: string;
    messageType?: string;
    attachments?: string[];
  }) => {
    const response = await api.post('/messages', data);
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },

  getConversationMessages: async (partnerId: string, page = 1, limit = 50) => {
    const response = await api.get(`/messages/conversation/${partnerId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  markAsRead: async (partnerId: string) => {
    const response = await api.put(`/messages/mark-read/${partnerId}`);
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/messages/unread-count');
    return response.data;
  },
};

// Payment Service
export const paymentService = {
  createPaymentIntent: async (data: {
    amount: number;
    applicationId?: string;
    type: string;
    description?: string;
  }) => {
    const response = await api.post('/payments/create-payment-intent', data);
    return response.data;
  },

  confirmPayment: async (paymentId: string) => {
    const response = await api.post('/payments/confirm-payment', { paymentId });
    return response.data;
  },

  getPaymentHistory: async (page = 1, limit = 20) => {
    const response = await api.get('/payments/history', {
      params: { page, limit }
    });
    return response.data;
  },

  getEarnings: async (page = 1, limit = 20) => {
    const response = await api.get('/payments/earnings', {
      params: { page, limit }
    });
    return response.data;
  },
};

// Upload Service
export const uploadService = {
  uploadSingle: async (file: File, folder = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    const response = await api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadMultiple: async (files: File[], folder = 'general') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folder', folder);
    
    const response = await api.post('/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getPresignedUrl: async (fileName: string, fileType: string, folder = 'general') => {
    const response = await api.post('/upload/presigned-url', {
      fileName,
      fileType,
      folder
    });
    return response.data;
  },

  deleteFile: async (fileName: string) => {
    const response = await api.delete(`/upload/${fileName}`);
    return response.data;
  },
};

// Search Service
export const searchService = {
  searchProperties: async (params: {
    q?: string;
    borough?: string | string[];
    minRent?: number;
    maxRent?: number;
    bedrooms?: number | number[];
    bathrooms?: number;
    propertyType?: string | string[];
    amenities?: string | string[];
    isRentStabilized?: boolean;
    isBrokerFee?: boolean;
    availableFrom?: string;
    minSquareFeet?: number;
    maxSquareFeet?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/search/properties', { params });
    return response.data;
  },

  getSuggestions: async (query: string, type = 'all') => {
    const response = await api.get('/search/suggestions', {
      params: { q: query, type }
    });
    return response.data;
  },

  getFilters: async () => {
    const response = await api.get('/search/filters');
    return response.data;
  },
};

export default api;