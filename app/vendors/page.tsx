'use client';

import { useState, useEffect } from 'react';
import { vendorService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Star, Phone, Mail, MapPin, Globe, Wrench, Clock, Users, Award } from 'lucide-react';

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
  _count: { maintenanceRequests: number };
  createdAt: string;
}

const SERVICE_TYPES = [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'CARPENTRY', 'PAINTING', 'FLOORING',
  'APPLIANCE_REPAIR', 'PEST_CONTROL', 'CLEANING', 'LANDSCAPING', 'ROOFING',
  'WINDOWS', 'GENERAL_HANDYMAN', 'LOCKSMITH', 'MASONRY', 'DRYWALL', 
  'TILE_WORK', 'EMERGENCY_REPAIR', 'OTHER'
];

const BOROUGHS = [
  'MANHATTAN', 'BROOKLYN', 'QUEENS', 'BRONX', 'STATEN_ISLAND'
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [boroughFilter, setBoroughFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  const { toast } = useToast();

  // Form state for adding vendor
  const [newVendor, setNewVendor] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
    specialties: [] as string[],
    serviceAreas: [] as string[],
    businessLicense: '',
    hourlyRate: '',
    emergencyRate: '',
    minimumCharge: ''
  });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (serviceTypeFilter) params.serviceType = serviceTypeFilter;
      if (boroughFilter) params.borough = boroughFilter;
      if (ratingFilter) params.rating = parseFloat(ratingFilter);

      const response = await vendorService.getVendors(params);
      setVendors(response.data.vendors || []);
      setPagination(response.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [pagination.page, searchTerm, serviceTypeFilter, boroughFilter, ratingFilter]);

  const handleAddVendor = async () => {
    try {
      const vendorData = {
        ...newVendor,
        hourlyRate: newVendor.hourlyRate ? parseFloat(newVendor.hourlyRate) : undefined,
        emergencyRate: newVendor.emergencyRate ? parseFloat(newVendor.emergencyRate) : undefined,
        minimumCharge: newVendor.minimumCharge ? parseFloat(newVendor.minimumCharge) : undefined,
      };

      await vendorService.createVendor(vendorData);
      
      toast({
        title: 'Success',
        description: 'Vendor added successfully'
      });

      setIsAddDialogOpen(false);
      setNewVendor({
        companyName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        description: '',
        specialties: [],
        serviceAreas: [],
        businessLicense: '',
        hourlyRate: '',
        emergencyRate: '',
        minimumCharge: ''
      });
      
      fetchVendors();
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast({
        title: 'Error',
        description: 'Failed to add vendor',
        variant: 'destructive'
      });
    }
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    if (checked) {
      setNewVendor(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    } else {
      setNewVendor(prev => ({
        ...prev,
        specialties: prev.specialties.filter(s => s !== specialty)
      }));
    }
  };

  const handleServiceAreaChange = (area: string, checked: boolean) => {
    if (checked) {
      setNewVendor(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, area]
      }));
    } else {
      setNewVendor(prev => ({
        ...prev,
        serviceAreas: prev.serviceAreas.filter(a => a !== area)
      }));
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600 mt-2">Manage your maintenance contractors and service providers</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={newVendor.companyName}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={newVendor.contactPerson}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, contactPerson: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={newVendor.website}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newVendor.description}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label>Specialties *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {SERVICE_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`specialty-${type}`}
                        checked={newVendor.specialties.includes(type)}
                        onCheckedChange={(checked) => handleSpecialtyChange(type, checked as boolean)}
                      />
                      <Label htmlFor={`specialty-${type}`} className="text-sm">
                        {formatServiceType(type)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Service Areas *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {BOROUGHS.map(borough => (
                    <div key={borough} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${borough}`}
                        checked={newVendor.serviceAreas.includes(borough)}
                        onCheckedChange={(checked) => handleServiceAreaChange(borough, checked as boolean)}
                      />
                      <Label htmlFor={`area-${borough}`} className="text-sm">
                        {borough.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={newVendor.hourlyRate}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, hourlyRate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyRate">Emergency Rate ($)</Label>
                  <Input
                    id="emergencyRate"
                    type="number"
                    step="0.01"
                    value={newVendor.emergencyRate}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, emergencyRate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="minimumCharge">Minimum Charge ($)</Label>
                  <Input
                    id="minimumCharge"
                    type="number"
                    step="0.01"
                    value={newVendor.minimumCharge}
                    onChange={(e) => setNewVendor(prev => ({ ...prev, minimumCharge: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="businessLicense">Business License</Label>
                <Input
                  id="businessLicense"
                  value={newVendor.businessLicense}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, businessLicense: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddVendor}
                  disabled={!newVendor.companyName || !newVendor.contactPerson || !newVendor.email || !newVendor.phone || newVendor.specialties.length === 0 || newVendor.serviceAreas.length === 0}
                >
                  Add Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Services</SelectItem>
              {SERVICE_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {formatServiceType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={boroughFilter} onValueChange={setBoroughFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Service Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Areas</SelectItem>
              {BOROUGHS.map(borough => (
                <SelectItem key={borough} value={borough}>
                  {borough.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Min Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Rating</SelectItem>
              <SelectItem value="4.5">4.5+ Stars</SelectItem>
              <SelectItem value="4.0">4.0+ Stars</SelectItem>
              <SelectItem value="3.5">3.5+ Stars</SelectItem>
              <SelectItem value="3.0">3.0+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vendor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{vendor.companyName}</CardTitle>
                    <p className="text-sm text-gray-600">{vendor.contactPerson}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {vendor.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {vendor.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{vendor.rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-600">({vendor.totalReviews} reviews)</span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{vendor.phone}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{vendor.email}</span>
                </div>
                
                {vendor.address && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{vendor.address}</span>
                  </div>
                )}
                
                {vendor.website && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Globe className="h-4 w-4" />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Website
                    </a>
                  </div>
                )}

                <div className="pt-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <Wrench className="h-4 w-4" />
                    <span>Specialties:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {vendor.specialties.slice(0, 3).map(specialty => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {formatServiceType(specialty)}
                      </Badge>
                    ))}
                    {vendor.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{vendor.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{vendor._count.maintenanceRequests} jobs</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(vendor.hourlyRate)}/hr</p>
                    {vendor.emergencyRate && (
                      <p className="text-xs text-gray-600">Emergency: {formatCurrency(vendor.emergencyRate)}/hr</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/vendors/${vendor.id}`}>View Details</a>
                  </Button>
                  <Button size="sm">
                    Contact Vendor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {vendors.length === 0 && !loading && (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-600">
            {searchTerm || serviceTypeFilter || boroughFilter || ratingFilter
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by adding your first vendor.'}
          </p>
        </div>
      )}
    </div>
  );
}