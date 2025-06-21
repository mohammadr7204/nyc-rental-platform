'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  FileText,
  Building,
  DollarSign,
  Users,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsService } from '@/services/api';
import PortfolioAnalytics from '@/components/analytics/PortfolioAnalytics';
import FinancialReporting from '@/components/analytics/FinancialReporting';
import Link from 'next/link';

interface QuickStats {
  totalProperties: number;
  totalRevenue: number;
  occupancyRate: number;
  pendingApplications: number;
  urgentMaintenance: number;
  profitMargin: number;
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.userType === 'LANDLORD') {
      fetchQuickStats();
    }
  }, [user]);

  const fetchQuickStats = async () => {
    try {
      setLoading(true);
      const [portfolioResponse, financialResponse] = await Promise.all([
        analyticsService.getPortfolioAnalytics(),
        analyticsService.getFinancialReport()
      ]);

      const portfolio = portfolioResponse.data;
      const financial = financialResponse.data;

      setQuickStats({
        totalProperties: portfolio.overview.totalProperties,
        totalRevenue: portfolio.overview.totalRevenue,
        occupancyRate: portfolio.overview.occupancyRate,
        pendingApplications: portfolio.overview.pendingApplications,
        urgentMaintenance: 2, // This would come from maintenance API
        profitMargin: financial.summary.profitMargin
      });
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Redirect non-landlords
  if (user?.userType !== 'LANDLORD') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Analytics are only available for landlords. Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Property Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive insights into your rental portfolio performance
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Financial</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Properties</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats Overview */}
          {quickStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quickStats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(quickStats.occupancyRate)} occupied
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(quickStats.totalRevenue)}</div>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {formatPercentage(quickStats.profitMargin)} profit margin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quickStats.pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    applications + {quickStats.urgentMaintenance} urgent maintenance
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" 
                  onClick={() => setActiveTab('portfolio')}>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Portfolio Analysis
                </CardTitle>
                <CardDescription>
                  View comprehensive portfolio performance metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Key Insights</div>
                    <div className="text-xs">• Revenue trends</div>
                    <div className="text-xs">• Property performance</div>
                    <div className="text-xs">• Market comparison</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setActiveTab('financial')}>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Financial Reports
                </CardTitle>
                <CardDescription>
                  Generate detailed financial reports for tax and business planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Available Reports</div>
                    <div className="text-xs">• Income statements</div>
                    <div className="text-xs">• Expense tracking</div>
                    <div className="text-xs">• Tax preparation</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Building className="h-5 w-5 mr-2" />
                  Property Details
                </CardTitle>
                <CardDescription>
                  Deep dive into individual property performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Per Property</div>
                    <div className="text-xs">• Rental performance</div>
                    <div className="text-xs">• Maintenance history</div>
                    <div className="text-xs">• Application analytics</div>
                  </div>
                  <Link href="/properties">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Action Items
              </CardTitle>
              <CardDescription>Items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quickStats && quickStats.pendingApplications > 0 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-yellow-600 mr-3" />
                      <div>
                        <div className="font-medium">Pending Applications</div>
                        <div className="text-sm text-muted-foreground">
                          {quickStats.pendingApplications} applications awaiting review
                        </div>
                      </div>
                    </div>
                    <Link href="/applications">
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </Link>
                  </div>
                )}

                {quickStats && quickStats.urgentMaintenance > 0 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                    <div className="flex items-center">
                      <Wrench className="h-4 w-4 text-red-600 mr-3" />
                      <div>
                        <div className="font-medium">Urgent Maintenance</div>
                        <div className="text-sm text-muted-foreground">
                          {quickStats.urgentMaintenance} urgent requests require immediate attention
                        </div>
                      </div>
                    </div>
                    <Link href="/maintenance">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                )}

                {quickStats && quickStats.occupancyRate < 80 && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium">Low Occupancy Rate</div>
                        <div className="text-sm text-muted-foreground">
                          Current occupancy: {formatPercentage(quickStats.occupancyRate)}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setActiveTab('portfolio')}
                    >
                      Analyze
                    </Button>
                  </div>
                )}

                {(!quickStats || (quickStats.pendingApplications === 0 && quickStats.urgentMaintenance === 0 && quickStats.occupancyRate >= 80)) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-green-600 mb-2">✓</div>
                    No urgent action items at this time
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioAnalytics />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReporting />
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Property-Specific Analytics</CardTitle>
              <CardDescription>
                Select a property from your portfolio to view detailed analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Navigate to your properties page to view individual property analytics
              </p>
              <Link href="/properties">
                <Button>
                  View Properties
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
