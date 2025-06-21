'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { analyticsService } from '@/services/api';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Eye,
  MessageSquare,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PropertyAnalytics {
  property: {
    id: string;
    title: string;
    address: string;
    rentAmount: number;
    status: string;
  };
  applications: {
    total: number;
    byStatus: {
      pending?: number;
      approved?: number;
      rejected?: number;
      withdrawn?: number;
    };
  };
  maintenance: {
    total: number;
    totalCost: number;
    averageCost: number;
    byStatus: {
      pending?: number;
      scheduled?: number;
      in_progress?: number;
      completed?: number;
    };
    byPriority: {
      low?: number;
      medium?: number;
      high?: number;
      urgent?: number;
    };
  };
  payments: {
    total: number;
    totalAmount: number;
    averageAmount: number;
  };
  occupancy: {
    isOccupied: boolean;
    currentTenant?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    averageTimeToRent: number;
  };
  performance: {
    weeklyViews: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
  };
  leaseHistory: Array<{
    id: string;
    tenant: {
      firstName: string;
      lastName: string;
    };
    startDate: string;
    endDate: string;
    monthlyRent: number;
    status: string;
  }>;
}

interface PropertyAnalyticsProps {
  propertyId: string;
}

const PropertyAnalytics: React.FC<PropertyAnalyticsProps> = ({ propertyId }) => {
  const [analytics, setAnalytics] = useState<PropertyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await analyticsService.getPropertyAnalytics(propertyId);
      setAnalytics(response.data);
    } catch (err) {
      console.error('Failed to fetch property analytics:', err);
      setError('Failed to load property analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchAnalytics();
    }
  }, [propertyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rented':
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading property analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No analytics data available for this property.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{analytics.property.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">{analytics.property.address}</span>
              <Badge className={getStatusColor(analytics.property.status)}>
                {analytics.property.status}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={fetchAnalytics} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.property.rentAmount)}</div>
            <p className="text-xs text-gray-600">
              {formatCurrency(analytics.performance.yearlyRevenue)} annually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.applications.total}</div>
            <p className="text-xs text-gray-600">
              {analytics.applications.byStatus.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Requests</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.maintenance.total}</div>
            <p className="text-xs text-gray-600">
              {formatCurrency(analytics.maintenance.totalCost)} total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Views</CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.performance.weeklyViews}</div>
            <p className="text-xs text-gray-600">
              Avg time to rent: {analytics.occupancy.averageTimeToRent} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Occupancy Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-lg">
                {analytics.occupancy.isOccupied ? 'Occupied' : 'Vacant'}
              </div>
              {analytics.occupancy.currentTenant && (
                <div className="text-gray-600">
                  Current tenant: {analytics.occupancy.currentTenant.firstName} {analytics.occupancy.currentTenant.lastName}
                </div>
              )}
              <div className="text-sm text-gray-500 mt-1">
                Average time to rent: {analytics.occupancy.averageTimeToRent} days
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.performance.monthlyRevenue)}
              </div>
              <div className="text-sm text-gray-500">Monthly Revenue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications and Maintenance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Breakdown of rental applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.applications.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Overview</CardTitle>
            <CardDescription>Request status and priorities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">By Status</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.maintenance.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-3">
                <h4 className="font-medium mb-2">By Priority</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.maintenance.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between items-center">
                      <Badge className={getPriorityColor(priority)}>
                        {priority.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <CardDescription>Payment and revenue information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.payments.totalAmount)}
              </div>
              <div className="text-sm text-gray-600">Total Payments</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.payments.total}
              </div>
              <div className="text-sm text-gray-600">Payment Count</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.payments.averageAmount)}
              </div>
              <div className="text-sm text-gray-600">Average Payment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease History */}
      {analytics.leaseHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Lease History</CardTitle>
            <CardDescription>Past and current lease agreements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.leaseHistory.map((lease) => (
                <div key={lease.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {lease.tenant.firstName} {lease.tenant.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(lease.monthlyRent)}/month</div>
                    <Badge className={getStatusColor(lease.status)}>
                      {lease.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PropertyAnalytics;
