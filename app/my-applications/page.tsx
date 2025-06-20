'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Download,
  ArrowRight,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { applicationService } from '@/services/api';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  updatedAt: string;
  moveInDate: string;
  monthlyIncome: number;
  notes?: string;
  landlordNotes?: string;
  property: {
    id: string;
    title: string;
    address: string;
    rentAmount: number;
    bedrooms: number;
    bathrooms: number;
    photos: string[];
  };
  documents: {
    idDocument?: string;
    payStubs?: string[];
    bankStatements?: string[];
    employmentLetter?: string;
  };
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Under Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    description: 'Your application is being reviewed by the landlord'
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    description: 'Congratulations! Your application has been approved'
  },
  REJECTED: {
    label: 'Not Selected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Unfortunately, your application was not selected'
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: AlertCircle,
    description: 'You withdrew this application'
  }
};

export default function MyApplicationsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isAuthenticated && user?.userType === 'RENTER') {
      loadApplications();
    }
  }, [isAuthenticated, user]);

  const loadApplications = async () => {
    try {
      const response = await applicationService.getMyApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }

    try {
      await applicationService.withdrawApplication(applicationId);
      toast({
        title: 'Application Withdrawn',
        description: 'Your application has been withdrawn successfully.',
        variant: 'default'
      });
      loadApplications(); // Reload to reflect changes
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to withdraw application. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated || user?.userType !== 'RENTER') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-8">Only renters can view applications.</p>
            <Button asChild>
              <Link href="/properties">Browse Properties</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-lg text-gray-600">
            Track the status of your rental applications
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by property name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Not Selected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length > 0 ? (
          <div className="space-y-6">
            {filteredApplications.map((application) => {
              const statusConfig = STATUS_CONFIG[application.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={application.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={application.property.photos[0] || '/placeholder-property.jpg'}
                            alt={application.property.title}
                            fill
                            className="object-cover rounded-lg"
                            sizes="80px"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {application.property.title}
                          </h3>
                          <div className="flex items-center text-gray-600 mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="text-sm">{application.property.address}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{application.property.bedrooms} bed</span>
                            <span>{application.property.bathrooms} bath</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(application.property.rentAmount)}/month
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusConfig.label}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Applied {formatRelativeTime(application.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Application Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-t border-gray-100">
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Desired Move-in</span>
                        </div>
                        <p className="font-medium">{formatDate(application.moveInDate)}</p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Monthly Income</span>
                        </div>
                        <p className="font-medium">{formatCurrency(application.monthlyIncome)}</p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <FileText className="h-4 w-4 mr-1" />
                          <span>Documents</span>
                        </div>
                        <p className="font-medium">
                          {Object.values(application.documents).filter(Boolean).length} uploaded
                        </p>
                      </div>
                    </div>

                    {/* Status Description */}
                    <div className="py-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{statusConfig.description}</p>
                      {application.landlordNotes && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Landlord Note:</strong> {application.landlordNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex space-x-3">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/properties/${application.property.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Property
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/messages?property=${application.property.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Contact Landlord
                          </Link>
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        {application.status === 'APPROVED' && (
                          <Button asChild size="sm">
                            <Link href={`/lease/${application.id}`}>
                              Next Steps
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        )}
                        {application.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdrawApplication(application.id)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'ALL' ? 'No applications found' : 'No applications yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Start browsing properties and submit your first application.'
              }
            </p>
            <Button asChild>
              <Link href="/properties">
                Browse Properties
              </Link>
            </Button>
          </div>
        )}

        {/* Application Tips */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Application Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Improve Your Chances:</h4>
              <ul className="space-y-1">
                <li>• Upload all required documents</li>
                <li>• Ensure your income is 40x the monthly rent</li>
                <li>• Provide complete reference information</li>
                <li>• Respond promptly to landlord messages</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Application Status:</h4>
              <ul className="space-y-1">
                <li>• <strong>Under Review:</strong> Landlord is reviewing your application</li>
                <li>• <strong>Approved:</strong> You can proceed with lease signing</li>
                <li>• <strong>Not Selected:</strong> Application was not chosen</li>
                <li>• <strong>Withdrawn:</strong> You cancelled the application</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
