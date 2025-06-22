'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Calendar,
  DollarSign,
  RefreshCw,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { leaseService } from '@/services/leaseService';
import { toast } from 'react-hot-toast';

interface LeaseStats {
  totalLeases: number;
  activeLeases: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  draftLeases: number;
  terminatedThisMonth: number;
}

interface RenewalCandidate {
  id: string;
  application: {
    property: {
      title: string;
      address: string;
    };
    applicant: {
      firstName: string;
      lastName: string;
    };
  };
  endDate: string;
  monthlyRent: number;
  daysUntilExpiration: number;
}

export default function LeaseDashboardWidget() {
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [renewalCandidates, setRenewalCandidates] = useState<RenewalCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, renewalsData] = await Promise.all([
        leaseService.getLeaseStats(),
        leaseService.getRenewalCandidates(90)
      ]);
      setStats(statsData);
      setRenewalCandidates(renewalsData.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error('Error fetching lease data:', error);
      toast.error('Failed to fetch lease data');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return 'text-red-600';
    if (days <= 60) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 30) return 'bg-red-100 text-red-800';
    if (days <= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lease Statistics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Overview
          </CardTitle>
          <Link href="/leases">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Active Leases</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.activeLeases}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Total Leases</p>
                      <p className="text-2xl font-bold text-green-900">{stats.totalLeases}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-3">
                {stats.expiringIn30Days > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">Expiring Soon</p>
                        <p className="text-sm text-red-600">
                          {stats.expiringIn30Days} lease{stats.expiringIn30Days > 1 ? 's' : ''} expiring in 30 days
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {stats.expiringIn30Days}
                    </Badge>
                  </div>
                )}

                {stats.expiringIn90Days > stats.expiringIn30Days && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Renewal Planning</p>
                        <p className="text-sm text-yellow-600">
                          {stats.expiringIn90Days - stats.expiringIn30Days} lease{stats.expiringIn90Days - stats.expiringIn30Days > 1 ? 's' : ''} expiring in 90 days
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {stats.expiringIn90Days - stats.expiringIn30Days}
                    </Badge>
                  </div>
                )}

                {stats.draftLeases > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">Draft Leases</p>
                        <p className="text-sm text-gray-600">
                          {stats.draftLeases} lease{stats.draftLeases > 1 ? 's' : ''} awaiting finalization
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">
                      {stats.draftLeases}
                    </Badge>
                  </div>
                )}

                {stats.expiringIn30Days === 0 && stats.draftLeases === 0 && (
                  <div className="flex items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="font-medium text-green-800">All Good!</p>
                      <p className="text-sm text-green-600">No urgent lease actions needed</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No lease data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal Candidates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Renewal Candidates
          </CardTitle>
          <Link href="/leases?expiringIn=90">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {renewalCandidates.length > 0 ? (
            <div className="space-y-3">
              {renewalCandidates.map((lease) => (
                <div key={lease.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {lease.application.property.title}
                        </p>
                        <Badge className={getUrgencyBadge(lease.daysUntilExpiration)}>
                          {lease.daysUntilExpiration} days
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {lease.application.applicant.firstName} {lease.application.applicant.lastName}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires {format(new Date(lease.endDate), 'MMM dd')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${(lease.monthlyRent / 100).toLocaleString()}/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <Link href={`/leases/${lease.id}`}>
                        <Button size="sm" variant="outline" className="text-xs px-2 py-1 h-auto">
                          View
                        </Button>
                      </Link>
                      {lease.daysUntilExpiration <= 90 && (
                        <span className={`text-xs font-medium ${getUrgencyColor(lease.daysUntilExpiration)}`}>
                          {lease.daysUntilExpiration <= 30 ? 'Urgent' : 'Soon'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {renewalCandidates.length === 5 && (
                <div className="text-center pt-2">
                  <Link href="/leases?expiringIn=90">
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      View all renewal candidates
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No renewals needed</h3>
              <p className="text-gray-600">All leases are current with no upcoming renewals.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}