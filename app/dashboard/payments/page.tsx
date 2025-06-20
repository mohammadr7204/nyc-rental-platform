'use client';

import { useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Users, TrendingUp, AlertCircle } from 'lucide-react';
import StripeConnect from '@/components/payments/StripeConnect';
import PaymentDashboard from '@/components/payments/PaymentDashboard';
import PaymentProcessor from '@/components/payments/PaymentProcessor';

export default function PaymentsPage() {
  const { user } = useUserContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [connectStatus, setConnectStatus] = useState<any>(null);

  if (!user) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please log in to access payment features.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLandlord = user.userType === 'LANDLORD' || user.userType === 'PROPERTY_MANAGER';
  const isRenter = user.userType === 'RENTER';

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">
            {isLandlord 
              ? 'Manage your payment setup and view earnings' 
              : 'View your payment history and make payments'
            }
          </p>
        </div>
      </div>

      {isLandlord ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="setup">Payment Setup</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Payment Setup</p>
                      <p className="text-lg font-semibold">
                        {connectStatus?.accountStatus === 'VERIFIED' ? 'Complete' : 'Incomplete'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-lg font-semibold">$0.00</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                      <p className="text-lg font-semibold">0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {connectStatus?.accountStatus !== 'VERIFIED' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Complete your payment setup to start receiving rent payments, security deposits, and application fees from tenants.
                  <button 
                    onClick={() => setActiveTab('setup')}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Set up now
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <PaymentDashboard userType={user.userType} />
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <StripeConnect 
              userId={user.id} 
              onStatusChange={setConnectStatus}
            />
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <PaymentDashboard userType={user.userType} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Payment History</TabsTrigger>
            <TabsTrigger value="make-payment">Make Payment</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            <PaymentDashboard userType={user.userType} />
          </TabsContent>

          <TabsContent value="make-payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Make a Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment functionality is available when you have an active application or lease agreement.
                      Visit the property details page to make application-related payments.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Payments</h3>
                    <p className="text-gray-600">
                      You don't have any pending payments at this time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}