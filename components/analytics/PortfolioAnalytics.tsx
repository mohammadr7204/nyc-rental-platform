'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Home, 
  Users, 
  Wrench,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Eye,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { analyticsService } from '@/services/api';

interface PortfolioOverview {
  totalProperties: number;
  totalRevenue: number;
  occupancyRate: number;
  averageRent: number;
  totalMaintenanceCost: number;
  totalApplications: number;
  pendingApplications: number;
  yearlyRevenue: number;
}

interface PropertyPerformance {
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
}

interface PortfolioData {
  overview: PortfolioOverview;
  properties: PropertyPerformance[];
  trends: {
    monthlyRevenue: number[];
    applicationTrends: number[];
    maintenanceCosts: number[];
  };
  topPerformers: PropertyPerformance[];
  lowPerformers: PropertyPerformance[];
}

interface MarketInsights {
  marketData: {
    averageRent: number;
    medianRent: number;
    priceRange: { min: number; max: number };
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

const PortfolioAnalytics: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBorough, setSelectedBorough] = useState<string>('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('');

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    if (selectedBorough || selectedPropertyType) {
      fetchMarketInsights();
    }
  }, [selectedBorough, selectedPropertyType]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [portfolioResponse, marketResponse] = await Promise.all([
        analyticsService.getPortfolioAnalytics(),
        analyticsService.getMarketInsights()
      ]);

      setPortfolioData(portfolioResponse.data);
      setMarketInsights(marketResponse.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketInsights = async () => {
    try {
      const params: any = {};
      if (selectedBorough) params.borough = selectedBorough;
      if (selectedPropertyType) params.propertyType = selectedPropertyType;
      
      const response = await analyticsService.getMarketInsights(params);
      setMarketInsights(response.data);
    } catch (err) {
      console.error('Market insights error:', err);
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

  const getROIColor = (roi: number) => {
    if (roi >= 80) return 'text-green-600';
    if (roi >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'info': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !portfolioData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load portfolio analytics'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData.overview.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(portfolioData.overview.occupancyRate)} occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolioData.overview.totalRevenue)}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatCurrency(portfolioData.overview.yearlyRevenue)} annually
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData.overview.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {portfolioData.overview.pendingApplications} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(portfolioData.overview.totalMaintenanceCost)}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChart className="h-5 w-5 mr-2" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Monthly revenue and application trends over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Monthly Revenue</h4>
              <div className="grid grid-cols-12 gap-2">
                {portfolioData.trends.monthlyRevenue.map((revenue, index) => (
                  <div key={index} className="text-center">
                    <div 
                      className="bg-blue-500 rounded-t"
                      style={{ 
                        height: `${Math.max((revenue / Math.max(...portfolioData.trends.monthlyRevenue)) * 60, 4)}px` 
                      }}
                    ></div>
                    <div className="text-xs text-muted-foreground mt-1">{months[index]}</div>
                    <div className="text-xs font-medium">{revenue > 0 ? formatCurrency(revenue) : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Application Volume</h4>
              <div className="grid grid-cols-12 gap-2">
                {portfolioData.trends.applicationTrends.map((applications, index) => (
                  <div key={index} className="text-center">
                    <div 
                      className="bg-green-500 rounded-t"
                      style={{ 
                        height: `${Math.max((applications / Math.max(...portfolioData.trends.applicationTrends)) * 40, 4)}px` 
                      }}
                    ></div>
                    <div className="text-xs text-muted-foreground mt-1">{months[index]}</div>
                    <div className="text-xs font-medium">{applications > 0 ? applications : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Top Performers
            </CardTitle>
            <CardDescription>Properties with highest ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioData.topPerformers.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{property.title}</h4>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className="text-sm">
                        {formatCurrency(property.monthlyRevenue)}/month
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {property.applicationCount} applications
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getROIColor(property.roi)}`}>
                      {formatPercentage(property.roi)}
                    </div>
                    <div className="text-xs text-muted-foreground">ROI</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="h-5 w-5 mr-2" />
              Needs Attention
            </CardTitle>
            <CardDescription>Properties requiring focus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {portfolioData.lowPerformers.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{property.title}</h4>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className="text-sm">
                        {property.isOccupied ? formatCurrency(property.monthlyRevenue) : 'Vacant'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {property.maintenanceCount} maintenance
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getROIColor(property.roi)}`}>
                      {formatPercentage(property.roi)}
                    </div>
                    <div className="text-xs text-muted-foreground">ROI</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      {marketInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Market Insights
            </CardTitle>
            <CardDescription>Compare your portfolio to market trends</CardDescription>
            <div className="flex space-x-4">
              <Select value={selectedBorough} onValueChange={setSelectedBorough}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Boroughs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Boroughs</SelectItem>
                  <SelectItem value="MANHATTAN">Manhattan</SelectItem>
                  <SelectItem value="BROOKLYN">Brooklyn</SelectItem>
                  <SelectItem value="QUEENS">Queens</SelectItem>
                  <SelectItem value="BRONX">Bronx</SelectItem>
                  <SelectItem value="STATEN_ISLAND">Staten Island</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="APARTMENT">Apartment</SelectItem>
                  <SelectItem value="HOUSE">House</SelectItem>
                  <SelectItem value="CONDO">Condo</SelectItem>
                  <SelectItem value="STUDIO">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{formatCurrency(marketInsights.marketData.averageRent)}</div>
                <div className="text-sm text-muted-foreground">Market Average</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{formatCurrency(marketInsights.marketData.medianRent)}</div>
                <div className="text-sm text-muted-foreground">Market Median</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{marketInsights.marketData.totalListings}</div>
                <div className="text-sm text-muted-foreground">Total Listings</div>
              </div>
            </div>

            {/* Portfolio vs Market Comparison */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Your Portfolio vs Market</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{marketInsights.userComparison.aboveMarket}</div>
                  <div className="text-sm text-green-600">Above Market</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">{marketInsights.userComparison.atMarket}</div>
                  <div className="text-sm text-yellow-600">At Market</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{marketInsights.userComparison.belowMarket}</div>
                  <div className="text-sm text-red-600">Below Market</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="font-medium mb-3">Recommendations</h4>
              <div className="space-y-3">
                {marketInsights.recommendations.map((rec, index) => (
                  <Alert key={index}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h5 className="font-medium">{rec.title}</h5>
                          <Badge variant={getPriorityColor(rec.priority)} className="ml-2 text-xs">
                            {rec.priority}
                          </Badge>
                        </div>
                        <AlertDescription>{rec.description}</AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortfolioAnalytics;
