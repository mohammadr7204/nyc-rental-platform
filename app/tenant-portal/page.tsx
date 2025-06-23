'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService, leaseService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  MessageSquare,
  Wrench,
  Download,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface PaymentHistory {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  property: {
    address: string;
  };
}

interface LeaseInfo {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  property: {
    address: string;
    bedrooms: number;
    bathrooms: number;
  };
}

export default function TenantPortal() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [currentLease, setCurrentLease] = useState<LeaseInfo | null>(null);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTenantData();
    }
  }, [user]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Load payment history
      const paymentsResponse = await paymentService.getPaymentHistory();
      setPayments(paymentsResponse.data.slice(0, 5)); // Show last 5 payments

      // Load current lease information
      const leasesResponse = await leaseService.getTenantLeases();
      const activeLease = leasesResponse.data.find((lease: LeaseInfo) => 
        lease.status === 'ACTIVE' || lease.status === 'SIGNED'
      );
      setCurrentLease(activeLease || null);

      // Calculate upcoming payments (rent due dates)
      if (activeLease) {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        setUpcomingPayments([{
          id: 'rent-' + nextMonth.getTime(),
          type: 'Monthly Rent',
          amount: activeLease.monthlyRent,
          dueDate: nextMonth.toISOString(),
          status: 'pending'
        }]);
      }

    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your rental, payments, and communication with your landlord.
        </p>
      </div>

      {/* Current Lease Overview */}
      {currentLease && (
        <Card className="mb-8 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Lease</h2>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <strong>Property:</strong> {currentLease.property.address}
                </p>
                <p className="text-gray-600">
                  <strong>Lease Period:</strong> {formatDate(currentLease.startDate)} - {formatDate(currentLease.endDate)}
                </p>
                <p className="text-gray-600">
                  <strong>Monthly Rent:</strong> {formatCurrency(currentLease.monthlyRent)}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600"><strong>Status:</strong></span>
                  <Badge className={currentLease.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                    {currentLease.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/tenant-portal/lease/${currentLease.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Lease
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button asChild className="h-auto p-4 flex-col space-y-2">
          <Link href="/tenant-portal/payments">
            <CreditCard className="h-6 w-6" />
            <span>Pay Rent</span>
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
          <Link href="/maintenance">
            <Wrench className="h-6 w-6" />
            <span>Request Maintenance</span>
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
          <Link href="/messages">
            <MessageSquare className="h-6 w-6" />
            <span>Message Landlord</span>
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
          <Link href="/tenant-portal/documents">
            <FileText className="h-6 w-6" />
            <span>View Documents</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Payments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Payments</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tenant-portal/payments">
                View All
              </Link>
            </Button>
          </div>
          
          {upcomingPayments.length > 0 ? (
            <div className="space-y-3">
              {upcomingPayments.map((payment) => {
                const daysUntil = getDaysUntilDue(payment.dueDate);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{payment.type}</p>
                        <p className="text-sm text-gray-500">
                          Due {formatDate(payment.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <div className="flex items-center space-x-1">
                        {daysUntil <= 7 && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                        <span className={`text-sm ${daysUntil <= 3 ? 'text-red-600' : daysUntil <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                          {daysUntil <= 0 ? 'Overdue' : `${daysUntil} days`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500">All payments are up to date!</p>
            </div>
          )}
        </Card>

        {/* Recent Payment History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tenant-portal/payment-history">
                View All
              </Link>
            </Button>
          </div>
          
          {payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{payment.type}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge className={getPaymentStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No payment history yet</p>
            </div>
          )}
        </Card>
      </div>

      {/* Important Notice */}
      {currentLease && new Date(currentLease.endDate) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
        <Card className="mt-8 p-6 border-orange-200 bg-orange-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Lease Renewal Notice</h3>
              <p className="text-orange-800 mt-1">
                Your lease expires on {formatDate(currentLease.endDate)}. 
                Contact your landlord to discuss renewal options.
              </p>
              <Button asChild className="mt-3" size="sm">
                <Link href="/messages">
                  Contact Landlord
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
