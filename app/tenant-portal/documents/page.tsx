'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { leaseService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  DollarSign,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  signedAt?: string;
  property: {
    address: string;
    bedrooms: number;
    bathrooms: number;
    squareFootage?: number;
  };
  landlord: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
  terms?: any;
}

export default function TenantLeaseDocuments() {
  const { user } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  useEffect(() => {
    if (user) {
      loadLeases();
    }
  }, [user]);

  const loadLeases = async () => {
    try {
      setLoading(true);
      const response = await leaseService.getTenantLeases();
      setLeases(response.data);
      
      // Select the active lease by default
      const activeLease = response.data.find((lease: Lease) => 
        lease.status === 'ACTIVE' || lease.status === 'SIGNED'
      );
      setSelectedLease(activeLease || response.data[0] || null);
    } catch (error) {
      console.error('Error loading leases:', error);
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
      month: 'long',
      day: 'numeric'
    });
  };

  const getLeaseStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'signed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'signed':
        return <FileCheck className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'expired':
      case 'terminated':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await leaseService.downloadDocument(documentId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleViewDocument = (documentUrl: string) => {
    window.open(documentUrl, '_blank');
  };

  const getDaysUntilExpiration = (endDate: string) => {
    const today = new Date();
    const expiration = new Date(endDate);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tenant-portal">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lease Documents</h1>
            <p className="text-gray-600 mt-1">
              View and download your lease agreements and related documents
            </p>
          </div>
        </div>
      </div>

      {leases.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leases found</h3>
          <p className="text-gray-500">
            You don't have any lease agreements yet. Once you sign a lease, it will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lease List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Leases</h2>
              <div className="space-y-3">
                {leases.map((lease) => {
                  const daysUntilExpiration = getDaysUntilExpiration(lease.endDate);
                  return (
                    <div
                      key={lease.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedLease?.id === lease.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedLease(lease)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(lease.status)}
                          <Badge className={getLeaseStatusColor(lease.status)}>
                            {lease.status}
                          </Badge>
                        </div>
                        {daysUntilExpiration <= 90 && daysUntilExpiration > 0 && (
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <p className="font-medium text-gray-900 text-sm mb-1">
                        {lease.property.address}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        {formatCurrency(lease.monthlyRent)}/month
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Lease Details */}
          <div className="lg:col-span-2">
            {selectedLease ? (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Lease Status Alert */}
                  {(() => {
                    const daysUntilExpiration = getDaysUntilExpiration(selectedLease.endDate);
                    if (daysUntilExpiration <= 90 && daysUntilExpiration > 0) {
                      return (
                        <Card className="p-6 border-orange-200 bg-orange-50">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="h-6 w-6 text-orange-600 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-orange-900">Lease Renewal Notice</h3>
                              <p className="text-orange-800 mt-1">
                                Your lease expires in {daysUntilExpiration} days on {formatDate(selectedLease.endDate)}. 
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
                      );
                    }
                    return null;
                  })()}

                  {/* Property Information */}
                  <Card className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <Building className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Property Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-gray-900">{selectedLease.property.address}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Bedrooms</p>
                        <p className="text-gray-900">{selectedLease.property.bedrooms}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Bathrooms</p>
                        <p className="text-gray-900">{selectedLease.property.bathrooms}</p>
                      </div>
                      {selectedLease.property.squareFootage && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Square Footage</p>
                          <p className="text-gray-900">{selectedLease.property.squareFootage} sq ft</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Lease Details */}
                  <Card className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Lease Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Start Date</p>
                        <p className="text-gray-900">{formatDate(selectedLease.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">End Date</p>
                        <p className="text-gray-900">{formatDate(selectedLease.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Monthly Rent</p>
                        <p className="text-gray-900 font-semibold">{formatCurrency(selectedLease.monthlyRent)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Security Deposit</p>
                        <p className="text-gray-900">{formatCurrency(selectedLease.securityDeposit)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <Badge className={getLeaseStatusColor(selectedLease.status)}>
                          {selectedLease.status}
                        </Badge>
                      </div>
                      {selectedLease.signedAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Signed Date</p>
                          <p className="text-gray-900">{formatDate(selectedLease.signedAt)}</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Landlord Information */}
                  <Card className="p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <User className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Landlord Contact</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-gray-900">
                          {selectedLease.landlord.firstName} {selectedLease.landlord.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-gray-900">{selectedLease.landlord.email}</p>
                      </div>
                      {selectedLease.landlord.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Phone</p>
                          <p className="text-gray-900">{selectedLease.landlord.phone}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <Button asChild>
                        <Link href="/messages">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Message
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Documents</h3>
                    
                    {selectedLease.documents && selectedLease.documents.length > 0 ? (
                      <div className="space-y-4">
                        {selectedLease.documents.map((document) => (
                          <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-6 w-6 text-blue-600" />
                              <div>
                                <p className="font-medium text-gray-900">{document.name}</p>
                                <p className="text-sm text-gray-500">
                                  Uploaded {formatDate(document.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDocument(document.url)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadDocument(document.id, document.name)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No documents available for this lease.</p>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Terms Tab */}
                <TabsContent value="terms" className="space-y-6">
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Terms & Conditions</h3>
                    
                    {selectedLease.terms ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {JSON.stringify(selectedLease.terms, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">
                          Detailed terms and conditions are available in the lease document.
                        </p>
                        <Button asChild className="mt-3">
                          <Link href="#documents">
                            View Lease Document
                          </Link>
                        </Button>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a lease</h3>
                <p className="text-gray-500">
                  Choose a lease from the sidebar to view its details and documents.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
