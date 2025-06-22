'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Camera, 
  Upload, 
  FileText, 
  Edit, 
  Save, 
  X, 
  Download,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { inspectionService } from '@/services/api';

interface InspectionDetailProps {
  inspection: any;
  onUpdate: (data: any) => void;
  onClose: () => void;
}

const statusOptions = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
];

const typeLabels = {
  MOVE_IN: 'Move-In',
  MOVE_OUT: 'Move-Out',
  ANNUAL: 'Annual',
  MAINTENANCE: 'Maintenance',
  COMPLIANCE: 'Compliance'
};

export default function InspectionDetail({ inspection, onUpdate, onClose }: InspectionDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState(inspection.status);
  const [notes, setNotes] = useState(inspection.notes || '');
  const [completedDate, setCompletedDate] = useState(
    inspection.completedDate ? format(parseISO(inspection.completedDate), "yyyy-MM-dd'T'HH:mm") : ''
  );
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(inspection.report || {
    summary: '',
    items: [],
    recommendations: []
  });
  const [newReportItem, setNewReportItem] = useState({ area: '', condition: 'Good', notes: '' });
  const [newRecommendation, setNewRecommendation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      // Automatically set completed date if status is being set to COMPLETED
      if (newStatus === 'COMPLETED' && !completedDate) {
        const now = new Date().toISOString();
        updateData.completedDate = now;
        setCompletedDate(format(new Date(now), "yyyy-MM-dd'T'HH:mm"));
      }
      
      await onUpdate(updateData);
      setStatus(newStatus);
      toast({
        title: 'Success',
        description: 'Inspection status updated successfully'
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update inspection status',
        variant: 'destructive'
      });
    }
  };

  const handleSaveChanges = async () => {
    try {
      const updateData: any = {
        status,
        notes: notes.trim(),
        report: report.summary || report.items.length > 0 || report.recommendations.length > 0 ? report : null
      };

      if (completedDate) {
        updateData.completedDate = new Date(completedDate).toISOString();
      }

      await onUpdate(updateData);
      setEditMode(false);
      toast({
        title: 'Success',
        description: 'Inspection details updated successfully'
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const photoFiles = Array.from(files);
      
      // Validate file types and sizes
      const validFiles = photoFiles.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
        
        if (!isValidType) {
          toast({
            title: 'Invalid File',
            description: `${file.name} is not a valid image file`,
            variant: 'destructive'
          });
          return false;
        }
        
        if (!isValidSize) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds the 10MB limit`,
            variant: 'destructive'
          });
          return false;
        }
        
        return true;
      });

      if (validFiles.length === 0) return;

      await inspectionService.uploadPhotos(inspection.id, validFiles);
      
      toast({
        title: 'Success',
        description: `${validFiles.length} photo(s) uploaded successfully`
      });
      
      // Refresh the inspection data
      window.location.reload();
      
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload photos',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    try {
      await inspectionService.deletePhoto(inspection.id, photoIndex);
      toast({
        title: 'Success',
        description: 'Photo deleted successfully'
      });
      
      // Refresh the inspection data
      window.location.reload();
      
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        variant: 'destructive'
      });
    }
  };

  const addReportItem = () => {
    if (!newReportItem.area.trim()) return;
    
    setReport(prev => ({
      ...prev,
      items: [...prev.items, { ...newReportItem }]
    }));
    
    setNewReportItem({ area: '', condition: 'Good', notes: '' });
  };

  const removeReportItem = (index: number) => {
    setReport(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addRecommendation = () => {
    if (!newRecommendation.trim()) return;
    
    setReport(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, newRecommendation.trim()]
    }));
    
    setNewRecommendation('');
  };

  const removeRecommendation = (index: number) => {
    setReport(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = () => {
    return statusOptions.find(option => option.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const canEdit = status !== 'COMPLETED';

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos ({inspection.photos?.length || 0})</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inspection Details</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor()}>
                  {status.replace('_', ' ')}
                </Badge>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    {editMode ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Property Information */}
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <div>
                  <div className="font-medium text-gray-900">{inspection.property.title}</div>
                  <div className="text-sm">{inspection.property.address}, {inspection.property.borough}</div>
                </div>
              </div>

              {/* Type and Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Inspection Type</Label>
                  <p className="mt-1 text-gray-900">
                    {typeLabels[inspection.type as keyof typeof typeLabels]}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Scheduled Date</Label>
                  <div className="flex items-center space-x-1 mt-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      {format(parseISO(inspection.scheduledDate), 'PPp')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              {editMode && canEdit ? (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {status === 'COMPLETED' && (
                    <div>
                      <Label htmlFor="completedDate">Completion Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={completedDate}
                        onChange={(e) => setCompletedDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Add notes about the inspection..."
                    />
                  </div>

                  <Button onClick={handleSaveChanges} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Quick Status Update */}
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Label className="text-sm font-medium text-gray-500 w-full">Quick Actions:</Label>
                      {statusOptions
                        .filter(option => option.value !== status)
                        .map((option) => (
                          <Button
                            key={option.value}
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(option.value)}
                          >
                            {option.value === 'IN_PROGRESS' && <Clock className="h-4 w-4 mr-1" />}
                            {option.value === 'COMPLETED' && <CheckCircle className="h-4 w-4 mr-1" />}
                            Mark as {option.label}
                          </Button>
                        ))}
                    </div>
                  )}

                  {/* Completion Date */}
                  {inspection.completedDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Completed Date</Label>
                      <div className="flex items-center space-x-1 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-gray-900">
                          {format(parseISO(inspection.completedDate), 'PPp')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {inspection.notes && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Notes</Label>
                      <p className="mt-1 text-gray-900 whitespace-pre-wrap">{inspection.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Inspector Information */}
              {inspection.inspectorId && (
                <div className="flex items-center space-x-2 text-gray-600 pt-4 border-t">
                  <User className="h-4 w-4" />
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Inspector</Label>
                    <p className="text-gray-900">{inspection.inspectorId}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Inspection Photos</span>
                {canEdit && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photos'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files)}
                className="hidden"
              />

              {inspection.photos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {inspection.photos.map((photo: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Inspection photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      {canEdit && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeletePhoto(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No photos uploaded yet</p>
                  {canEdit && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First Photo
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  value={report.summary}
                  onChange={(e) => setReport(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Overall inspection summary..."
                  rows={3}
                  disabled={!editMode && !canEdit}
                />
              </div>

              {/* Inspection Items */}
              <div>
                <Label>Inspection Items</Label>
                <div className="space-y-3 mt-2">
                  {report.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <Label className="text-xs">Area</Label>
                          <p className="font-medium">{item.area}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Condition</Label>
                          <p className={`font-medium ${
                            item.condition === 'Good' ? 'text-green-600' :
                            item.condition === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                          }`}>{item.condition}</p>
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <p>{item.notes || 'N/A'}</p>
                        </div>
                      </div>
                      {(editMode || canEdit) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReportItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {(editMode || canEdit) && (
                    <div className="flex items-end space-x-2 p-3 border-2 border-dashed rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="area" className="text-xs">Area</Label>
                          <Input
                            value={newReportItem.area}
                            onChange={(e) => setNewReportItem(prev => ({ ...prev, area: e.target.value }))}
                            placeholder="e.g., Living Room"
                            size={10}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Condition</Label>
                          <Select
                            value={newReportItem.condition}
                            onValueChange={(value) => setNewReportItem(prev => ({ ...prev, condition: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Good">Good</SelectItem>
                              <SelectItem value="Fair">Fair</SelectItem>
                              <SelectItem value="Poor">Poor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="notes" className="text-xs">Notes</Label>
                          <Input
                            value={newReportItem.notes}
                            onChange={(e) => setNewReportItem(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                      <Button onClick={addReportItem} size="sm">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <Label>Recommendations</Label>
                <div className="space-y-2 mt-2">
                  {report.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <span className="flex-1 text-sm">{rec}</span>
                      {(editMode || canEdit) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecommendation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {(editMode || canEdit) && (
                    <div className="flex space-x-2">
                      <Input
                        value={newRecommendation}
                        onChange={(e) => setNewRecommendation(e.target.value)}
                        placeholder="Add a recommendation..."
                        onKeyPress={(e) => e.key === 'Enter' && addRecommendation()}
                      />
                      <Button onClick={addRecommendation} size="sm">
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Actions */}
              {(editMode || canEdit) && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inspection History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {format(parseISO(inspection.createdAt), 'PPp')}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {format(parseISO(inspection.updatedAt), 'PPp')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="flex justify-end pt-6 border-t mt-6">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}