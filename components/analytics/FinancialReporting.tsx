'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  AlertTriangle,
  PieChart,
  BarChart3,
  FileText,
  CreditCard,
  Wrench,
  Home,
  Calculator
} from 'lucide-react';
import { analyticsService } from '@/services/api';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
}

interface Transaction {
  id: string;
  amount: number;
  type?: string;
  priority?: string;
  date: string;
  property: string;
  description: string;
}

interface PropertyFinancials {
  id: string;
  title: string;
  address: string;
  income: number;
  expenses: number;
  netIncome: number;
  rentAmount: number;
}

interface FinancialReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: FinancialSummary;
  income: {
    total: number;
    byType: Record<string, number>;
    transactions: Transaction[];
  };
  expenses: {
    total: number;
    byPriority: Record<string, number>;
    transactions: Transaction[];
  };
  properties: PropertyFinancials[];
}

const FinancialReporting: React.FC = () => {
  const [reportData, setReportData] = useState<FinancialReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  useEffect(() => {
    fetchFinancialReport();
  }, []);

  const fetchFinancialReport = async () => {
    try {
      setLoading(true);
      const params: any = {
        startDate,
        endDate
      };
      if (selectedProperty) {
        params.propertyId = selectedProperty;
      }

      const response = await analyticsService.getFinancialReport(params);
      setReportData(response.data);
    } catch (err) {
      setError('Failed to load financial report');
      console.error('Financial report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    fetchFinancialReport();
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = generateCSVReport(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-report-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSVReport = (data: FinancialReportData): string => {
    const rows = [
      ['Financial Report'],
      [`Period: ${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}`],
      [''],
      ['Summary'],
      ['Total Income', `$${data.summary.totalIncome.toFixed(2)}`],
      ['Total Expenses', `$${data.summary.totalExpenses.toFixed(2)}`],
      ['Net Income', `$${data.summary.netIncome.toFixed(2)}`],
      ['Profit Margin', `${data.summary.profitMargin.toFixed(2)}%`],
      [''],
      ['Income Transactions'],
      ['Date', 'Property', 'Type', 'Amount', 'Description'],
      ...data.income.transactions.map(t => [
        formatDate(t.date),
        t.property,
        t.type || '',
        `$${t.amount.toFixed(2)}`,
        t.description || ''
      ]),
      [''],
      ['Expense Transactions'],
      ['Date', 'Property', 'Priority', 'Amount', 'Description'],
      ...data.expenses.transactions.map(t => [
        formatDate(t.date),
        t.property,
        t.priority || '',
        `$${t.amount.toFixed(2)}`,
        t.description || ''
      ])
    ];

    return rows.map(row => row.join(',')).join('\n');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getIncomeTypeColor = (type: string) => {
    switch (type) {
      case 'MONTHLY_RENT': return 'bg-green-100 text-green-800';
      case 'SECURITY_DEPOSIT': return 'bg-blue-100 text-blue-800';
      case 'APPLICATION_FEE': return 'bg-purple-100 text-purple-800';
      case 'LATE_FEE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error || 'Failed to load financial report'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Financial Report
          </CardTitle>
          <CardDescription>
            Generate comprehensive financial reports for tax and business purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-32">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-32">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-48">
              <Label htmlFor="property">Property (Optional)</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Properties</SelectItem>
                  {reportData.properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDateChange} className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Update Report
            </Button>
            <Button variant="outline" onClick={exportReport} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(reportData.summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue from all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(reportData.summary.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Maintenance and operating costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(reportData.summary.netIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit after expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {reportData.summary.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Net income / total income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income and Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Income Breakdown
            </CardTitle>
            <CardDescription>Revenue by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportData.income.byType).map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <Badge className={getIncomeTypeColor(type)} variant="secondary">
                      {type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between font-medium">
                <span>Total Income</span>
                <span className="text-green-600">{formatCurrency(reportData.income.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Costs by maintenance priority</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(reportData.expenses.byPriority).map(([priority, amount]) => (
                <div key={priority} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <Badge className={getPriorityColor(priority)} variant="secondary">
                      {priority.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between font-medium">
                <span>Total Expenses</span>
                <span className="text-red-600">{formatCurrency(reportData.expenses.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2" />
            Property Performance
          </CardTitle>
          <CardDescription>Financial breakdown by property</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.properties.map((property) => (
              <div key={property.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{property.title}</h4>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Monthly Rent</div>
                    <div className="font-medium">{formatCurrency(property.rentAmount)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(property.income)}
                    </div>
                    <div className="text-xs text-green-600">Income</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(property.expenses)}
                    </div>
                    <div className="text-xs text-red-600">Expenses</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(property.netIncome)}
                    </div>
                    <div className="text-xs text-blue-600">Net Income</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Income Transactions</CardTitle>
            <CardDescription>Latest revenue transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reportData.income.transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                      <Badge className={getIncomeTypeColor(transaction.type || '')} variant="secondary">
                        {transaction.type?.replace(/_/g, ' ') || 'Other'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{transaction.property}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expense Transactions</CardTitle>
            <CardDescription>Latest maintenance expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reportData.expenses.transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                      <Badge className={getPriorityColor(transaction.priority || '')} variant="secondary">
                        {transaction.priority?.toUpperCase() || 'MEDIUM'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{transaction.property}</div>
                    <div className="text-xs text-muted-foreground">
                      {transaction.description} • {formatDate(transaction.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialReporting;
