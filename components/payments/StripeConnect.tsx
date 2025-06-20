'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ExternalLink, CreditCard, Bank } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  accountStatus: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requiresAction: boolean;
  bankAccountLast4?: string;
}

interface StripeConnectProps {
  userId?: string;
  onStatusChange?: (status: ConnectStatus) => void;
}

export default function StripeConnect({ userId, onStatusChange }: StripeConnectProps) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchConnectStatus = async () => {
    try {
      const response = await fetch('/api/payments/connect/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(result.data);
        onStatusChange?.(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch Connect status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment setup status',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createConnectAccount = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/payments/connect/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          businessType: 'individual'
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Stripe account created successfully'
        });
        await fetchConnectStatus();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Stripe account',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const startOnboarding = async () => {
    try {
      const response = await fetch('/api/payments/connect/onboarding-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = result.data.onboardingUrl;
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start onboarding');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start onboarding process',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchConnectStatus();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (!status?.hasAccount) return <Badge variant="outline">Not Started</Badge>;
    
    switch (status.accountStatus) {
      case 'VERIFIED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'RESTRICTED':
        return <Badge variant="destructive">Restricted</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Setup
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!status?.hasAccount ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Set up your payment account to receive rent payments, security deposits, and application fees directly from tenants.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What you'll need:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Bank account information</li>
                  <li>• Social Security Number or Tax ID</li>
                  <li>• Government-issued ID</li>
                  <li>• Phone number</li>
                </ul>
              </div>
              <Button 
                onClick={createConnectAccount} 
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? 'Creating Account...' : 'Set Up Payment Account'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {status.onboardingComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    Account Setup: {status.onboardingComplete ? 'Complete' : 'Incomplete'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {status.chargesEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    Accept Payments: {status.chargesEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {status.payoutsEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    Receive Payouts: {status.payoutsEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {status.bankAccountLast4 && (
                  <div className="flex items-center gap-2">
                    <Bank className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Bank Account: ****{status.bankAccountLast4}
                    </span>
                  </div>
                )}
              </div>

              {status.requiresAction && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Action Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your payment setup is incomplete. Complete the setup to receive payments from tenants.
                      </p>
                      <Button 
                        onClick={startOnboarding}
                        size="sm"
                        className="mt-3"
                        variant="outline"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Continue Setup
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {status.accountStatus === 'VERIFIED' && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">Payment Setup Complete</h4>
                      <p className="text-sm text-green-700">
                        You're ready to receive payments! Tenants can now pay rent, security deposits, and application fees directly to your account.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {status?.hasAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-mono text-xs">{status.accountId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span>2.9% per transaction</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payout Schedule:</span>
                <span>Daily (after 2-day hold)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}