'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeaseCreationDialog from '@/components/leases/LeaseCreationDialog';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  DollarSign, 
  FileText, 
  Phone, 
  Mail, 
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  CreditCard,
  Shield,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { applicationService, paymentService } from '@/services/api';
import { toast } from 'react-hot-toast';

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  moveInDate: string;
  employmentInfo: any;
  references: any;
  documents: string[];
  creditScore?: number;
  monthlyIncome?: number;
  notes?: string;
  landlordNotes?: string;
  backgroundCheckStatus: string;
  backgroundCheckResults?: any;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    ssn?: string;
    annualIncome?: number;
    employmentStatus?: string;
    companyName?: string;
  };
  property: {
    id: string;
    title: string;
    address: string;
    borough: string;
    rentAmount: number;
    securityDeposit: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
  };
  payments: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: string;
  }>;
  lease?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
  };
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  WITHDRAWN: XCircle
};

export default function ApplicationDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;
  
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showLeaseDialog, setShowLeaseDialog] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const data = await applicationService.getApplicationById(applicationId);
      setApplication(data);
    } catch (error) {
      console.error('Error fetching application:', error);
      toast.error('Failed to fetch application details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    if (!application) return;
    
    try {
      setUpdating(true);
      await applicationService.updateApplicationStatus(application.id, {
        status: newStatus,
        landlordNotes: notes
      });
      toast.success(`Application ${newStatus.toLowerCase()} successfully`);
      fetchApplication();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application status');
    } finally {
      setUpdating(false);
    }
  };

  const initiateBackgroundCheck = async () => {
    if (!application) return;
    
    try {
      setUpdating(true);
      await applicationService.initiateBackgroundCheck(application.id);
      toast.success('Background check initiated');
      fetchApplication();
    } catch (error) {
      console.error('Error initiating background check:', error);
      toast.error('Failed to initiate background check');
    } finally {
      setUpdating(false);
    }
  };

  const handleLeaseCreated = () => {
    setShowLeaseDialog(false);
    fetchApplication();
    toast.success('Lease created successfully! Redirecting to lease management...');
    setTimeout(() => {
      router.push('/leases');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application not found</h1>
            <Link href="/applications">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Applications
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[application.status];
  const canCreateLease = user?.userType === 'LANDLORD' && application.status === 'APPROVED' && !application.lease;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/applications">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
              <p className="text-gray-600">{application.property.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[application.status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {application.status}
            </Badge>
            {application.lease && (
              <Badge className="bg-blue-100 text-blue-800">
                <FileText className="h-3 w-3 mr-1" />
                Lease Created
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions - Only for landlords */}
        {user?.userType === 'LANDLORD' && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                {application.status === 'PENDING' && (
                  <>
                    <Button 
                      onClick={() => handleStatusUpdate('APPROVED')}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Application
                    </Button>
                    <Button 
                      onClick={() => handleStatusUpdate('REJECTED', 'Application rejected by landlord')}
                      disabled={updating}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </Button>
                  </>
                )}
                
                {application.backgroundCheckStatus === 'PENDING' && (
                  <Button 
                    onClick={initiateBackgroundCheck}
                    disabled={updating}
                    variant="outline"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Run Background Check
                  </Button>
                )}
                
                {canCreateLease && (
                  <Button 
                    onClick={() => setShowLeaseDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create Lease
                  </Button>
                )}
                
                {application.lease && (
                  <Link href={`/leases/${application.lease.id}`}>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Lease
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applicant">Applicant</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Property Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-semibold">{application.property.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold">
                      {application.property.address}, {application.property.borough}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Bedrooms</p>
                      <p className="font-semibold">{application.property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bathrooms</p>
                      <p className="font-semibold">{application.property.bathrooms}</p>
                    </div>
                  </div>
                  {application.property.squareFeet && (
                    <div>
                      <p className="text-sm text-gray-600">Square Feet</p>
                      <p className="font-semibold">{application.property.squareFeet.toLocaleString()} sq ft</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Application Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Application Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Move-in Date</p>
                    <p className="font-semibold">{format(new Date(application.moveInDate), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Applied On</p>
                    <p className="font-semibold">{format(new Date(application.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Background Check</p>
                    <Badge className={application.backgroundCheckStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {application.backgroundCheckStatus}
                    </Badge>
                  </div>
                  {application.creditScore && (
                    <div>
                      <p className="text-sm text-gray-600">Credit Score</p>
                      <p className="font-semibold">{application.creditScore}</p>
                    </div>
                  )}
                  {application.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Applicant Notes</p>
                      <p className="text-sm">{application.notes}</p>
                    </div>
                  )}
                  {application.landlordNotes && (
                    <div>
                      <p className="text-sm text-gray-600">Landlord Notes</p>
                      <p className="text-sm">{application.landlordNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="applicant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Applicant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold">
                          {application.applicant.firstName} {application.applicant.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p className="font-semibold">{application.applicant.email}</p>
                        </div>
                      </div>
                      {application.applicant.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <p className="font-semibold">{application.applicant.phone}</p>
                          </div>
                        </div>
                      )}
                      {application.applicant.dateOfBirth && (
                        <div>
                          <p className="text-sm text-gray-600">Date of Birth</p>
                          <p className="font-semibold">
                            {format(new Date(application.applicant.dateOfBirth), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Employment Information</h3>
                    <div className="space-y-3">
                      {application.applicant.employmentStatus && (
                        <div>
                          <p className="text-sm text-gray-600">Employment Status</p>
                          <p className="font-semibold">{application.applicant.employmentStatus}</p>
                        </div>
                      )}
                      {application.applicant.companyName && (
                        <div>
                          <p className="text-sm text-gray-600">Company</p>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            <p className="font-semibold">{application.applicant.companyName}</p>
                          </div>
                        </div>
                      )}
                      {application.applicant.annualIncome && (
                        <div>
                          <p className="text-sm text-gray-600">Annual Income</p>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <p className="font-semibold">
                              ${(application.applicant.annualIncome / 100).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Employment Details */}
                {application.employmentInfo && Object.keys(application.employmentInfo).length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">Employment Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(application.employmentInfo, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* References */}
                {application.references && Object.keys(application.references).length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-900 mb-4">References</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(application.references, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rent & Deposit */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Rent & Deposit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="text-2xl font-bold">
                      ${(application.property.rentAmount / 100).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Security Deposit</p>
                    <p className="text-xl font-semibold">
                      ${(application.property.securityDeposit / 100).toLocaleString()}
                    </p>
                  </div>
                  {application.monthlyIncome && (
                    <div>
                      <p className="text-sm text-gray-600">Monthly Income (Reported)</p>
                      <p className="text-xl font-semibold">
                        ${(application.monthlyIncome / 100).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Income to Rent Ratio: {((application.monthlyIncome / application.property.rentAmount).toFixed(1))}x
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {application.payments.length > 0 ? (
                    <div className="space-y-3">
                      {application.payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{payment.type.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${(payment.amount / 100).toLocaleString()}
                            </p>
                            <Badge className={payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No payments yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {application.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {application.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">Document {index + 1}</p>
                            <p className="text-sm text-gray-600">Uploaded document</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents</h3>
                    <p className="text-gray-600">Application documents will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Application History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border-l-4 border-blue-500 bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Application Submitted</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(application.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {application.status !== 'PENDING' && (
                    <div className={`flex items-start gap-3 p-4 border-l-4 ${
                      application.status === 'APPROVED' ? 'border-green-500 bg-green-50' :
                      application.status === 'REJECTED' ? 'border-red-500 bg-red-50' :
                      'border-gray-500 bg-gray-50'
                    }`}>
                      <StatusIcon className={`h-5 w-5 mt-0.5 ${
                        application.status === 'APPROVED' ? 'text-green-600' :
                        application.status === 'REJECTED' ? 'text-red-600' :
                        'text-gray-600'
                      }`} />
                      <div>
                        <p className="font-medium">Application {application.status}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(application.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {application.landlordNotes && (
                          <p className="text-sm text-gray-600 mt-1">
                            Notes: {application.landlordNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {application.lease && (
                    <div className="flex items-start gap-3 p-4 border-l-4 border-purple-500 bg-purple-50">
                      <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Lease Created</p>
                        <p className="text-sm text-gray-600">
                          Lease term: {format(new Date(application.lease.startDate), 'MMM dd, yyyy')} - {format(new Date(application.lease.endDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lease Creation Dialog */}
        <LeaseCreationDialog
          application={application}
          isOpen={showLeaseDialog}
          onClose={() => setShowLeaseDialog(false)}
          onSuccess={handleLeaseCreated}
        />
      </div>
    </div>
  );
}