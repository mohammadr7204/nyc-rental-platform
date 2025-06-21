'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Wrench,
  Calendar,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { analyticsService } from '@/services/api';
import Link from 'next/link';

interface PropertyAnalyticsData {
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
      pending: number;
      approved: number;
      rejected: number;
      withdrawn: number;
    };
  };
  maintenance: {
    total: number;
    totalCost: number;
    averageCost: number;
    byStatus: {
      pending: number;
      scheduled: number;
      in_progress: number;
      completed: number;
    };
    byPriority: {
      low: number;
      medium: number;
      high: number;
      urgent: number;
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
  const [analyticsData, setAnalyticsData] = useState<PropertyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPropertyAnalytics();
  }, [propertyId]);

  const fetchPropertyAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsService.getPropertyAnalytics(propertyId);
      setAnalyticsData(response.data);
    } catch (err) {
      setError('Failed to load property analytics');
      console.error('Property analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

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
      case 'available': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load property analytics'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{analyticsData.property.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {analyticsData.property.address}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.property.rentAmount)}</div>
              <Badge className={getStatusColor(analyticsData.property.status)}>
                {analyticsData.property.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.performance.weeklyViews}</div>
            <p className="text-xs text-muted-foreground">Property page views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.performance.monthlyRevenue)}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatCurrency(analyticsData.performance.yearlyRevenue)} annually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.applications.total}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.applications.byStatus.pending} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.maintenance.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.maintenance.total} requests total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>Current Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsData.occupancy.isOccupied ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium">Occupied</div>
                  {analyticsData.occupancy.currentTenant && (
                    <div className="text-sm text-muted-foreground">
                      Tenant: {analyticsData.occupancy.currentTenant.firstName} {analyticsData.occupancy.currentTenant.lastName}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{formatCurrency(analyticsData.performance.monthlyRevenue)}</div>
                <div className="text-xs text-muted-foreground">Monthly income</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <div className="font-medium">Vacant</div>
                  <div className="text-sm text-muted-foreground">
                    Avg. time to rent: {analyticsData.occupancy.averageTimeToRent} days
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-red-600">$0</div>
                <div className="text-xs text-muted-foreground">Lost revenue</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Breakdown of rental applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span>Pending Review</span>
                </div>
                <span className="font-medium">{analyticsData.applications.byStatus.pending}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span>Approved</span>
                </div>
                <span className="font-medium">{analyticsData.applications.byStatus.approved}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span>Rejected</span>
                </div>
                <span className="font-medium">{analyticsData.applications.byStatus.rejected}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                  <span>Withdrawn</span>
                </div>
                <span className="font-medium">{analyticsData.applications.byStatus.withdrawn}</span>
              </div>
            </div>
            
            {analyticsData.applications.byStatus.pending > 0 && (
              <div className="mt-4">
                <Link href="/applications">
                  <Button variant="outline" className="w-full">
                    Review Pending Applications
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Overview</CardTitle>
            <CardDescription>Maintenance requests and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{analyticsData.maintenance.total}</div>
                  <div className="text-xs text-muted-foreground">Total Requests</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{formatCurrency(analyticsData.maintenance.averageCost)}</div>
                  <div className="text-xs text-muted-foreground">Avg. Cost</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">By Priority</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.maintenance.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(priority)}`}>
                        {priority.toUpperCase()}
                      </span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">By Status</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.maintenance.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/maintenance">
                <Button variant="outline" className="w-full">
                  View All Maintenance
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Performance</CardTitle>
          <CardDescription>Revenue and payment statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{analyticsData.payments.total}</div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.payments.totalAmount)}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.payments.averageAmount)}</div>
              <div className="text-sm text-muted-foreground">Average Payment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease History */}
      <Card>
        <CardHeader>
          <CardTitle>Lease History</CardTitle>
          <CardDescription>Past and current tenants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.leaseHistory.length > 0 ? (
              analyticsData.leaseHistory.map((lease) => (
                <div key={lease.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <div className="mr-4">
                      <div className="font-medium">
                        {lease.tenant.firstName} {lease.tenant.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(lease.monthlyRent)}</div>
                    <Badge 
                      variant={lease.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {lease.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No lease history available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyAnalytics;
