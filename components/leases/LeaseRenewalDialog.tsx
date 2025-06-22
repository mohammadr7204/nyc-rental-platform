'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { format, addMonths, addYears, differenceInDays } from 'date-fns';
import { leaseService } from '@/services/leaseService';
import { toast } from 'react-hot-toast';

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  application: {
    property: {
      title: string;
      address: string;
      isRentStabilized?: boolean;
    };
    applicant: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface LeaseRenewalDialogProps {
  lease: Lease | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RENEWAL_TEMPLATES = [
  { id: 'same_terms', label: 'Same Terms (12 months)', duration: 12, rentIncrease: 0 },
  { id: 'market_adjustment', label: 'Market Adjustment (12 months)', duration: 12, rentIncrease: 3 },
  { id: 'long_term', label: 'Long-term (24 months)', duration: 24, rentIncrease: 2 },
  { id: 'short_term', label: 'Short-term (6 months)', duration: 6, rentIncrease: 5 },
  { id: 'custom', label: 'Custom Terms', duration: 0, rentIncrease: 0 }
];

export default function LeaseRenewalDialog({
  lease,
  isOpen,
  onClose,
  onSuccess
}: LeaseRenewalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [renewalData, setRenewalData] = useState({
    template: '',
    newEndDate: '',
    newMonthlyRent: '',
    rentIncrease: '',
    rentIncreaseType: 'percentage', // 'percentage' or 'amount'
    renewalTerms: '',
    duration: ''
  });

  useEffect(() => {
    if (lease && isOpen) {
      // Pre-populate with current lease data
      const currentEndDate = new Date(lease.endDate);
      const defaultNewEndDate = addMonths(currentEndDate, 12);
      
      setRenewalData({
        template: 'same_terms',
        newEndDate: format(defaultNewEndDate, 'yyyy-MM-dd'),
        newMonthlyRent: (lease.monthlyRent / 100).toString(),
        rentIncrease: '0',
        rentIncreaseType: 'percentage',
        renewalTerms: '',
        duration: '12'
      });
    }
  }, [lease, isOpen]);

  useEffect(() => {
    if (lease && renewalData.template) {
      const template = RENEWAL_TEMPLATES.find(t => t.id === renewalData.template);
      const currentEndDate = new Date(lease.endDate);
      
      if (template && template.duration > 0) {
        const newEndDate = addMonths(currentEndDate, template.duration);
        setRenewalData(prev => ({
          ...prev,
          newEndDate: format(newEndDate, 'yyyy-MM-dd'),
          duration: template.duration.toString(),
          rentIncrease: template.rentIncrease.toString()
        }));
      }
    }
  }, [lease, renewalData.template]);

  useEffect(() => {
    if (lease && renewalData.rentIncrease) {
      const currentRent = lease.monthlyRent / 100;
      let newRent = currentRent;
      
      if (renewalData.rentIncreaseType === 'percentage') {
        const increasePercent = parseFloat(renewalData.rentIncrease) || 0;
        newRent = currentRent * (1 + increasePercent / 100);
      } else {
        const increaseAmount = parseFloat(renewalData.rentIncrease) || 0;
        newRent = currentRent + increaseAmount;
      }
      
      setRenewalData(prev => ({
        ...prev,
        newMonthlyRent: newRent.toFixed(2)
      }));
    }
  }, [lease, renewalData.rentIncrease, renewalData.rentIncreaseType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lease || !renewalData.newEndDate || !renewalData.newMonthlyRent) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const terms = {
        template: renewalData.template,
        rentIncrease: parseFloat(renewalData.rentIncrease),
        rentIncreaseType: renewalData.rentIncreaseType,
        customTerms: renewalData.renewalTerms,
        originalLeaseId: lease.id
      };

      await leaseService.renewLease(lease.id, {
        newEndDate: renewalData.newEndDate,
        newMonthlyRent: Math.round(parseFloat(renewalData.newMonthlyRent) * 100),
        renewalTerms: terms
      });

      toast.success('Lease renewal created successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating lease renewal:', error);
      toast.error('Failed to create lease renewal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRenewalData({
      template: '',
      newEndDate: '',
      newMonthlyRent: '',
      rentIncrease: '',
      rentIncreaseType: 'percentage',
      renewalTerms: '',
      duration: ''
    });
    onClose();
  };

  const getDaysUntilExpiration = () => {
    if (!lease) return 0;
    return differenceInDays(new Date(lease.endDate), new Date());
  };

  const getRentIncreaseAmount = () => {
    if (!lease || !renewalData.rentIncrease) return 0;
    
    const currentRent = lease.monthlyRent / 100;
    const newRent = parseFloat(renewalData.newMonthlyRent);
    return newRent - currentRent;
  };

  if (!lease) return null;

  const daysUntilExpiration = getDaysUntilExpiration();
  const rentIncreaseAmount = getRentIncreaseAmount();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Create Lease Renewal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Lease Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Current Lease</h3>
              <div className="flex items-center gap-2">
                {daysUntilExpiration <= 30 && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Expires in {daysUntilExpiration} days
                  </Badge>
                )}
                {lease.application.property.isRentStabilized && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Rent Stabilized
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Tenant</p>
                <p className="font-medium">
                  {lease.application.applicant.firstName} {lease.application.applicant.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Current Rent</p>
                <p className="font-medium">${(lease.monthlyRent / 100).toLocaleString()}/month</p>
              </div>
              <div>
                <p className="text-gray-600">Expires</p>
                <p className="font-medium">{format(new Date(lease.endDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Renewal Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Renewal Template *</Label>
            <Select value={renewalData.template} onValueChange={(value) => setRenewalData(prev => ({ ...prev, template: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select renewal template" />
              </SelectTrigger>
              <SelectContent>
                {RENEWAL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Duration */}
          {renewalData.template === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Renewal Duration (months) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="60"
                value={renewalData.duration}
                onChange={(e) => {
                  const duration = e.target.value;
                  const newEndDate = addMonths(new Date(lease.endDate), parseInt(duration) || 0);
                  setRenewalData(prev => ({
                    ...prev,
                    duration,
                    newEndDate: format(newEndDate, 'yyyy-MM-dd')
                  }));
                }}
                placeholder="Enter duration in months"
              />
            </div>
          )}

          {/* New End Date */}
          <div className="space-y-2">
            <Label htmlFor="newEndDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              New End Date *
            </Label>
            <Input
              id="newEndDate"
              type="date"
              value={renewalData.newEndDate}
              onChange={(e) => setRenewalData(prev => ({ ...prev, newEndDate: e.target.value }))}
              min={format(new Date(lease.endDate), 'yyyy-MM-dd')}
              readOnly={renewalData.template !== 'custom'}
              className={renewalData.template !== 'custom' ? 'bg-gray-50' : ''}
            />
          </div>

          {/* Rent Adjustment */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rent Adjustment
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentIncreaseType">Increase Type</Label>
                <Select value={renewalData.rentIncreaseType} onValueChange={(value) => setRenewalData(prev => ({ ...prev, rentIncreaseType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentIncrease">
                  {renewalData.rentIncreaseType === 'percentage' ? 'Increase %' : 'Increase Amount'}
                </Label>
                <div className="relative">
                  {renewalData.rentIncreaseType === 'amount' && (
                    <span className="absolute left-3 top-3 text-gray-500">$</span>
                  )}
                  <Input
                    id="rentIncrease"
                    type="number"
                    min="0"
                    step={renewalData.rentIncreaseType === 'percentage' ? '0.1' : '0.01'}
                    value={renewalData.rentIncrease}
                    onChange={(e) => setRenewalData(prev => ({ ...prev, rentIncrease: e.target.value }))}
                    className={renewalData.rentIncreaseType === 'amount' ? 'pl-8' : ''}
                    placeholder="0"
                  />
                  {renewalData.rentIncreaseType === 'percentage' && (
                    <span className="absolute right-3 top-3 text-gray-500">%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newMonthlyRent">New Monthly Rent *</Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <Input
                  id="newMonthlyRent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={renewalData.newMonthlyRent}
                  onChange={(e) => setRenewalData(prev => ({ ...prev, newMonthlyRent: e.target.value }))}
                  className="pl-8 font-medium"
                  placeholder="0.00"
                />
              </div>
              {rentIncreaseAmount !== 0 && (
                <p className={`text-sm ${rentIncreaseAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {rentIncreaseAmount > 0 ? '+' : ''}${rentIncreaseAmount.toFixed(2)} per month
                </p>
              )}
            </div>
          </div>

          {/* Rent Stabilization Warning */}
          {lease.application.property.isRentStabilized && parseFloat(renewalData.rentIncrease) > 3 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Rent Stabilization Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This property is rent stabilized. Rent increases may be subject to NYC Rent Guidelines Board limits. 
                    Please verify the maximum allowable increase before finalizing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Renewal Summary */}
          {renewalData.newEndDate && renewalData.newMonthlyRent && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-blue-900">Renewal Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">New Duration</p>
                  <p className="font-medium text-blue-900">
                    {Math.round((new Date(renewalData.newEndDate).getTime() - new Date(lease.endDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Monthly Rent</p>
                  <p className="font-medium text-blue-900">${parseFloat(renewalData.newMonthlyRent).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-600">Total Value</p>
                  <p className="font-medium text-blue-900">
                    ${(parseFloat(renewalData.newMonthlyRent) * Math.round((new Date(renewalData.newEndDate).getTime() - new Date(lease.endDate).getTime()) / (1000 * 60 * 60 * 24 * 30))).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Terms */}
          <div className="space-y-2">
            <Label htmlFor="renewalTerms">Additional Renewal Terms (Optional)</Label>
            <Textarea
              id="renewalTerms"
              value={renewalData.renewalTerms}
              onChange={(e) => setRenewalData(prev => ({ ...prev, renewalTerms: e.target.value }))}
              placeholder="Enter any additional terms or changes for the renewal..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating Renewal...' : 'Create Renewal'}
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