'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ConnectRefreshPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after a short delay
    const timer = setTimeout(() => {
      router.push('/dashboard/payments?tab=setup');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleContinueSetup = async () => {
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
        router.push('/dashboard/payments?tab=setup');
      }
    } catch (error) {
      console.error('Failed to create onboarding link:', error);
      router.push('/dashboard/payments?tab=setup');
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <RefreshCw className="h-10 w-10 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Setup Refresh Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg text-gray-700">
              Your payment setup session has expired or needs to be refreshed.
            </p>
            <p className="text-gray-600">
              Don't worry - this is normal! Let's continue where you left off.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              If you were in the middle of setting up your payment account, 
              you can continue the process by clicking the button below. 
              Your progress has been saved.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You'll be redirected to continue your setup</li>
                <li>• Complete any remaining verification steps</li>
                <li>• Your account will be activated for payments</li>
                <li>• Return to your payment dashboard when done</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleContinueSetup}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Continue Setup
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/dashboard/payments')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payments
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Redirecting automatically in a few seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}