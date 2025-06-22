'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { inspectionService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, MapPin, Search, Plus, Eye, Edit, Trash2, Camera, FileText, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import InspectionForm from '@/components/inspections/InspectionForm';
import InspectionDetail from '@/components/inspections/InspectionDetail';

interface Inspection {
  id: string;
  type: string;
  scheduledDate: string;
  completedDate?: string;
  status: string;
  notes?: string;
  photos: string[];
  report?: any;
  inspectorId?: string;
  property: {
    id: string;
    title: string;
    address: string;
    borough: string;
  };
}

interface InspectionStats {
  totalInspections: number;
  scheduledInspections: number;
  upcomingInspections: number;
  completedThisMonth: number;
  overdueInspections: number;
}

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200'
};

const typeLabels = {
  MOVE_IN: 'Move-In',
  MOVE_OUT: 'Move-Out',
  ANNUAL: 'Annual',
  MAINTENANCE: 'Maintenance',
  COMPLIANCE: 'Compliance'
};

const priorityColors = {
  SCHEDULED: 'text-blue-600',
  IN_PROGRESS: 'text-yellow-600',
  COMPLETED: 'text-green-600',
  CANCELLED: 'text-gray-600'
};

export default function InspectionsPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [stats, setStats] = useState<InspectionStats>({
    totalInspections: 0,
    scheduledInspections: 0,
    upcomingInspections: 0,
    completedThisMonth: 0,
    overdueInspections: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (user?.userType === 'LANDLORD') {
      fetchInspections();
      fetchStats();
    }
  }, [user, currentPage, statusFilter, typeFilter]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 10
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter.toUpperCase();
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter.toUpperCase();
      }

      const response = await inspectionService.getInspections(params);
      setInspections(response.data.inspections || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inspections',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await inspectionService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching inspection stats:', error);
    }
  };

  const handleCreateInspection = async (data: any) => {
    try {
      await inspectionService.createInspection(data);
      toast({
        title: 'Success',
        description: 'Inspection scheduled successfully'
      });
      setShowCreateForm(false);
      fetchInspections();
      fetchStats();
    } catch (error) {
      console.error('Error creating inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule inspection',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateInspection = async (id: string, data: any) => {
    try {
      await inspectionService.updateInspection(id, data);
      toast({
        title: 'Success',
        description: 'Inspection updated successfully'
      });
      fetchInspections();
      fetchStats();
      setSelectedInspection(null);
      setShowDetailView(false);
    } catch (error) {
      console.error('Error updating inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inspection',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteInspection = async (id: string) => {
    try {
      await inspectionService.deleteInspection(id);
      toast({
        title: 'Success',
        description: 'Inspection deleted successfully'
      });
      fetchInspections();
      fetchStats();
    } catch (error) {
      console.error('Error deleting inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete inspection',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Calendar className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const isOverdue = (scheduledDate: string, status: string) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;
    return isBefore(parseISO(scheduledDate), new Date());
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = 
      inspection.property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (user?.userType !== 'LANDLORD') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Only landlords can access the inspection management system.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Inspections</h1>
          <p className="text-gray-600 mt-2">Schedule and manage property inspections</p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Inspection</DialogTitle>
            </DialogHeader>
            <InspectionForm
              onSubmit={handleCreateInspection}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInspections}</p>
                <p className="text-sm text-gray-600">Total Inspections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledInspections}</p>
                <p className="text-sm text-gray-600">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingInspections}</p>
                <p className="text-sm text-gray-600">Upcoming (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completedThisMonth}</p>
                <p className="text-sm text-gray-600">Completed This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueInspections}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search inspections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="move_in">Move-In</SelectItem>
                <SelectItem value="move_out">Move-Out</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspections List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading inspections...</p>
        </div>
      ) : filteredInspections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No inspections found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No inspections match your current filters.'
                : 'Schedule your first property inspection to get started.'}
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Inspection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInspections.map((inspection) => (
            <Card key={inspection.id} className={`transition-shadow hover:shadow-md ${isOverdue(inspection.scheduledDate, inspection.status) ? 'border-red-200' : ''}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={statusColors[inspection.status as keyof typeof statusColors]}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(inspection.status)}
                          <span>{inspection.status.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                      <Badge variant="outline">
                        {typeLabels[inspection.type as keyof typeof typeLabels]}
                      </Badge>
                      {isOverdue(inspection.scheduledDate, inspection.status) && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {inspection.property.title}
                    </h3>

                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{inspection.property.address}, {inspection.property.borough}</span>
                    </div>

                    <div className="flex items-center text-gray-600 mb-3">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {format(parseISO(inspection.scheduledDate), 'PPp')}
                      </span>
                      {inspection.completedDate && (
                        <>
                          <span className="mx-2">•</span>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          <span className="text-sm">
                            Completed: {format(parseISO(inspection.completedDate), 'PPp')}
                          </span>
                        </>
                      )}
                    </div>

                    {inspection.notes && (
                      <p className="text-sm text-gray-600 mb-3">{inspection.notes}</p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {inspection.photos.length > 0 && (
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          <span>{inspection.photos.length} photo{inspection.photos.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {inspection.report && (
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          <span>Report available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInspection(inspection);
                        setShowDetailView(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    {inspection.status !== 'COMPLETED' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this inspection? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInspection(inspection.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Inspection Detail Dialog */}
      <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inspection Details</DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <InspectionDetail
              inspection={selectedInspection}
              onUpdate={(data) => handleUpdateInspection(selectedInspection.id, data)}
              onClose={() => {
                setShowDetailView(false);
                setSelectedInspection(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}