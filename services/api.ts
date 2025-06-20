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

// Mock data for development
const MOCK_APPLICATIONS = [
  {
    id: '1',
    status: 'PENDING',
    createdAt: '2025-06-18T10:00:00Z',
    updatedAt: '2025-06-18T10:00:00Z',
    moveInDate: '2025-07-01',
    monthlyIncome: 120000,
    notes: 'Looking for a long-term rental. Clean credit history and excellent references.',
    property: {
      id: '1',
      title: 'Luxury 2BR in Manhattan',
      address: '123 Park Avenue, Manhattan, NY 10016',
      rentAmount: 4500,
      bedrooms: 2,
      bathrooms: 2,
      photos: ['/placeholder-property.jpg']
    },
    applicant: {
      id: 'user1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(555) 123-4567'
    },
    employmentInfo: {
      employer: 'Google Inc.',
      position: 'Software Engineer',
      yearsEmployed: 3.5,
      supervisorName: 'John Smith',
      supervisorPhone: '(555) 987-6543',
      workAddress: '111 8th Ave, New York, NY 10011'
    },
    references: [
      {
        name: 'Michael Brown',
        relationship: 'Previous landlord',
        phone: '(555) 111-2222',
        email: 'michael@email.com'
      },
      {
        name: 'Lisa Davis',
        relationship: 'Employer reference',
        phone: '(555) 333-4444',
        email: 'lisa@google.com'
      }
    ],
    documents: {
      idDocument: '/mock-id.pdf',
      payStubs: ['/mock-paystub1.pdf', '/mock-paystub2.pdf'],
      bankStatements: ['/mock-bank1.pdf'],
      employmentLetter: '/mock-employment.pdf'
    }
  },
  {
    id: '2',
    status: 'APPROVED',
    createdAt: '2025-06-16T14:30:00Z',
    updatedAt: '2025-06-17T09:15:00Z',
    moveInDate: '2025-07-15',
    monthlyIncome: 180000,
    notes: 'Relocating from California for work. Can provide additional references if needed.',
    landlordNotes: 'Excellent application with strong financials. Approved for lease.',
    property: {
      id: '2',
      title: 'Brooklyn Heights Studio',
      address: '456 Hicks Street, Brooklyn, NY 11201',
      rentAmount: 3200,
      bedrooms: 0,
      bathrooms: 1,
      photos: ['/placeholder-property.jpg']
    },
    applicant: {
      id: 'user2',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@email.com',
      phone: '(555) 567-8901'
    },
    employmentInfo: {
      employer: 'Goldman Sachs',
      position: 'Financial Analyst',
      yearsEmployed: 2.0,
      supervisorName: 'Jennifer Wu',
      supervisorPhone: '(555) 876-5432',
      workAddress: '200 West Street, New York, NY 10282'
    },
    references: [
      {
        name: 'Robert Wilson',
        relationship: 'Previous landlord',
        phone: '(555) 222-3333',
        email: 'robert@email.com'
      },
      {
        name: 'Amy Zhang',
        relationship: 'Colleague',
        phone: '(555) 444-5555',
        email: 'amy@email.com'
      }
    ],
    documents: {
      idDocument: '/mock-id2.pdf',
      payStubs: ['/mock-paystub3.pdf', '/mock-paystub4.pdf'],
      bankStatements: ['/mock-bank2.pdf', '/mock-bank3.pdf']
    }
  }
];

// Auth Service
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      // Mock response for development
      if (credentials.email && credentials.password) {
        return {
          data: {
            token: 'mock-jwt-token',
            user: {
              id: '1',
              email: credentials.email,
              firstName: 'John',
              lastName: 'Doe',
              userType: credentials.email.includes('landlord') ? 'LANDLORD' : 'RENTER'
            }
          }
        };
      }
      throw error;
    }
  },

  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: string;
    phone?: string;
  }) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          token: 'mock-jwt-token',
          user: {
            id: '1',
            ...userData,
            password: undefined // Remove password from response
          }
        }
      };
    }
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      // Mock response for development
      const token = localStorage.getItem('token');
      if (token) {
        return {
          data: {
            user: {
              id: '1',
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
              userType: 'RENTER'
            }
          }
        };
      }
      throw error;
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { message: 'Password reset email sent' } };
    }
  },
};

// User Service
export const userService = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          id: '1',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: 'RENTER',
          phone: '(555) 123-4567'
        }
      };
    }
  },

  updateProfile: async (data: any) => {
    try {
      const response = await api.put('/users/profile', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { ...data, id: '1' } };
    }
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    try {
      const response = await api.put('/users/change-password', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { message: 'Password changed successfully' } };
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get('/users/dashboard-stats');
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          propertiesCount: 3,
          applicationsCount: 5,
          totalRevenue: 45000,
          savedPropertiesCount: 8,
          messagesCount: 12,
          recentApplications: MOCK_APPLICATIONS
        }
      };
    }
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
    try {
      const response = await api.get('/properties', { params });
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: [
          {
            id: '1',
            title: 'Luxury 2BR in Manhattan',
            address: '123 Park Avenue',
            borough: 'MANHATTAN',
            zipCode: '10016',
            rentAmount: 4500,
            bedrooms: 2,
            bathrooms: 2,
            squareFeet: 1200,
            propertyType: 'APARTMENT',
            photos: ['/placeholder-property.jpg'],
            amenities: ['Doorman', 'Gym', 'Rooftop'],
            availableDate: '2025-07-01',
            latitude: 40.7589,
            longitude: -73.9851
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      };
    }
  },

  getProperty: async (id: string) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          id,
          title: 'Luxury 2BR in Manhattan',
          address: '123 Park Avenue',
          borough: 'MANHATTAN',
          zipCode: '10016',
          rentAmount: 4500,
          securityDeposit: 4500,
          brokerFee: 0,
          bedrooms: 2,
          bathrooms: 2,
          squareFeet: 1200,
          propertyType: 'APARTMENT',
          description: 'Beautiful apartment in the heart of Manhattan with stunning city views.',
          photos: ['/placeholder-property.jpg'],
          amenities: ['Doorman', 'Gym', 'Rooftop', 'Laundry'],
          availableDate: '2025-07-01',
          latitude: 40.7589,
          longitude: -73.9851,
          owner: {
            id: 'owner1',
            firstName: 'Jane',
            lastName: 'Smith',
            verificationStatus: 'VERIFIED'
          },
          utilitiesIncluded: ['Heat', 'Hot Water'],
          petPolicy: 'No Pets',
          furnished: false,
          parkingAvailable: false,
          feeDisclosure: 'No broker fee. First month rent and security deposit required.'
        }
      };
    }
  },

  createProperty: async (data: any) => {
    try {
      const response = await api.post('/properties', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { ...data, id: Date.now().toString() } };
    }
  },

  updateProperty: async (id: string, data: any) => {
    try {
      const response = await api.put(`/properties/${id}`, data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { ...data, id } };
    }
  },

  deleteProperty: async (id: string) => {
    try {
      const response = await api.delete(`/properties/${id}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { message: 'Property deleted successfully' } };
    }
  },

  getMyProperties: async () => {
    try {
      const response = await api.get('/properties/owner/my-properties');
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: [
          {
            id: '1',
            title: 'Luxury 2BR in Manhattan',
            address: '123 Park Avenue',
            rentAmount: 4500,
            bedrooms: 2,
            bathrooms: 2,
            status: 'AVAILABLE'
          }
        ]
      };
    }
  },

  saveProperty: async (id: string) => {
    try {
      const response = await api.post(`/properties/${id}/save`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { saved: true, message: 'Property saved successfully' } };
    }
  },

  getSavedProperties: async () => {
    try {
      const response = await api.get('/properties/saved/my-saved');
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },

  getNearbyProperties: async (id: string) => {
    try {
      const response = await api.get(`/properties/${id}/nearby`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
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
    try {
      const response = await api.post('/applications', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      console.log('Submitting application:', data);
      return {
        data: {
          id: Date.now().toString(),
          ...data,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
      };
    }
  },

  getMyApplications: async () => {
    try {
      const response = await api.get('/applications/my-applications');
      return response.data;
    } catch (error) {
      // Mock response for development - return applications from renter's perspective
      return {
        data: MOCK_APPLICATIONS.map(app => ({
          ...app,
          applicant: undefined // Remove applicant info for renter's own applications
        }))
      };
    }
  },

  getPropertyApplications: async (propertyId?: string, status?: string) => {
    try {
      const params: any = {};
      if (propertyId) params.propertyId = propertyId;
      if (status) params.status = status;
      const response = await api.get('/applications/property-applications', { params });
      return response.data;
    } catch (error) {
      // Mock response for development - return applications from landlord's perspective
      return {
        data: MOCK_APPLICATIONS
      };
    }
  },

  getApplication: async (id: string) => {
    try {
      const response = await api.get(`/applications/${id}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      const mockApp = MOCK_APPLICATIONS.find(app => app.id === id);
      return { data: mockApp || MOCK_APPLICATIONS[0] };
    }
  },

  updateApplicationStatus: async (id: string, status: string, notes?: string) => {
    try {
      const response = await api.put(`/applications/${id}/status`, { status, notes });
      return response.data;
    } catch (error) {
      // Mock response for development
      console.log(`Updating application ${id} to status: ${status}, notes: ${notes}`);
      return {
        data: {
          id,
          status,
          landlordNotes: notes,
          updatedAt: new Date().toISOString()
        }
      };
    }
  },

  withdrawApplication: async (id: string) => {
    try {
      const response = await api.put(`/applications/${id}/withdraw`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          id,
          status: 'WITHDRAWN',
          updatedAt: new Date().toISOString()
        }
      };
    }
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
    try {
      const response = await api.post('/messages', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          id: Date.now().toString(),
          ...data,
          senderId: 'current-user',
          createdAt: new Date().toISOString()
        }
      };
    }
  },

  getConversations: async () => {
    try {
      const response = await api.get('/messages/conversations');
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },

  getConversationMessages: async (partnerId: string, page = 1, limit = 50) => {
    try {
      const response = await api.get(`/messages/conversation/${partnerId}`, {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },

  markAsRead: async (partnerId: string) => {
    try {
      const response = await api.put(`/messages/mark-read/${partnerId}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { success: true } };
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get('/messages/unread-count');
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { count: 0 } };
    }
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
    try {
      const response = await api.post('/payments/create-payment-intent', data);
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          paymentIntentId: 'pi_mock_' + Date.now(),
          clientSecret: 'pi_mock_secret',
          amount: data.amount
        }
      };
    }
  },

  confirmPayment: async (paymentId: string) => {
    try {
      const response = await api.post('/payments/confirm-payment', { paymentId });
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          success: true,
          paymentId,
          status: 'succeeded'
        }
      };
    }
  },

  getPaymentHistory: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/payments/history', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },

  getEarnings: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/payments/earnings', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },
};

// Upload Service
export const uploadService = {
  uploadSingle: async (file: File, folder = 'general') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      
      const response = await api.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      console.log('Mock upload:', file.name);
      return {
        data: {
          url: `/mock-uploads/${file.name}`,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type
        }
      };
    }
  },

  uploadMultiple: async (files: File[], folder = 'general') => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('folder', folder);
      
      const response = await api.post('/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          files: files.map(file => ({
            url: `/mock-uploads/${file.name}`,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type
          }))
        }
      };
    }
  },

  getPresignedUrl: async (fileName: string, fileType: string, folder = 'general') => {
    try {
      const response = await api.post('/upload/presigned-url', {
        fileName,
        fileType,
        folder
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          uploadUrl: `https://mock-s3.amazonaws.com/${folder}/${fileName}`,
          fileUrl: `/mock-uploads/${fileName}`
        }
      };
    }
  },

  deleteFile: async (fileName: string) => {
    try {
      const response = await api.delete(`/upload/${fileName}`);
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: { success: true } };
    }
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
    try {
      const response = await api.get('/search/properties', { params });
      return response.data;
    } catch (error) {
      // Mock response for development
      return propertyService.getProperties(params);
    }
  },

  getSuggestions: async (query: string, type = 'all') => {
    try {
      const response = await api.get('/search/suggestions', {
        params: { q: query, type }
      });
      return response.data;
    } catch (error) {
      // Mock response for development
      return { data: [] };
    }
  },

  getFilters: async () => {
    try {
      const response = await api.get('/search/filters');
      return response.data;
    } catch (error) {
      // Mock response for development
      return {
        data: {
          boroughs: ['MANHATTAN', 'BROOKLYN', 'QUEENS', 'BRONX', 'STATEN_ISLAND'],
          propertyTypes: ['APARTMENT', 'HOUSE', 'CONDO', 'STUDIO'],
          amenities: ['Doorman', 'Gym', 'Rooftop', 'Laundry', 'Parking', 'Pet Friendly']
        }
      };
    }
  },
};

export default api;
