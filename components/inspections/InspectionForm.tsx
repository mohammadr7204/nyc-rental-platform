'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, AlertTriangle, Info } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { propertyService, inspectionService } from '@/services/api';

interface InspectionFormProps {
  inspection?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

interface Property {
  id: string;
  title: string;
  address: string;
  borough: string;
}

const inspectionTypes = [
  { value: 'MOVE_IN', label: 'Move-In Inspection', description: 'Initial inspection before tenant moves in' },
  { value: 'MOVE_OUT', label: 'Move-Out Inspection', description: 'Final inspection after tenant moves out' },
  { value: 'ANNUAL', label: 'Annual Inspection', description: 'Yearly safety and maintenance inspection' },
  { value: 'MAINTENANCE', label: 'Maintenance Inspection', description: 'Inspection following maintenance work' },
  { value: 'COMPLIANCE', label: 'Compliance Inspection', description: 'Regulatory compliance inspection' }
];

export default function InspectionForm({ inspection, onSubmit, onCancel }: InspectionFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    inspection ? new Date(inspection.scheduledDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    inspection ? format(new Date(inspection.scheduledDate), 'HH:mm') : '10:00'
  );
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      propertyId: inspection?.property?.id || '',
      type: inspection?.type || '',
      notes: inspection?.notes || '',
      inspectorId: inspection?.inspectorId || ''
    }
  });

  const watchedPropertyId = watch('propertyId');
  const watchedType = watch('type');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      setValue('propertyId', selectedProperty);
    }
  }, [selectedProperty, setValue]);

  useEffect(() => {
    if (watchedPropertyId && selectedDate) {
      checkAvailability();
    }
  }, [watchedPropertyId, selectedDate]);

  const fetchProperties = async () => {
    try {
      const response = await propertyService.getMyProperties();
      setProperties(response.data || []);
      
      if (inspection?.property?.id) {
        setSelectedProperty(inspection.property.id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const checkAvailability = async () => {
    if (!watchedPropertyId || !selectedDate) return;

    try {
      setCheckingConflicts(true);
      const startDate = format(selectedDate, 'yyyy-MM-dd');
      const endDate = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      
      const response = await inspectionService.getAvailability(
        watchedPropertyId,
        startDate,
        endDate
      );
      
      const scheduledInspections = response.data.scheduledInspections || [];
      
      // Filter out current inspection if editing
      const filteredConflicts = inspection 
        ? scheduledInspections.filter((i: any) => i.id !== inspection.id)
        : scheduledInspections;
      
      setConflicts(filteredConflicts);
    } catch (error) {
      console.error('Error checking availability:', error);
      setConflicts([]);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const onFormSubmit = async (data: any) => {
    if (!selectedDate) {
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const formData = {
        ...data,
        scheduledDate: scheduledDateTime.toISOString(),
        inspectorId: data.inspectorId || null
      };

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedInspectionType = () => {
    return inspectionTypes.find(type => type.value === watchedType);
  };

  const hasConflicts = conflicts.length > 0;
  const isPastDate = selectedDate && isBefore(selectedDate, startOfDay(new Date()));

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="propertyId">Property *</Label>
          <Select
            value={selectedProperty}
            onValueChange={setSelectedProperty}
            disabled={!!inspection} // Disable editing property for existing inspections
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  <div>
                    <div className="font-medium">{property.title}</div>
                    <div className="text-sm text-gray-500">
                      {property.address}, {property.borough}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.propertyId && (
            <p className="text-sm text-red-600">Property selection is required</p>
          )}
        </div>

        {/* Inspection Type */}
        <div className="space-y-2">
          <Label htmlFor="type">Inspection Type *</Label>
          <Select
            value={watchedType}
            onValueChange={(value) => setValue('type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select inspection type" />
            </SelectTrigger>
            <SelectContent>
              {inspectionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-sm text-red-600">Inspection type is required</p>
          )}
          
          {getSelectedInspectionType() && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {getSelectedInspectionType()?.description}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Date and Time Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Inspection Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground",
                    isPastDate && "border-red-300 text-red-600"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {isPastDate && (
              <p className="text-sm text-red-600">Cannot schedule inspections in the past</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Inspection Time *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 18 }, (_, i) => {
                  const hour = Math.floor(i / 2) + 8; // Start from 8 AM
                  const minute = (i % 2) * 30; // 30-minute intervals
                  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                  return (
                    <SelectItem key={timeString} value={timeString}>
                      {format(new Date().setHours(hour, minute, 0, 0), 'h:mm a')}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Availability Check */}
        {selectedDate && watchedPropertyId && (
          <div className="space-y-2">
            {checkingConflicts ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>Checking availability...</AlertDescription>
              </Alert>
            ) : hasConflicts ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="font-medium mb-2">Scheduling Conflicts Detected</div>
                  <div className="space-y-1">
                    {conflicts.map((conflict: any) => (
                      <div key={conflict.id} className="text-sm">
                        • {conflict.type.replace('_', ' ')} inspection at{' '}
                        {format(new Date(conflict.scheduledDate), 'h:mm a')} ({conflict.status})
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm">
                    Consider choosing a different time or date.
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✓ No scheduling conflicts found for this date and property.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Inspector ID (optional) */}
        <div className="space-y-2">
          <Label htmlFor="inspectorId">Inspector ID (optional)</Label>
          <Input
            {...register('inspectorId')}
            placeholder="Enter inspector ID or leave blank"
          />
          <p className="text-sm text-gray-500">
            Leave blank if you'll be conducting the inspection yourself
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            {...register('notes')}
            placeholder="Enter any additional notes or instructions for the inspection..."
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedDate || isPastDate}
          >
            {loading ? 'Scheduling...' : inspection ? 'Update Inspection' : 'Schedule Inspection'}
          </Button>
        </div>
      </form>
    </div>
  );
}