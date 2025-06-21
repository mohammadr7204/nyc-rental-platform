'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { analyticsService } from '@/services/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Home,
  Users,
  Calendar,
  Target,
  AlertCircle,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';

interface PortfolioAnalytics {
  overview: {
    totalProperties: number;
    totalRevenue: number;
    occupancyRate: number;
    averageRent: number;
    totalMaintenanceCost: number;
    totalApplications: number;
    pendingApplications: number;
    yearlyRevenue: number;
  };
  properties: Array<{
    id: string;
    title: string;
    address: string;
    rentAmount: number;
    isOccupied: boolean;
    applicationCount: number;
    maintenanceCount: number;
    maintenanceCost: number;
    monthlyRevenue: number;
    roi: number;
  }>;
  trends: {
    monthlyRevenue: number[];
    applicationTrends: number[];
    maintenanceCosts: number[];
  };
  topPerformers: Array<{
    id: string;
    title: string;
    roi: number;
    monthlyRevenue: number;
  }>;
  lowPerformers: Array<{
    id: string;
    title: string;
    roi: number;
    monthlyRevenue: number;
  }>;
}

interface FinancialReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
  };
  income: {
    total: number;
    byType: Record<string, number>;
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      date: string;
      property: string;
      description?: string;
    }>;
  };
  expenses: {
    total: number;
    byPriority: Record<string, number>;
    transactions: Array<{
      id: string;
      amount: number;
      priority: string;
      date: string;
      property: string;
      description: string;
    }>;
  };
  properties: Array<{
    id: string;
    title: string;
    address: string;
    income: number;
    expenses: number;
    netIncome: number;
    rentAmount: number;
  }>;
}

interface MarketInsights {
  marketData: {
    averageRent: number;
    medianRent: number;
    priceRange: {
      min: number;
      max: number;
    };
    totalListings: number;
    borough: string;
    propertyType: string;
  };
  userComparison: {
    aboveMarket: number;
    atMarket: number;
    belowMarket: number;
  };
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
  priceDistribution: {
    under2000: number;
    between2000and3000: number;
    between3000and4000: number;
    over4000: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioAnalytics | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedBorough, setSelectedBorough] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const [portfolioRes, financialRes, marketRes] = await Promise.all([
        analyticsService.getPortfolioAnalytics(),
        analyticsService.getFinancialReport({
          startDate: getStartDate(timeRange),
          endDate: new Date().toISOString().split('T')[0]
        }),
        analyticsService.getMarketInsights({
          borough: selectedBorough || undefined
        })
      ]);

      setPortfolio(portfolioRes.data);
      setFinancialReport(financialRes.data);
      setMarketInsights(marketRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case '1month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
      case '3months':
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
      case '6months':
        return new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
      case '1year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
      default:
        return new Date(now.setMonth(now.getMonth() - 6)).toISOString().split('T')[0];
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedBorough]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
      case 'INFO':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your property portfolio</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Report</TabsTrigger>
          <TabsTrigger value="properties">Property Performance</TabsTrigger>
          <TabsTrigger value="market">Market Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Portfolio Overview Cards */}
          {portfolio && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                    <Home className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolio.overview.totalProperties}</div>
                    <p className="text-xs text-gray-600">
                      {formatPercent(portfolio.overview.occupancyRate)} occupied
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(portfolio.overview.totalRevenue)}</div>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(portfolio.overview.yearlyRevenue)} annually
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                    <Target className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(portfolio.overview.occupancyRate)}</div>
                    <p className="text-xs text-gray-600">
                      {portfolio.overview.totalProperties - Math.floor(portfolio.overview.totalProperties * portfolio.overview.occupancyRate / 100)} vacant
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                    <Users className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolio.overview.pendingApplications}</div>
                    <p className="text-xs text-gray-600">
                      {portfolio.overview.totalApplications} total applications
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top and Low Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Top Performers
                    </CardTitle>
                    <CardDescription>Properties with highest ROI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {portfolio.topPerformers.map((property) => (
                        <div key={property.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{property.title}</h4>
                            <p className="text-sm text-gray-600">{formatCurrency(property.monthlyRevenue)}/month</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">{formatPercent(property.roi)}</div>
                            <div className="text-xs text-gray-500">ROI</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                      Needs Attention
                    </CardTitle>
                    <CardDescription>Properties requiring focus</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {portfolio.lowPerformers.map((property) => (
                        <div key={property.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{property.title}</h4>
                            <p className="text-sm text-gray-600">
                              {property.monthlyRevenue > 0 ? `${formatCurrency(property.monthlyRevenue)}/month` : 'Vacant'}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600">{formatPercent(property.roi)}</div>
                            <div className="text-xs text-gray-500">ROI</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {financialReport && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialReport.summary.totalIncome)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(financialReport.summary.totalExpenses)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialReport.summary.netIncome)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                    <BarChart3 className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPercent(financialReport.summary.profitMargin)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Income and Expense Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Income Breakdown</CardTitle>
                    <CardDescription>Revenue by payment type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(financialReport.income.byType).map(([type, amount]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="capitalize">{type.replace('_', ' ').toLowerCase()}</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Costs by priority level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(financialReport.expenses.byPriority).map(([priority, amount]) => (
                        <div key={priority} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(priority)}>
                              {priority}
                            </Badge>
                          </div>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Property Financial Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Financial Performance</CardTitle>
                  <CardDescription>Income and expenses by property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {financialReport.properties.map((property) => (
                      <div key={property.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{property.title}</h4>
                            <p className="text-sm text-gray-600">{property.address}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatCurrency(property.netIncome)}
                            </div>
                            <div className="text-xs text-gray-500">Net Income</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(property.income)}
                            </div>
                            <div className="text-xs text-gray-500">Income</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-red-600">
                              {formatCurrency(property.expenses)}
                            </div>
                            <div className="text-xs text-gray-500">Expenses</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {formatCurrency(property.rentAmount)}
                            </div>
                            <div className="text-xs text-gray-500">Monthly Rent</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="properties" className="space-y-6">
          {portfolio && (
            <Card>
              <CardHeader>
                <CardTitle>Property Performance Overview</CardTitle>
                <CardDescription>Detailed performance metrics for each property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.properties.map((property) => (
                    <div key={property.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium text-lg">{property.title}</h4>
                          <p className="text-gray-600">{property.address}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant={property.isOccupied ? "default" : "secondary"}>
                              {property.isOccupied ? "Occupied" : "Vacant"}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {formatCurrency(property.rentAmount)}/month
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatPercent(property.roi)}
                          </div>
                          <div className="text-sm text-gray-500">ROI</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-lg font-semibold">{property.applicationCount}</div>
                          <div className="text-xs text-gray-500">Applications</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-lg font-semibold">{property.maintenanceCount}</div>
                          <div className="text-xs text-gray-500">Maintenance</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-lg font-semibold">
                            {formatCurrency(property.maintenanceCost)}
                          </div>
                          <div className="text-xs text-gray-500">Maintenance Cost</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-lg font-semibold">
                            {formatCurrency(property.monthlyRevenue)}
                          </div>
                          <div className="text-xs text-gray-500">Monthly Revenue</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          {marketInsights && (
            <>
              {/* Market Data Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Rent</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(marketInsights.marketData.averageRent)}</div>
                    <p className="text-xs text-gray-600">Market average</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Median Rent</CardTitle>
                    <Activity className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(marketInsights.marketData.medianRent)}</div>
                    <p className="text-xs text-gray-600">Market median</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Price Range</CardTitle>
                    <PieChart className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {formatCurrency(marketInsights.marketData.priceRange.min)} - {formatCurrency(marketInsights.marketData.priceRange.max)}
                    </div>
                    <p className="text-xs text-gray-600">Min - Max</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
                    <Home className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{marketInsights.marketData.totalListings}</div>
                    <p className="text-xs text-gray-600">Active listings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Portfolio Comparison and Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio vs Market</CardTitle>
                    <CardDescription>How your properties compare to market rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span>Above Market</span>
                        <span className="font-bold text-green-600">{marketInsights.userComparison.aboveMarket} properties</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span>At Market</span>
                        <span className="font-bold text-blue-600">{marketInsights.userComparison.atMarket} properties</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span>Below Market</span>
                        <span className="font-bold text-red-600">{marketInsights.userComparison.belowMarket} properties</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>AI-powered insights for your portfolio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {marketInsights.recommendations.map((rec, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{rec.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Price Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Price Distribution</CardTitle>
                  <CardDescription>Distribution of rental prices in the market</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {marketInsights.priceDistribution.under2000}
                      </div>
                      <div className="text-sm text-gray-600">Under $2,000</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {marketInsights.priceDistribution.between2000and3000}
                      </div>
                      <div className="text-sm text-gray-600">$2,000 - $3,000</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {marketInsights.priceDistribution.between3000and4000}
                      </div>
                      <div className="text-sm text-gray-600">$3,000 - $4,000</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {marketInsights.priceDistribution.over4000}
                      </div>
                      <div className="text-sm text-gray-600">Over $4,000</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
