'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, FileText, User, Building } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { leaseService } from '@/services/leaseService';
import { toast } from 'react-hot-toast';

interface Application {
  id: string;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  property: {
    id: string;
    title: string;
    address: string;
    rentAmount: number;
    securityDeposit: number;
  };
  monthlyIncome?: number;
  status: string;
}

interface LeaseCreationDialogProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LEASE_TEMPLATES = [
  { id: '12_months', label: '12 Months (Standard)', duration: 12 },
  { id: '24_months', label: '24 Months (Long-term)', duration: 24 },
  { id: '6_months', label: '6 Months (Short-term)', duration: 6 },
  { id: 'custom', label: 'Custom Duration', duration: 0 }
];

export default function LeaseCreationDialog({
  application,
  isOpen,
  onClose,
  onSuccess
}: LeaseCreationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [leaseData, setLeaseData] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    template: '',
    customTerms: '',
    leaseDuration: ''
  });

  useEffect(() => {
    if (application && isOpen) {
      // Pre-populate with application data
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setLeaseData({
        startDate: format(tomorrow, 'yyyy-MM-dd'),
        endDate: '',
        monthlyRent: (application.property.rentAmount / 100).toString(),
        securityDeposit: (application.property.securityDeposit / 100).toString(),
        template: '12_months',
        customTerms: '',
        leaseDuration: '12'
      });
    }
  }, [application, isOpen]);

  useEffect(() => {
    if (leaseData.startDate && leaseData.template) {
      const startDate = new Date(leaseData.startDate);
      let endDate;
      
      if (leaseData.template === 'custom' && leaseData.leaseDuration) {
        endDate = addMonths(startDate, parseInt(leaseData.leaseDuration));
      } else {
        const template = LEASE_TEMPLATES.find(t => t.id === leaseData.template);
        if (template && template.duration > 0) {
          endDate = addMonths(startDate, template.duration);
        }
      }
      
      if (endDate) {
        setLeaseData(prev => ({
          ...prev,
          endDate: format(endDate, 'yyyy-MM-dd')
        }));
      }
    }
  }, [leaseData.startDate, leaseData.template, leaseData.leaseDuration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!application || !leaseData.startDate || !leaseData.endDate || !leaseData.monthlyRent || !leaseData.securityDeposit) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const terms = {
        template: leaseData.template,
        customTerms: leaseData.customTerms,
        createdFrom: 'application',
        applicationId: application.id
      };

      await leaseService.createLeaseFromApplication(application.id, {
        startDate: leaseData.startDate,
        endDate: leaseData.endDate,
        monthlyRent: Math.round(parseFloat(leaseData.monthlyRent) * 100),
        securityDeposit: Math.round(parseFloat(leaseData.securityDeposit) * 100),
        terms
      });

      toast.success('Lease created successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating lease:', error);
      toast.error('Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLeaseData({
      startDate: '',
      endDate: '',
      monthlyRent: '',
      securityDeposit: '',
      template: '',
      customTerms: '',
      leaseDuration: ''
    });
    onClose();
  };

  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Lease Agreement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Application Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Tenant</p>
                <p className="font-medium">
                  {application.applicant.firstName} {application.applicant.lastName}
                </p>
                <p className="text-gray-500">{application.applicant.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Property</p>
                <p className="font-medium">{application.property.title}</p>
                <p className="text-gray-500">{application.property.address}</p>
              </div>
            </div>
          </div>

          {/* Lease Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Lease Template *</Label>
            <Select value={leaseData.template} onValueChange={(value) => setLeaseData(prev => ({ ...prev, template: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select lease template" />
              </SelectTrigger>
              <SelectContent>
                {LEASE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Duration */}
          {leaseData.template === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="leaseDuration">Lease Duration (months) *</Label>
              <Input
                id="leaseDuration"
                type="number"
                min="1"
                max="60"
                value={leaseData.leaseDuration}
                onChange={(e) => setLeaseData(prev => ({ ...prev, leaseDuration: e.target.value }))}
                placeholder="Enter duration in months"
              />
            </div>
          )}

          {/* Lease Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={leaseData.startDate}
                onChange={(e) => setLeaseData(prev => ({ ...prev, startDate: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={leaseData.endDate}
                onChange={(e) => setLeaseData(prev => ({ ...prev, endDate: e.target.value }))}
                min={leaseData.startDate}
                readOnly={leaseData.template !== 'custom'}
                className={leaseData.template !== 'custom' ? 'bg-gray-50' : ''}
              />
            </div>
          </div>

          {/* Financial Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Rent *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={leaseData.monthlyRent}
                  onChange={(e) => setLeaseData(prev => ({ ...prev, monthlyRent: e.target.value }))}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={leaseData.securityDeposit}
                  onChange={(e) => setLeaseData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Lease Summary */}
          {leaseData.startDate && leaseData.endDate && leaseData.monthlyRent && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-blue-900">Lease Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">Duration</p>
                  <p className="font-medium text-blue-900">
                    {Math.round((new Date(leaseData.endDate).getTime() - new Date(leaseData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Monthly Rent</p>
                  <p className="font-medium text-blue-900">${parseFloat(leaseData.monthlyRent || '0').toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-600">Total Lease Value</p>
                  <p className="font-medium text-blue-900">
                    ${(parseFloat(leaseData.monthlyRent || '0') * Math.round((new Date(leaseData.endDate).getTime() - new Date(leaseData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Terms */}
          <div className="space-y-2">
            <Label htmlFor="customTerms">Additional Terms (Optional)</Label>
            <Textarea
              id="customTerms"
              value={leaseData.customTerms}
              onChange={(e) => setLeaseData(prev => ({ ...prev, customTerms: e.target.value }))}
              placeholder="Enter any additional lease terms or conditions..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating Lease...' : 'Create Lease'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}