'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  MapPin, 
  Clock, 
  Edit3, 
  Download,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Send
} from 'lucide-react';
import { format, differenceInDays, addMonths, addYears } from 'date-fns';
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
  terms: any;
  application: {
    property: {
      id: string;
      title: string;
      address: string;
      borough: string;
      owner: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
      };
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
  updatedAt: string;
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

export default function LeaseDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const leaseId = params.id as string;
  
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    documentUrl: ''
  });
  
  const [renewalData, setRenewalData] = useState({
    newEndDate: '',
    newMonthlyRent: '',
    renewalTerms: ''
  });
  
  const [terminationData, setTerminationData] = useState({
    terminationDate: '',
    reason: '',
    refundDeposit: false
  });

  useEffect(() => {
    if (user?.userType !== 'LANDLORD') {
      router.push('/dashboard');
      return;
    }
    fetchLease();
  }, [user, leaseId]);

  const fetchLease = async () => {
    try {
      setLoading(true);
      const data = await leaseService.getLeaseById(leaseId);
      setLease(data);
    } catch (error) {
      console.error('Error fetching lease:', error);
      toast.error('Failed to fetch lease details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!lease || !statusUpdate.status) return;
    
    try {
      setUpdating(true);
      await leaseService.updateLease(lease.id, {
        status: statusUpdate.status,
        documentUrl: statusUpdate.documentUrl || undefined
      });
      toast.success('Lease status updated successfully');
      setShowStatusDialog(false);
      fetchLease();
    } catch (error) {
      console.error('Error updating lease status:', error);
      toast.error('Failed to update lease status');
    } finally {
      setUpdating(false);
    }
  };

  const handleRenewal = async () => {
    if (!lease || !renewalData.newEndDate) return;
    
    try {
      setUpdating(true);
      await leaseService.renewLease(lease.id, {
        newEndDate: renewalData.newEndDate,
        newMonthlyRent: renewalData.newMonthlyRent ? parseInt(renewalData.newMonthlyRent) * 100 : undefined,
        renewalTerms: renewalData.renewalTerms ? JSON.parse(renewalData.renewalTerms) : undefined
      });
      toast.success('Lease renewal created successfully');
      setShowRenewalDialog(false);
      router.push('/leases');
    } catch (error) {
      console.error('Error creating lease renewal:', error);
      toast.error('Failed to create lease renewal');
    } finally {
      setUpdating(false);
    }
  };

  const handleTermination = async () => {
    if (!lease || !terminationData.terminationDate || !terminationData.reason) return;
    
    try {
      setUpdating(true);
      await leaseService.terminateLease(lease.id, {
        terminationDate: terminationData.terminationDate,
        reason: terminationData.reason,
        refundDeposit: terminationData.refundDeposit
      });
      toast.success('Lease terminated successfully');
      setShowTerminationDialog(false);
      fetchLease();
    } catch (error) {
      console.error('Error terminating lease:', error);
      toast.error('Failed to terminate lease');
    } finally {
      setUpdating(false);
    }
  };

  const getExpirationStatus = () => {
    if (!lease || lease.status !== 'ACTIVE') return null;
    
    const daysUntil = differenceInDays(new Date(lease.endDate), new Date());
    if (daysUntil < 0) return { label: 'Expired', color: 'bg-red-100 text-red-800', urgent: true };
    if (daysUntil <= 30) return { label: `${daysUntil} days left`, color: 'bg-red-100 text-red-800', urgent: true };
    if (daysUntil <= 90) return { label: `${daysUntil} days left`, color: 'bg-yellow-100 text-yellow-800', urgent: false };
    return { label: `${daysUntil} days left`, color: 'bg-green-100 text-green-800', urgent: false };
  };

  if (user?.userType !== 'LANDLORD') {
    return null;
  }

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

  if (!lease) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lease not found</h1>
            <Link href="/leases">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leases
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const expirationStatus = getExpirationStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/leases">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lease Details</h1>
              <p className="text-gray-600">{lease.application.property.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Alert for expiring leases */}
        {expirationStatus?.urgent && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    This lease is expiring soon! Consider initiating the renewal process.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => setShowRenewalDialog(true)}
                >
                  Start Renewal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
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
                    <p className="font-semibold">{lease.application.property.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold">
                      {lease.application.property.address}, {lease.application.property.borough}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Landlord</p>
                    <p className="font-semibold">
                      {lease.application.property.owner.firstName} {lease.application.property.owner.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{lease.application.property.owner.email}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tenant Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Tenant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Tenant</p>
                    <p className="font-semibold">
                      {lease.application.applicant.firstName} {lease.application.applicant.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold">{lease.application.applicant.email}</p>
                  </div>
                  {lease.application.applicant.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">{lease.application.applicant.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lease Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Lease Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-semibold">{format(new Date(lease.startDate), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">End Date</p>
                      <p className="font-semibold">{format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lease Duration</p>
                    <p className="font-semibold">
                      {differenceInDays(new Date(lease.endDate), new Date(lease.startDate))} days
                    </p>
                  </div>
                  {lease.signedAt && (
                    <div>
                      <p className="text-sm text-gray-600">Signed Date</p>
                      <p className="font-semibold">{format(new Date(lease.signedAt), 'MMM dd, yyyy')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setShowStatusDialog(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                    
                    {lease.status === 'ACTIVE' && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => setShowRenewalDialog(true)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renew Lease
                      </Button>
                    )}
                    
                    {(lease.status === 'ACTIVE' || lease.status === 'PENDING_SIGNATURE') && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => setShowTerminationDialog(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Terminate Lease
                      </Button>
                    )}
                    
                    {lease.documentUrl && (
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Download Document
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="text-2xl font-bold">${(lease.monthlyRent / 100).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Security Deposit</p>
                    <p className="text-xl font-semibold">${(lease.securityDeposit / 100).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Lease Value</p>
                    <p className="text-xl font-semibold">
                      ${((lease.monthlyRent * differenceInDays(new Date(lease.endDate), new Date(lease.startDate)) / 30) / 100).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Upcoming rent payments</p>
                  <div className="space-y-2">
                    {/* This would be populated with actual payment data */}
                    <div className="text-sm text-gray-500">
                      Payment tracking feature coming soon...
                    </div>
                  </div>
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
                <div className="space-y-4">
                  {lease.documentUrl ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-medium">Lease Agreement</p>
                          <p className="text-sm text-gray-600">Signed lease document</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No documents</h3>
                      <p className="text-gray-600">Lease documents will appear here when uploaded.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Lease History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border-l-4 border-blue-500 bg-blue-50">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Lease Created</p>
                      <p className="text-sm text-gray-600">{format(new Date(lease.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  
                  {lease.signedAt && (
                    <div className="flex items-start gap-3 p-4 border-l-4 border-green-500 bg-green-50">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Lease Signed</p>
                        <p className="text-sm text-gray-600">{format(new Date(lease.signedAt), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                  )}
                  
                  {lease.status === 'TERMINATED' && lease.terms?.terminatedAt && (
                    <div className="flex items-start gap-3 p-4 border-l-4 border-red-500 bg-red-50">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Lease Terminated</p>
                        <p className="text-sm text-gray-600">{format(new Date(lease.terms.terminatedAt), 'MMM dd, yyyy HH:mm')}</p>
                        {lease.terms?.terminationReason && (
                          <p className="text-sm text-gray-600 mt-1">
                            Reason: {lease.terms.terminationReason}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Lease Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={statusUpdate.status} onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documentUrl">Document URL (Optional)</Label>
                <Input
                  id="documentUrl"
                  value={statusUpdate.documentUrl}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, documentUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleStatusUpdate} disabled={updating || !statusUpdate.status}>
                  {updating ? 'Updating...' : 'Update Status'}
                </Button>
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Renewal Dialog */}
        <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Lease Renewal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newEndDate">New End Date</Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={renewalData.newEndDate}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, newEndDate: e.target.value }))}
                  min={format(addMonths(new Date(lease.endDate), 1), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="newMonthlyRent">New Monthly Rent (Optional)</Label>
                <Input
                  id="newMonthlyRent"
                  type="number"
                  value={renewalData.newMonthlyRent}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, newMonthlyRent: e.target.value }))}
                  placeholder={(lease.monthlyRent / 100).toString()}
                />
              </div>
              <div>
                <Label htmlFor="renewalTerms">Additional Terms (JSON, Optional)</Label>
                <Textarea
                  id="renewalTerms"
                  value={renewalData.renewalTerms}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, renewalTerms: e.target.value }))}
                  placeholder='{ "petPolicy": "allowed" }'
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleRenewal} disabled={updating || !renewalData.newEndDate}>
                  {updating ? 'Creating...' : 'Create Renewal'}
                </Button>
                <Button variant="outline" onClick={() => setShowRenewalDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Termination Dialog */}
        <Dialog open={showTerminationDialog} onOpenChange={setShowTerminationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Terminate Lease</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="terminationDate">Termination Date</Label>
                <Input
                  id="terminationDate"
                  type="date"
                  value={terminationData.terminationDate}
                  onChange={(e) => setTerminationData(prev => ({ ...prev, terminationDate: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={format(new Date(lease.endDate), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="reason">Reason for Termination</Label>
                <Textarea
                  id="reason"
                  value={terminationData.reason}
                  onChange={(e) => setTerminationData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter reason for lease termination..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="refundDeposit"
                  checked={terminationData.refundDeposit}
                  onChange={(e) => setTerminationData(prev => ({ ...prev, refundDeposit: e.target.checked }))}
                />
                <Label htmlFor="refundDeposit">Refund security deposit</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleTermination} 
                  disabled={updating || !terminationData.terminationDate || !terminationData.reason}
                  variant="destructive"
                >
                  {updating ? 'Terminating...' : 'Terminate Lease'}
                </Button>
                <Button variant="outline" onClick={() => setShowTerminationDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}