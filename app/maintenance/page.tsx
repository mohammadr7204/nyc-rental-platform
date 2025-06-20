'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Filter, 
  Search, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { MaintenanceRequestForm, MaintenanceRequestCard } from '@/components/MaintenanceComponents';
import { useAuth } from '@/contexts/AuthContext';
import { maintenanceService, propertyService } from '@/services/api';
import { toast } from 'react-hot-toast';

interface MaintenanceStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  urgentRequests: number;
  avgResponseTime?: number;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  photos: string[];
  cost?: number;
  scheduledDate?: string;
  completedAt?: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    address: string;
  };
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    propertyId: ''
  });

  const isLandlord = user?.userType === 'LANDLORD' || user?.userType === 'PROPERTY_MANAGER';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [filters]);

  const loadData = async () => {
    try {
      const [statsResponse, propertiesResponse] = await Promise.all([
        maintenanceService.getStats(),
        isLandlord ? propertyService.getMyProperties() : propertyService.getSavedProperties()
      ]);
      
      setStats(statsResponse.data);
      setProperties(propertiesResponse.data);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      toast.error('Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const params: any = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.propertyId) params.propertyId = filters.propertyId;

      const response = await maintenanceService.getRequests(params);
      let filteredRequests = response.data;

      // Apply search filter client-side
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredRequests = filteredRequests.filter((request: MaintenanceRequest) =>
          request.title.toLowerCase().includes(searchTerm) ||
          request.description.toLowerCase().includes(searchTerm) ||
          request.property.title.toLowerCase().includes(searchTerm)
        );
      }

      setRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      toast.error('Failed to load maintenance requests');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', search: '', propertyId: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Wrench className="h-8 w-8" />
              Maintenance Requests
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {isLandlord 
                ? 'Manage maintenance requests for your properties'
                : 'Track your maintenance requests and submit new ones'
              }
            </p>
          </div>
          {!isLandlord && properties.length > 0 && (
            <MaintenanceRequestForm 
              properties={properties} 
              onSuccess={loadRequests}
            />
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalRequests}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingRequests}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.inProgressRequests}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedRequests}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-3xl font-bold text-red-600">{stats.urgentRequests}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.priority}
                onValueChange={(value) => handleFilterChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLandlord && (
              <div>
                <Select
                  value={filters.propertyId}
                  onValueChange={(value) => handleFilterChange('propertyId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Properties</SelectItem>
                    {properties.map((property: any) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Request List */}
        <div className="space-y-6">
          {requests.length > 0 ? (
            requests.map((request) => (
              <MaintenanceRequestCard
                key={request.id}
                request={request}
                isLandlord={isLandlord}
                onUpdate={loadRequests}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No maintenance requests found
              </h3>
              <p className="text-gray-600 mb-6">
                {isLandlord 
                  ? 'No maintenance requests have been submitted for your properties yet.'
                  : 'You haven\'t submitted any maintenance requests yet.'
                }
              </p>
              {!isLandlord && properties.length > 0 && (
                <MaintenanceRequestForm 
                  properties={properties} 
                  onSuccess={loadRequests}
                />
              )}
            </div>
          )}
        </div>

        {/* Average Response Time for Landlords */}
        {isLandlord && stats?.avgResponseTime && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}h</div>
                <div className="text-sm text-gray-600">Average Response Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completedRequests > 0 ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.urgentRequests}
                </div>
                <div className="text-sm text-gray-600">Urgent Requests</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}