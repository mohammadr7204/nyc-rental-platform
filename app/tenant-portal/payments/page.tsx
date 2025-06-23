'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tenantService } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface LeaseInfo {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  status: string;
  property: {
    address: string;
    bedrooms: number;
    bathrooms: number;
  };
  landlord: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

export default function TenantPayments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentLease, setCurrentLease] = useState<LeaseInfo | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('rent');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  useEffect(() => {
    if (user) {
      loadTenantData();
    }
  }, [user]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Load current lease
      const leasesResponse = await tenantService.getLeases();
      const activeLease = leasesResponse.data.find((lease: LeaseInfo) => 
        lease.status === 'ACTIVE' || lease.status === 'SIGNED'
      );
      
      if (activeLease) {
        setCurrentLease(activeLease);
        setPaymentAmount(activeLease.monthlyRent);
      }

      // Load saved payment methods (mock data for development)
      setPaymentMethods([
        {
          id: 'pm_1',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2027
        }
      ]);

      if (paymentMethods.length > 0) {
        setSelectedPaymentMethod(paymentMethods[0].id);
      }

    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment information.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    
    if (currentLease) {
      switch (type) {
        case 'rent':
          setPaymentAmount(currentLease.monthlyRent);
          break;
        case 'security_deposit':
          setPaymentAmount(currentLease.securityDeposit);
          break;
        case 'custom':
          setPaymentAmount(0);
          break;
        default:
          setPaymentAmount(currentLease.monthlyRent);
      }
    }
  };

  const handleCardFormChange = (field: string, value: string) => {
    if (field === 'number') {
      // Format card number with spaces
      value = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      value = value.slice(0, 19); // Limit to 16 digits + 3 spaces
    } else if (field === 'expiry') {
      // Format expiry as MM/YY
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
    } else if (field === 'cvc') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    
    setCardForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCard = async () => {
    try {
      // Validate card form
      if (!cardForm.number || !cardForm.expiry || !cardForm.cvc || !cardForm.name) {
        toast({
          title: 'Error',
          description: 'Please fill in all card details.',
          variant: 'destructive'
        });
        return;
      }

      // In a real implementation, you would tokenize the card with Stripe
      const newCard: PaymentMethod = {
        id: 'pm_' + Date.now(),
        type: 'card',
        last4: cardForm.number.replace(/\s/g, '').slice(-4),
        brand: 'visa', // Would be determined by Stripe
        expiryMonth: parseInt(cardForm.expiry.split('/')[0]),
        expiryYear: parseInt('20' + cardForm.expiry.split('/')[1])
      };

      setPaymentMethods(prev => [...prev, newCard]);
      setSelectedPaymentMethod(newCard.id);
      setShowAddCard(false);
      setCardForm({ number: '', expiry: '', cvc: '', name: '' });

      toast({
        title: 'Success',
        description: 'Payment method added successfully.',
      });

    } catch (error) {
      console.error('Error adding card:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payment method.',
        variant: 'destructive'
      });
    }
  };

  const handlePayment = async () => {
    if (!currentLease || !selectedPaymentMethod || paymentAmount <= 0) {
      toast({
        title: 'Error',
        description: 'Please select a payment method and amount.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Process payment
      const response = await tenantService.payRent({
        leaseId: currentLease.id,
        amount: paymentAmount,
        paymentMethodId: selectedPaymentMethod
      });

      if (response.data) {
        toast({
          title: 'Payment Successful',
          description: `Your ${paymentType.replace('_', ' ')} payment of $${paymentAmount.toLocaleString()} has been processed.`,
        });

        // Reset form
        if (paymentType === 'rent' && currentLease) {
          setPaymentAmount(currentLease.monthlyRent);
        }
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Payment Failed',
        description: 'There was an error processing your payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCardBrandIcon = (brand: string) => {
    // In a real implementation, you'd return actual card brand icons
    return <CreditCard className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentLease) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Button asChild variant="ghost" size="sm">
            <Link href="/tenant-portal">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Make a Payment</h1>
          </div>
        </div>

        <Card className="p-12 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Lease Found</h3>
          <p className="text-gray-500 mb-6">
            You need an active lease to make payments. Please contact your landlord if you believe this is an error.
          </p>
          <Button asChild>
            <Link href="/messages">
              Contact Landlord
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button asChild variant="ghost" size="sm">
          <Link href="/tenant-portal">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Make a Payment</h1>
          <p className="text-gray-600 mt-1">
            Pay your rent and other charges securely online
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Type */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Type</h2>
            <div className="space-y-3">
              <div>
                <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Monthly Rent - {formatCurrency(currentLease.monthlyRent)}</SelectItem>
                    <SelectItem value="security_deposit">Security Deposit - {formatCurrency(currentLease.securityDeposit)}</SelectItem>
                    <SelectItem value="custom">Custom Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paymentType === 'custom' && (
                <div>
                  <Label htmlFor="amount">Payment Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCard(true)}
              >
                Add Card
              </Button>
            </div>
            
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCardBrandIcon(method.brand)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {method.brand.toUpperCase()} •••• {method.last4}
                          </p>
                          <p className="text-sm text-gray-500">
                            Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                          </p>
                        </div>
                      </div>
                      {selectedPaymentMethod === method.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No payment methods added yet.</p>
                <Button
                  onClick={() => setShowAddCard(true)}
                  className="mt-3"
                >
                  Add Payment Method
                </Button>
              </div>
            )}

            {/* Add Card Form */}
            {showAddCard && (
              <div className="mt-6 p-4 border-t">
                <h3 className="font-medium text-gray-900 mb-4">Add New Card</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      value={cardForm.name}
                      onChange={(e) => handleCardFormChange('name', e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={cardForm.number}
                      onChange={(e) => handleCardFormChange('number', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        value={cardForm.expiry}
                        onChange={(e) => handleCardFormChange('expiry', e.target.value)}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        value={cardForm.cvc}
                        onChange={(e) => handleCardFormChange('cvc', e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button onClick={handleAddCard}>
                      Add Card
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddCard(false);
                        setCardForm({ number: '', expiry: '', cvc: '', name: '' });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Payment Summary & Submit */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Type:</span>
                <span className="font-medium">
                  {paymentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{formatCurrency(paymentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing Fee:</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(paymentAmount)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={isProcessing || !selectedPaymentMethod || paymentAmount <= 0}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {formatCurrency(paymentAmount)}
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Your payment information is secure and encrypted. You will receive a receipt via email.
            </p>
          </Card>
        </div>

        {/* Property Information Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Property Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-gray-900">{currentLease.property.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bedrooms</p>
                  <p className="text-gray-900">{currentLease.property.bedrooms}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Bathrooms</p>
                  <p className="text-gray-900">{currentLease.property.bathrooms}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Rent</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(currentLease.monthlyRent)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Landlord Contact</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">
                  {currentLease.landlord.firstName} {currentLease.landlord.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900">{currentLease.landlord.email}</p>
              </div>
            </div>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/messages">
                Send Message
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Lease Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-gray-900">{formatDate(currentLease.startDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-gray-900">{formatDate(currentLease.endDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className="bg-green-100 text-green-800">
                  {currentLease.status}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
