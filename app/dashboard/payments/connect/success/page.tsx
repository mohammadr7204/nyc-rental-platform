'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, CreditCard, ArrowRight } from 'lucide-react';

export default function ConnectSuccessPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const router = useRouter();

  const checkAccountStatus = async () => {
    try {
      const response = await fetch('/api/payments/connect/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(result.data);
        setIsVerifying(false);
      }
    } catch (error) {
      console.error('Failed to check account status:', error);
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Small delay to allow Stripe webhook to process
    const timer = setTimeout(() => {
      checkAccountStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isVerifying) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="text-xl font-semibold">Verifying Your Account</h2>
              <p className="text-gray-600">
                Please wait while we confirm your payment setup...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSetupComplete = status?.accountStatus === 'VERIFIED' && status?.onboardingComplete;

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {isSetupComplete ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-10 w-10 text-yellow-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {isSetupComplete ? 'Payment Setup Complete!' : 'Setup In Progress'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSetupComplete ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-lg text-gray-700">
                  Congratulations! Your payment account is now active.
                </p>
                <p className="text-gray-600">
                  You can now receive rent payments, security deposits, and application fees directly from tenants.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">What's Next?</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Tenants can now make payments directly to your account</li>
                  <li>• Funds will be automatically transferred to your bank account</li>
                  <li>• View all transactions in your payment dashboard</li>
                  <li>• Platform fee: 2.9% per transaction</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => router.push('/dashboard/payments')}
                  className="flex-1"
                >
                  View Payment Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-lg text-gray-700">
                  Your payment setup is still in progress.
                </p>
                <p className="text-gray-600">
                  This may take a few minutes to complete. Please check back soon.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Account Status</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Onboarding Complete:</span>
                    <span className={status?.onboardingComplete ? 'text-green-600' : 'text-yellow-600'}>
                      {status?.onboardingComplete ? 'Yes' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Charges Enabled:</span>
                    <span className={status?.chargesEnabled ? 'text-green-600' : 'text-yellow-600'}>
                      {status?.chargesEnabled ? 'Yes' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payouts Enabled:</span>
                    <span className={status?.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'}>
                      {status?.payoutsEnabled ? 'Yes' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={checkAccountStatus}
                  variant="outline"
                  className="flex-1"
                >
                  Check Status Again
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard/payments')}
                  className="flex-1"
                >
                  Go to Payments
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}