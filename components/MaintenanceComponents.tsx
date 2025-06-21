'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Upload, 
  X, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  User,
  Users,
  Star,
  Phone,
  Mail
} from 'lucide-react';
import { maintenanceService, vendorService } from '@/services/api';
import { toast } from 'react-hot-toast';

interface Property {
  id: string;
  title: string;
  address: string;
}

interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  specialties: string[];
  rating?: number;
  totalReviews: number;
  hourlyRate?: number;
  isVerified: boolean;
}

interface MaintenanceRequestFormProps {
  properties: Property[];
  onSuccess?: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low Priority', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Medium Priority', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'High Priority', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
];

const STATUS_ICONS = {
  PENDING: { icon: Clock, color: 'text-yellow-500' },
  SCHEDULED: { icon: Calendar, color: 'text-blue-500' },
  IN_PROGRESS: { icon: Wrench, color: 'text-orange-500' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-500' },
  CANCELLED: { icon: X, color: 'text-gray-500' },
};

export function MaintenanceRequestForm({ properties, onSuccess }: MaintenanceRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: '',
    title: '',
    description: '',
    priority: 'MEDIUM'
  });
  const [photos, setPhotos] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await maintenanceService.createRequest({
        ...formData,
        photos
      });
      
      toast.success('Maintenance request submitted successfully');
      setOpen(false);
      setFormData({ propertyId: '', title: '', description: '', priority: 'MEDIUM' });
      setPhotos([]);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting maintenance request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Wrench className="h-4 w-4 mr-2" />
          Submit Maintenance Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Submit Maintenance Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label htmlFor="property">Property *</Label>
            <Select
              value={formData.propertyId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, propertyId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    <div>
                      <div className="font-medium">{property.title}</div>
                      <div className="text-sm text-gray-500">{property.address}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Issue Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Leaky Kitchen Faucet"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please describe the issue in detail..."
              rows={4}
              required
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos (Optional)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload photos (Max 5)
                  </p>
                </div>
              </label>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  photos: string[];
  cost?: number;
  scheduledDate?: string;
  completedAt?: string;
  createdAt: string;
  assignedVendorId?: string;
  assignedVendor?: Vendor;
  vendorNotes?: string;
  vendorEstimate?: number;
  property: {
    id: string;
    title: string;
    address: string;
  };
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface MaintenanceRequestCardProps {
  request: MaintenanceRequest;
  isLandlord?: boolean;
  onUpdate?: () => void;
}

export function MaintenanceRequestCard({ 
  request, 
  isLandlord = false, 
  onUpdate 
}: MaintenanceRequestCardProps) {
  const [updating, setUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: request.status,
    cost: request.cost?.toString() || '',
    scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString().slice(0, 16) : '',
    notes: ''
  });
  const [vendorAssignment, setVendorAssignment] = useState({
    vendorId: request.assignedVendorId || '',
    vendorNotes: request.vendorNotes || '',
    vendorEstimate: request.vendorEstimate?.toString() || ''
  });

  const priorityOption = PRIORITY_OPTIONS.find(p => p.value === request.priority);
  const StatusIcon = STATUS_ICONS[request.status as keyof typeof STATUS_ICONS]?.icon || Clock;
  const statusColor = STATUS_ICONS[request.status as keyof typeof STATUS_ICONS]?.color || 'text-gray-500';

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const response = await vendorService.getVendors({ limit: 50 });
      setVendors(response.data.vendors || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  useEffect(() => {
    if (showVendorDialog) {
      loadVendors();
    }
  }, [showVendorDialog]);

  const handleUpdate = async () => {
    if (!isLandlord) return;
    
    setUpdating(true);
    try {
      const data: any = { status: updateData.status };
      if (updateData.cost) data.cost = parseInt(updateData.cost);
      if (updateData.scheduledDate) data.scheduledDate = updateData.scheduledDate;
      if (updateData.notes) data.notes = updateData.notes;

      await maintenanceService.updateRequest(request.id, data);
      toast.success('Request updated successfully');
      setShowUpdateForm(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const handleVendorAssignment = async () => {
    if (!isLandlord) return;
    
    setUpdating(true);
    try {
      const data: any = {};
      if (vendorAssignment.vendorId) data.vendorId = vendorAssignment.vendorId;
      if (vendorAssignment.vendorNotes) data.vendorNotes = vendorAssignment.vendorNotes;
      if (vendorAssignment.vendorEstimate) data.vendorEstimate = parseFloat(vendorAssignment.vendorEstimate);

      await vendorService.assignVendor(request.id, data);
      toast.success(vendorAssignment.vendorId ? 'Vendor assigned successfully' : 'Vendor unassigned successfully');
      setShowVendorDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error assigning vendor:', error);
      toast.error('Failed to assign vendor');
    } finally {
      setUpdating(false);
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">{request.title}</h3>
            <span className={`text-sm font-medium ${priorityOption?.color}`}>
              {priorityOption?.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className="capitalize">{request.status.replace('_', ' ').toLowerCase()}</span>
          </div>
        </div>
        {isLandlord && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVendorDialog(true)}
            >
              <Users className="h-4 w-4 mr-1" />
              {request.assignedVendor ? 'Change Vendor' : 'Assign Vendor'}
            </Button>
            {request.status !== 'COMPLETED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpdateForm(!showUpdateForm)}
              >
                Update Status
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Assigned Vendor Info */}
      {request.assignedVendor && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Assigned Vendor</span>
                {request.assignedVendor.isVerified && (
                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-medium">{request.assignedVendor.companyName}</p>
                <p className="text-sm text-gray-600">{request.assignedVendor.contactPerson}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{request.assignedVendor.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span>{request.assignedVendor.email}</span>
                  </div>
                </div>
                {request.assignedVendor.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{request.assignedVendor.rating.toFixed(1)} ({request.assignedVendor.totalReviews} reviews)</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {request.assignedVendor.specialties.slice(0, 3).map(specialty => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {formatServiceType(specialty)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatCurrency(request.assignedVendor.hourlyRate)}/hr</p>
              {request.vendorEstimate && (
                <p className="text-sm text-gray-600">Est: ${request.vendorEstimate}</p>
              )}
            </div>
          </div>
          {request.vendorNotes && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-gray-700"><strong>Notes:</strong> {request.vendorNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Property & Tenant Info */}
      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <span className="font-medium">Property:</span> {request.property.title}
        </div>
        <div className="text-sm text-gray-600">{request.property.address}</div>
        {isLandlord && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{request.tenant.firstName} {request.tenant.lastName}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{request.tenant.email}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-gray-700">{request.description}</p>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <span className="font-medium">Created:</span>
          <div className="text-gray-600">
            {new Date(request.createdAt).toLocaleDateString()}
          </div>
        </div>
        {request.cost && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Cost:</span>
            <span>${request.cost}</span>
          </div>
        )}
        {request.scheduledDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Scheduled:</span>
            <span>{new Date(request.scheduledDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <div className="mb-4">
          <div className="font-medium text-sm mb-2">Photos:</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {request.photos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Issue photo ${index + 1}`}
                className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-75"
                onClick={() => window.open(photo, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Update Form */}
      {showUpdateForm && isLandlord && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                value={updateData.cost}
                onChange={(e) => setUpdateData(prev => ({ ...prev, cost: e.target.value }))}
                placeholder="Enter cost"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="datetime-local"
                value={updateData.scheduledDate}
                onChange={(e) => setUpdateData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpdateForm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Request'}
            </Button>
          </div>
        </div>
      )}

      {/* Vendor Assignment Dialog */}
      <Dialog open={showVendorDialog} onOpenChange={setShowVendorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vendor">Select Vendor</Label>
              <Select 
                value={vendorAssignment.vendorId} 
                onValueChange={(value) => setVendorAssignment(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No vendor assigned</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{vendor.companyName}</div>
                          <div className="text-sm text-gray-500">{vendor.contactPerson}</div>
                        </div>
                        <div className="text-right">
                          {vendor.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{vendor.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="text-sm">{formatCurrency(vendor.hourlyRate)}/hr</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="vendorNotes">Notes for Vendor</Label>
              <Textarea
                id="vendorNotes"
                value={vendorAssignment.vendorNotes}
                onChange={(e) => setVendorAssignment(prev => ({ ...prev, vendorNotes: e.target.value }))}
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
                value={vendorAssignment.vendorEstimate}
                onChange={(e) => setVendorAssignment(prev => ({ ...prev, vendorEstimate: e.target.value }))}
                placeholder="Optional estimate"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowVendorDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleVendorAssignment}
                disabled={updating}
              >
                {updating ? 'Assigning...' : 'Assign Vendor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}