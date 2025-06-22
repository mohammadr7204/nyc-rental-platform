'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, FileText, AlertTriangle, TrendingUp, Users, Clock, Filter, Search, Eye, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { leaseService } from '@/services/leaseService';
import { toast } from 'react-hot-toast';

interface Lease {
  id: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  signedAt?: string;
  documentUrl?: string;
  application: {
    property: {
      id: string;
      title: string;
      address: string;
      borough: string;
    };
    applicant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
  createdAt: string;
  daysUntilExpiration?: number;
}

interface LeaseStats {
  totalLeases: number;
  activeLeases: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  draftLeases: number;
  terminatedThisMonth: number;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  TERMINATED: 'bg-red-100 text-red-800'
};

const statusLabels = {
  DRAFT: 'Draft',
  PENDING_SIGNATURE: 'Pending Signature',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated'
};

export default function LeasesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    expiringIn: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user?.userType !== 'LANDLORD') {
      router.push('/dashboard');
      return;
    }
    fetchLeases();
    fetchStats();
  }, [user, filters, currentPage]);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (filters.status) params.append('status', filters.status);
      if (filters.expiringIn) params.append('expiringIn', filters.expiringIn);
      
      const response = await leaseService.getLeases(params.toString());
      setLeases(response.leases);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error fetching leases:', error);
      toast.error('Failed to fetch leases');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await leaseService.getLeaseStats();
      setStats(response);
    } catch (error) {
      console.error('Error fetching lease stats:', error);
    }
  };

  const filteredLeases = leases.filter(lease => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        lease.application.property.title.toLowerCase().includes(searchTerm) ||
        lease.application.property.address.toLowerCase().includes(searchTerm) ||
        `${lease.application.applicant.firstName} ${lease.application.applicant.lastName}`.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  const getExpirationStatus = (lease: Lease) => {
    if (lease.status !== 'ACTIVE') return null;
    
    const daysUntil = differenceInDays(new Date(lease.endDate), new Date());
    if (daysUntil < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 30) return { label: `${daysUntil} days left`, color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 90) return { label: `${daysUntil} days left`, color: 'bg-yellow-100 text-yellow-800' };
    return { label: `${daysUntil} days left`, color: 'bg-green-100 text-green-800' };
  };

  if (user?.userType !== 'LANDLORD') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Lease Management</h1>
            <p className="text-gray-600">Manage your property leases and track renewals</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link href="/applications">
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create from Application
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Leases</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalLeases}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeLeases}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expiring (30d)</p>
                    <p className="text-2xl font-bold text-red-600">{stats.expiringIn30Days}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expiring (90d)</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.expiringIn90Days}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Draft</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.draftLeases}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Terminated</p>
                    <p className="text-2xl font-bold text-red-600">{stats.terminatedThisMonth}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search leases..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="TERMINATED">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:w-48">
                <Select value={filters.expiringIn} onValueChange={(value) => setFilters(prev => ({ ...prev, expiringIn: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Expiring in..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Dates</SelectItem>
                    <SelectItem value="30">Next 30 days</SelectItem>
                    <SelectItem value="60">Next 60 days</SelectItem>
                    <SelectItem value="90">Next 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leases List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredLeases.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leases found</h3>
                <p className="text-gray-600 mb-4">Start by creating leases from approved applications.</p>
                <Link href="/applications">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    View Applications
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredLeases.map((lease) => {
              const expirationStatus = getExpirationStatus(lease);
              return (
                <Card key={lease.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {lease.application.property.title}
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {lease.application.property.address}, {lease.application.property.borough}
                            </p>
                            <p className="text-sm text-gray-500">
                              Tenant: {lease.application.applicant.firstName} {lease.application.applicant.lastName}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={statusColors[lease.status]}>
                              {statusLabels[lease.status]}
                            </Badge>
                            {expirationStatus && (
                              <Badge className={expirationStatus.color}>
                                {expirationStatus.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Monthly Rent</p>
                            <p className="font-semibold">${(lease.monthlyRent / 100).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Security Deposit</p>
                            <p className="font-semibold">${(lease.securityDeposit / 100).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Start Date</p>
                            <p className="font-semibold">{format(new Date(lease.startDate), 'MMM dd, yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">End Date</p>
                            <p className="font-semibold">{format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link href={`/leases/${lease.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </Link>
                          {lease.status === 'ACTIVE' && expirationStatus && differenceInDays(new Date(lease.endDate), new Date()) <= 90 && (
                            <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                              <Calendar className="h-4 w-4 mr-1" />
                              Renew Lease
                            </Button>
                          )}
                          {lease.documentUrl && (
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              View Document
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}