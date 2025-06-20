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
  User,
  Briefcase,
  Shield,
  Phone,
  Mail,
  Building,
  Search,
  Filter,
  Star,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { applicationService, propertyService } from '@/services/api';
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
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  employmentInfo: {
    employer: string;
    position: string;
    yearsEmployed: number;
    supervisorName: string;
    supervisorPhone: string;
    workAddress: string;
  };
  references: Array<{
    name: string;
    relationship: string;
    phone: string;
    email: string;
  }>;
  documents: {
    idDocument?: string;
    payStubs?: string[];
    bankStatements?: string[];
    employmentLetter?: string;
  };
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: AlertCircle
  }
};

export default function ApplicationsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [propertyFilter, setPropertyFilter] = useState<string>('ALL');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && (user?.userType === 'LANDLORD' || user?.userType === 'PROPERTY_MANAGER')) {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    try {
      const [applicationsResponse, propertiesResponse] = await Promise.all([
        applicationService.getPropertyApplications(),
        propertyService.getMyProperties()
      ]);
      
      setApplications(applicationsResponse.data);
      setProperties(propertiesResponse.data);
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

  const handleUpdateStatus = async (applicationId: string, status: 'APPROVED' | 'REJECTED', notes?: string) => {
    setUpdating(applicationId);
    try {
      await applicationService.updateApplicationStatus(applicationId, status, notes);
      toast({
        title: 'Application Updated',
        description: `Application has been ${status.toLowerCase()}.`,
        variant: 'default'
      });
      loadData(); // Reload applications
      setShowDetails(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const viewApplicationDetails = (application: Application) => {
    setSelectedApplication(application);
    setShowDetails(true);
  };

  const filteredApplications = applications.filter(app => {
    const applicantName = `${app.applicant.firstName} ${app.applicant.lastName}`.toLowerCase();
    const matchesSearch = applicantName.includes(searchTerm.toLowerCase()) ||
                         app.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesProperty = propertyFilter === 'ALL' || app.property.id === propertyFilter;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  if (!isAuthenticated || (user?.userType !== 'LANDLORD' && user?.userType !== 'PROPERTY_MANAGER')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-8">Only landlords can view rental applications.</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rental Applications</h1>
          <p className="text-lg text-gray-600">
            Review and manage applications for your properties
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{applications.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {applications.filter(app => app.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600">
                  {applications.filter(app => app.status === 'APPROVED').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-3xl font-bold text-blue-600">
                  {applications.filter(app => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(app.createdAt) > weekAgo;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by applicant name or property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
            <div>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Properties</option>
                {properties.map((property: any) => (
                  <option key={property.id} value={property.id}>
                    {property.title}
                  </option>
                ))}
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
              const incomeRatio = application.monthlyIncome / application.property.rentAmount;
              
              return (
                <div key={application.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          {application.applicant.profileImage ? (
                            <Image
                              src={application.applicant.profileImage}
                              alt={`${application.applicant.firstName} ${application.applicant.lastName}`}
                              fill
                              className="object-cover rounded-full"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {application.applicant.firstName} {application.applicant.lastName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            Applied for: <strong>{application.property.title}</strong>
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(application.moveInDate)}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(application.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 border-t border-gray-100">
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Monthly Income</span>
                        </div>
                        <p className="font-medium">{formatCurrency(application.monthlyIncome)}</p>
                        <p className={`text-xs ${incomeRatio >= 40 ? 'text-green-600' : incomeRatio >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {incomeRatio.toFixed(1)}x rent
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span>Employment</span>
                        </div>
                        <p className="font-medium">{application.employmentInfo.employer}</p>
                        <p className="text-xs text-gray-500">{application.employmentInfo.position}</p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <FileText className="h-4 w-4 mr-1" />
                          <span>Documents</span>
                        </div>
                        <p className="font-medium">
                          {Object.values(application.documents).filter(Boolean).length} files
                        </p>
                        <p className="text-xs text-gray-500">
                          {application.documents.idDocument ? '✓' : '✗'} ID, 
                          {application.documents.payStubs?.length ? '✓' : '✗'} Pay stubs
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <User className="h-4 w-4 mr-1" />
                          <span>References</span>
                        </div>
                        <p className="font-medium">{application.references.length} provided</p>
                        <p className="text-xs text-gray-500">Complete references</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex space-x-3">
                        <Button 
                          onClick={() => viewApplicationDetails(application)}
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/messages?recipient=${application.applicant.id}&property=${application.property.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Link>
                        </Button>
                      </div>
                      
                      {application.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleUpdateStatus(application.id, 'REJECTED')}
                            variant="outline"
                            size="sm"
                            disabled={updating === application.id}
                          >
                            {updating === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(application.id, 'APPROVED')}
                            size="sm"
                            disabled={updating === application.id}
                          >
                            {updating === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      )}
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
              {searchTerm || statusFilter !== 'ALL' || propertyFilter !== 'ALL' ? 'No applications found' : 'No applications yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'ALL' || propertyFilter !== 'ALL'
                ? 'Try adjusting your search or filter criteria.'
                : 'Applications will appear here when renters apply to your properties.'
              }
            </p>
            <Button asChild>
              <Link href="/list-property">
                <Building className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            </Button>
          </div>
        )}

        {/* Application Details Modal */}
        {showDetails && selectedApplication && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedApplication.applicant.firstName} {selectedApplication.applicant.lastName}
                    </h2>
                    <p className="text-gray-600">Application for {selectedApplication.property.title}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setShowDetails(false)}>
                    ✕
                  </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Applicant Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium">{selectedApplication.applicant.email}</p>
                    </div>
                    {selectedApplication.applicant.phone && (
                      <div>
                        <label className="text-sm text-gray-600">Phone</label>
                        <p className="font-medium">{selectedApplication.applicant.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-600">Desired Move-in Date</label>
                      <p className="font-medium">{formatDate(selectedApplication.moveInDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Monthly Income</label>
                      <p className="font-medium">{formatCurrency(selectedApplication.monthlyIncome)}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Employer</label>
                      <p className="font-medium">{selectedApplication.employmentInfo.employer}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Position</label>
                      <p className="font-medium">{selectedApplication.employmentInfo.position}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Years Employed</label>
                      <p className="font-medium">{selectedApplication.employmentInfo.yearsEmployed}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Supervisor</label>
                      <p className="font-medium">{selectedApplication.employmentInfo.supervisorName}</p>
                      {selectedApplication.employmentInfo.supervisorPhone && (
                        <p className="text-sm text-gray-500">{selectedApplication.employmentInfo.supervisorPhone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* References */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">References</h3>
                  <div className="space-y-4">
                    {selectedApplication.references.map((reference, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm text-gray-600">Name</label>
                            <p className="font-medium">{reference.name}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Relationship</label>
                            <p className="font-medium">{reference.relationship}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Phone</label>
                            <p className="font-medium">{reference.phone}</p>
                          </div>
                          {reference.email && (
                            <div>
                              <label className="text-sm text-gray-600">Email</label>
                              <p className="font-medium">{reference.email}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedApplication.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p>{selectedApplication.notes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedApplication.status === 'PENDING' && (
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <Button
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'REJECTED')}
                      variant="outline"
                      disabled={updating === selectedApplication.id}
                    >
                      Reject Application
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedApplication.id, 'APPROVED')}
                      disabled={updating === selectedApplication.id}
                    >
                      Approve Application
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
