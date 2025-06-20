'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Home, 
  MessageSquare, 
  Heart, 
  FileText, 
  DollarSign, 
  Users, 
  Building, 
  Plus,
  Eye,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Star,
  Wrench,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/PropertyCard';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { userService, propertyService, applicationService, maintenanceService } from '@/services/api';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [recentProperties, setRecentProperties] = useState([]);
  const [recentMaintenanceRequests, setRecentMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, propertiesResponse, maintenanceStatsResponse] = await Promise.all([
        userService.getDashboardStats(),
        user?.userType === 'LANDLORD' || user?.userType === 'PROPERTY_MANAGER'
          ? propertyService.getMyProperties()
          : propertyService.getSavedProperties(),
        maintenanceService.getStats()
      ]);
      
      setStats(statsResponse.data);
      setRecentProperties(propertiesResponse.data.slice(0, 3));
      setMaintenanceStats(maintenanceStatsResponse.data);

      // Load recent maintenance requests
      try {
        const maintenanceResponse = await maintenanceService.getRequests({ limit: 3 });
        setRecentMaintenanceRequests(maintenanceResponse.data);
      } catch (error) {
        console.error('Error loading maintenance requests:', error);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLandlord = user?.userType === 'LANDLORD' || user?.userType === 'PROPERTY_MANAGER';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-lg text-gray-600">
            {isLandlord 
              ? 'Manage your properties, maintenance requests, and tenant applications'
              : 'Track your applications, maintenance requests, and discover new places'
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLandlord ? (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Properties</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.propertiesCount || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/my-properties" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all properties →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Applications</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.applicationsCount || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/applications" className="text-sm text-green-600 hover:text-green-700 font-medium">
                    Review applications →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Maintenance</p>
                    <p className="text-3xl font-bold text-gray-900">{maintenanceStats?.pendingRequests || 0}</p>
                    <p className="text-xs text-gray-500">Pending requests</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/maintenance" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    View requests →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/dashboard/payments" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    View earnings →
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Applications</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.applicationsCount || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/my-applications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View applications →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Saved Properties</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.savedPropertiesCount || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/saved" className="text-sm text-red-600 hover:text-red-700 font-medium">
                    View saved →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Maintenance</p>
                    <p className="text-3xl font-bold text-gray-900">{maintenanceStats?.totalRequests || 0}</p>
                    <p className="text-xs text-gray-500">Total requests</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Wrench className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/maintenance" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    View requests →
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Browse</p>
                    <p className="text-lg font-semibold text-gray-900">Find Apartments</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Home className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Link href="/properties" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Browse properties →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Properties */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isLandlord ? 'Your Properties' : 'Saved Properties'}
              </h2>
              {isLandlord && (
                <Button asChild size="sm">
                  <Link href="/list-property">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Link>
                </Button>
              )}
            </div>
            
            {recentProperties.length > 0 ? (
              <div className="space-y-4">
                {recentProperties.map((property: any) => (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {property.address}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{property.bedrooms} bed</span>
                          <span>{property.bathrooms} bath</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(property.rentAmount)}/mo
                          </span>
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/properties/${property.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Button asChild variant="outline">
                    <Link href={isLandlord ? '/my-properties' : '/saved'}>
                      View All
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isLandlord ? 'No properties yet' : 'No saved properties'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {isLandlord 
                    ? 'Start by adding your first property listing.'
                    : 'Save properties as you browse to keep track of your favorites.'
                  }
                </p>
                <Button asChild>
                  <Link href={isLandlord ? '/list-property' : '/properties'}>
                    {isLandlord ? 'Add Property' : 'Browse Properties'}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Recent Maintenance Requests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Maintenance
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href="/maintenance">
                  View All
                </Link>
              </Button>
            </div>
            
            {recentMaintenanceRequests.length > 0 ? (
              <div className="space-y-4">
                {recentMaintenanceRequests.slice(0, 3).map((request: any) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{request.title}</h3>
                        <p className="text-sm text-gray-600">{request.property.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.priority === 'URGENT' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          request.status === 'PENDING' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : request.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatRelativeTime(request.createdAt)}
                      {isLandlord && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{request.tenant.firstName} {request.tenant.lastName}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No maintenance requests
                </h3>
                <p className="text-gray-600 mb-4">
                  {isLandlord 
                    ? 'No maintenance requests have been submitted yet.'
                    : 'You haven\'t submitted any maintenance requests yet.'
                  }
                </p>
                <Button asChild>
                  <Link href="/maintenance">
                    {isLandlord ? 'View Requests' : 'Submit Request'}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href={isLandlord ? '/applications' : '/my-applications'}>
                  View All
                </Link>
              </Button>
            </div>
            
            {stats?.recentApplications?.length > 0 ? (
              <div className="space-y-4">
                {stats.recentApplications.slice(0, 5).map((application: any) => (
                  <div key={application.id} className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {isLandlord 
                            ? `${application.applicant?.firstName} ${application.applicant?.lastName}`
                            : application.property.title
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(application.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {isLandlord 
                          ? `Applied for ${application.property.title}`
                          : `Application ${application.status.toLowerCase()}`
                        }
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                        application.status === 'PENDING' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : application.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No recent activity
                </h3>
                <p className="text-gray-600">
                  {isLandlord 
                    ? 'Applications will appear here when tenants apply to your properties.'
                    : 'Your application activity will appear here.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLandlord ? (
              <>
                <Button asChild className="h-auto p-4 flex-col space-y-2">
                  <Link href="/list-property">
                    <Plus className="h-6 w-6" />
                    <span>Add Property</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/applications">
                    <FileText className="h-6 w-6" />
                    <span>Review Applications</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/maintenance">
                    <Wrench className="h-6 w-6" />
                    <span>Maintenance</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/dashboard/payments">
                    <TrendingUp className="h-6 w-6" />
                    <span>View Earnings</span>
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="h-auto p-4 flex-col space-y-2">
                  <Link href="/properties">
                    <Home className="h-6 w-6" />
                    <span>Browse Properties</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/saved">
                    <Heart className="h-6 w-6" />
                    <span>Saved Properties</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/my-applications">
                    <FileText className="h-6 w-6" />
                    <span>My Applications</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
                  <Link href="/maintenance">
                    <Wrench className="h-6 w-6" />
                    <span>Maintenance</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}