'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  // Check if user is landlord
  if (user?.userType !== 'LANDLORD') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Analytics are only available for landlords. Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
};

export default AnalyticsPage;
