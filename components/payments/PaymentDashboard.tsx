'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Payment {
  id: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  paidDate?: string;
  createdAt: string;
  platformFee?: number;
  stripeFee?: number;
  landlordAmount?: number;
  payer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  receiver?: {
    firstName: string;
    lastName: string;
  };
  application?: {
    property: {
      title: string;
      address: string;
    };
  };
}

interface PaymentSummary {
  totalEarnings?: number;
  totalGrossAmount?: number;
  paymentCount?: number;
  pendingPayments?: number;
  totalPaid?: number;
  totalPending?: number;
}

interface PaymentDashboardProps {
  userType: 'RENTER' | 'LANDLORD' | 'PROPERTY_MANAGER';
}

export default function PaymentDashboard({ userType }: PaymentDashboardProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchPayments = async (page = 1) => {
    try {
      const endpoint = userType === 'RENTER' ? '/api/payments/history' : '/api/payments/earnings';
      const response = await fetch(`${endpoint}?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPayments(result.data.payments || result.data);
        
        if (userType !== 'RENTER' && result.data.summary) {
          setSummary(result.data.summary);
        }
        
        if (result.pagination) {
          setCurrentPage(result.pagination.page);
          setTotalPages(result.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRenterSummary = () => {
    const totalPaid = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const totalPending = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);

    return { totalPaid, totalPending };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'TRANSFERRED':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Transferred</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'APPLICATION_FEE': 'Application Fee',
      'SECURITY_DEPOSIT': 'Security Deposit',
      'FIRST_MONTH_RENT': 'First Month Rent',
      'MONTHLY_RENT': 'Monthly Rent',
      'BACKGROUND_CHECK_FEE': 'Background Check',
      'BROKER_FEE': 'Broker Fee',
      'OTHER': 'Other'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const renterSummary = userType === 'RENTER' ? calculateRenterSummary() : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userType === 'RENTER' ? (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold">${renterSummary?.totalPaid?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                    <p className="text-2xl font-bold">${renterSummary?.totalPending?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{payments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold">${summary.totalEarnings?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Gross Revenue</p>
                    <p className="text-2xl font-bold">${summary.totalGrossAmount?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                    <p className="text-2xl font-bold">{summary.pendingPayments || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {userType === 'RENTER' ? 'Payment History' : 'Earnings History'}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-600">
                {userType === 'RENTER' 
                  ? 'Your payment history will appear here once you make your first payment.'
                  : 'Your earnings will appear here once you receive your first payment.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{getPaymentTypeLabel(payment.type)}</h4>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      {payment.description && (
                        <p className="text-sm text-gray-600 mb-2">{payment.description}</p>
                      )}
                      
                      {payment.application?.property && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">{payment.application.property.title}</p>
                          <p>{payment.application.property.address}</p>
                        </div>
                      )}
                      
                      {userType !== 'RENTER' && payment.payer && (
                        <p className="text-sm text-gray-600">
                          From: {payment.payer.firstName} {payment.payer.lastName}
                        </p>
                      )}
                      
                      {userType === 'RENTER' && payment.receiver && (
                        <p className="text-sm text-gray-600">
                          To: {payment.receiver.firstName} {payment.receiver.lastName}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${userType === 'RENTER' ? payment.amount.toFixed(2) : (payment.landlordAmount || payment.amount).toFixed(2)}
                      </div>
                      
                      {userType !== 'RENTER' && payment.platformFee && (
                        <div className="text-sm text-gray-500">
                          Platform fee: ${payment.platformFee.toFixed(2)}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        {payment.paidDate ? formatDate(payment.paidDate) : formatDate(payment.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPayments(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPayments(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}