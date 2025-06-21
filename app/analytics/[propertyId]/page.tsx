'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PropertyAnalytics from '@/components/PropertyAnalytics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const PropertyAnalyticsPage: React.FC = () => {
  const params = useParams();
  const { user } = useAuth();
  const propertyId = params?.propertyId as string;

  // Check if user is landlord
  if (user?.userType !== 'LANDLORD') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Property analytics are only available for landlords. Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Property ID is required to view analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <PropertyAnalytics propertyId={propertyId} />
      </div>
    </div>
  );
};

export default PropertyAnalyticsPage;
