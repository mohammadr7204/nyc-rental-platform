'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { vendorService, maintenanceService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, Star, Phone, Mail, MapPin, Globe, Award, Users, Clock, 
  DollarSign, Calendar, Wrench, MessageSquare, Plus, Edit3, Trash2 
} from 'lucide-react';

interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  description?: string;
  specialties: string[];
  serviceAreas: string[];
  isVerified: boolean;
  isActive: boolean;
  rating?: number;
  totalReviews: number;
  hourlyRate?: number;
  emergencyRate?: number;
  minimumCharge?: number;
  services: any[];
  reviews: any[];
  maintenanceRequests: any[];
  _count: { maintenanceRequests: number };
  createdAt: string;
}

const SERVICE_TYPES = [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'PAINTING', 'FLOORING',
  'APPLIANCE_REPAIR', 'PEST_CONTROL', 'CLEANING', 'LANDSCAPING', 'ROOFING',
  'WINDOWS', 'GENERAL_HANDYMAN', 'LOCKSMITH', 'MASONRY', 'DRYWALL', 
  'TILE_WORK', 'EMERGENCY_REPAIR', 'OTHER'
];

const PRICE_TYPES = ['HOURLY', 'FLAT_RATE', 'PER_SQFT', 'ESTIMATE_REQUIRED'];

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [isAddServiceDialogOpen, setIsAddServiceDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const { toast } = useToast();

  // Form states
  const [newService, setNewService] = useState({
    serviceType: '',
    description: '',
    basePrice: '',
    priceType: 'HOURLY',
    isEmergency: false
  });

  const [assignmentData, setAssignmentData] = useState({
    maintenanceRequestId: '',
    vendorNotes: '',
    vendorEstimate: ''
  });

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendor(vendorId);
      setVendor(response.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendor details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await maintenanceService.getRequests({ status: 'PENDING' });
      setMaintenanceRequests(response.data.data || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchVendor();
      fetchMaintenanceRequests();
    }
  }, [vendorId]);

  const handleAddService = async () => {
    if (!vendor) return;

    try {
      const serviceData = {
        ...newService,
        basePrice: newService.basePrice ? parseFloat(newService.basePrice) : undefined,
      };

      await vendorService.addVendorService(vendor.id, serviceData);
      
      toast({
        title: 'Success',
        description: 'Service added successfully'
      });

      setIsAddServiceDialogOpen(false);
      setNewService({
        serviceType: '',
        description: '',
        basePrice: '',
        priceType: 'HOURLY',
        isEmergency: false
      });
      
      fetchVendor();
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: 'Error',
        description: 'Failed to add service',
        variant: 'destructive'
      });
    }
  };

  const handleAssignVendor = async () => {
    if (!assignmentData.maintenanceRequestId) return;

    try {
      const data = {
        vendorId: vendor?.id,
        vendorNotes: assignmentData.vendorNotes,
        vendorEstimate: assignmentData.vendorEstimate ? parseFloat(assignmentData.vendorEstimate) : undefined,
      };

      await vendorService.assignVendor(assignmentData.maintenanceRequestId, data);
      
      toast({
        title: 'Success',
        description: 'Vendor assigned successfully'
      });

      setIsAssignDialogOpen(false);
      setAssignmentData({
        maintenanceRequestId: '',
        vendorNotes: '',
        vendorEstimate: ''
      });
      
      fetchVendor();
      fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error assigning vendor:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign vendor',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatServiceType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendor Not Found</h1>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{vendor.companyName}</h1>
        {vendor.isVerified && (
          <Badge variant="secondary">
            <Award className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Overview */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{vendor.companyName}</CardTitle>
                  <p className="text-gray-600 mt-1">Contact: {vendor.contactPerson}</p>
                  {vendor.rating && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-600">({vendor.totalReviews} reviews)</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCurrency(vendor.hourlyRate)}/hr</p>
                  {vendor.emergencyRate && (
                    <p className="text-sm text-gray-600">Emergency: {formatCurrency(vendor.emergencyRate)}/hr</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{vendor.email}</span>
                </div>
                {vendor.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{vendor.address}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              {vendor.description && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-gray-600">{vendor.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {vendor.specialties.map(specialty => (
                    <Badge key={specialty} variant="outline">
                      {formatServiceType(specialty)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Service Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {vendor.serviceAreas.map(area => (
                    <Badge key={area} variant="secondary">
                      {area.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Services, Reviews, Work History */}
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="history">Work History</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Services Offered</h3>
                <Dialog open={isAddServiceDialogOpen} onOpenChange={setIsAddServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Service</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serviceType">Service Type *</Label>
                        <Select value={newService.serviceType} onValueChange={(value) => setNewService(prev => ({ ...prev, serviceType: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_TYPES.map(type => (
                              <SelectItem key={type} value={type}>
                                {formatServiceType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newService.description}
                          onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="basePrice">Base Price ($)</Label>
                          <Input
                            id="basePrice"
                            type="number"
                            step="0.01"
                            value={newService.basePrice}
                            onChange={(e) => setNewService(prev => ({ ...prev, basePrice: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="priceType">Price Type</Label>
                          <Select value={newService.priceType} onValueChange={(value) => setNewService(prev => ({ ...prev, priceType: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRICE_TYPES.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type.replace('_', ' ')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsAddServiceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddService} disabled={!newService.serviceType}>
                          Add Service
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendor.services.map(service => (
                  <Card key={service.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{formatServiceType(service.serviceType)}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {service.priceType.replace('_', ' ')}
                            </Badge>
                            {service.isEmergency && (
                              <Badge variant="destructive" className="text-xs">
                                Emergency
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(service.basePrice)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {vendor.services.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No services added yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Reviews</h3>
              
              <div className="space-y-4">
                {vendor.reviews.map(review => (
                  <Card key={review.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{review.reviewer.firstName} {review.reviewer.lastName}</span>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.workType && (
                            <p className="text-sm text-gray-600">{review.workType}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {formatDate(review.createdAt)}
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                      )}
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Quality:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.workQuality ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Timeliness:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.timeliness ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Communication:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.communication ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Value:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {review.cost && (
                        <p className="text-sm text-gray-600 mt-2">
                          Total Cost: {formatCurrency(review.cost)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {vendor.reviews.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No reviews yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <h3 className="text-lg font-semibold">Work History</h3>
              
              <div className="space-y-4">
                {vendor.maintenanceRequests?.map(request => (
                  <Card key={request.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{request.title}</h4>
                          <p className="text-sm text-gray-600">{request.property?.title}</p>
                          <p className="text-sm text-gray-600">{request.property?.address}</p>
                          <Badge 
                            variant={request.status === 'COMPLETED' ? 'default' : 'secondary'}
                            className="mt-2"
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{formatDate(request.createdAt)}</p>
                          {request.cost && (
                            <p className="font-medium">{formatCurrency(request.cost)}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {(!vendor.maintenanceRequests || vendor.maintenanceRequests.length === 0) && (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No work history available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Jobs Completed</span>
                <span className="font-medium">{vendor._count.maintenanceRequests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Reviews</span>
                <span className="font-medium">{vendor.totalReviews}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium">{formatDate(vendor.createdAt)}</span>
              </div>
              {vendor.minimumCharge && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Minimum Charge</span>
                  <span className="font-medium">{formatCurrency(vendor.minimumCharge)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Vendor
              </Button>
              
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Assign to Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Vendor to Maintenance Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="maintenanceRequest">Maintenance Request *</Label>
                      <Select 
                        value={assignmentData.maintenanceRequestId} 
                        onValueChange={(value) => setAssignmentData(prev => ({ ...prev, maintenanceRequestId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a maintenance request" />
                        </SelectTrigger>
                        <SelectContent>
                          {maintenanceRequests.map((request: any) => (
                            <SelectItem key={request.id} value={request.id}>
                              {request.title} - {request.property?.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="vendorNotes">Notes for Vendor</Label>
                      <Textarea
                        id="vendorNotes"
                        value={assignmentData.vendorNotes}
                        onChange={(e) => setAssignmentData(prev => ({ ...prev, vendorNotes: e.target.value }))}
                        rows={3}
                        placeholder="Additional instructions or notes..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="vendorEstimate">Estimated Cost ($)</Label>
                      <Input
                        id="vendorEstimate"
                        type="number"
                        step="0.01"
                        value={assignmentData.vendorEstimate}
                        onChange={(e) => setAssignmentData(prev => ({ ...prev, vendorEstimate: e.target.value }))}
                        placeholder="Optional estimate"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAssignVendor}
                        disabled={!assignmentData.maintenanceRequestId}
                      >
                        Assign Vendor
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" className="w-full">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Vendor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}