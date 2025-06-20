'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Shield, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  amount: number;
  type: 'APPLICATION_FEE' | 'SECURITY_DEPOSIT' | 'FIRST_MONTH_RENT' | 'MONTHLY_RENT' | 'BACKGROUND_CHECK_FEE';
  applicationId?: string;
  landlordId?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

function PaymentForm({ 
  amount, 
  type, 
  applicationId, 
  landlordId, 
  propertyTitle, 
  propertyAddress,
  onSuccess,
  onError 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);
  const { toast } = useToast();

  const createPaymentIntent = async () => {
    try {
      let endpoint = '/api/payments/create-payment-intent';
      let body: any = {
        amount,
        type,
        applicationId,
        landlordId,
        description: getPaymentDescription()
      };

      // Special handling for different payment types
      if (type === 'BACKGROUND_CHECK_FEE') {
        endpoint = '/api/payments/background-check-fee';
        body = { applicationId };
      } else if (type === 'SECURITY_DEPOSIT') {
        endpoint = '/api/payments/security-deposit';
        body = { amount, applicationId, landlordId };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const result = await response.json();
        setClientSecret(result.data.clientSecret);
        setPaymentId(result.data.paymentId);
        if (result.data.amountBreakdown) {
          setFeeBreakdown(result.data.amountBreakdown);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }
    } catch (error: any) {
      toast({
        title: 'Payment Setup Error',
        description: error.message,
        variant: 'destructive'
      });
      onError?.(error.message);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement
      }
    });

    if (error) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
      onError?.(error.message || 'Payment failed');
    } else if (paymentIntent.status === 'succeeded') {
      // Confirm payment on backend
      try {
        await fetch('/api/payments/confirm-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ paymentId })
        });

        toast({
          title: 'Payment Successful',
          description: `Your ${getPaymentTypeLabel()} has been processed successfully.`
        });
        onSuccess?.(paymentId);
      } catch (error) {
        console.error('Payment confirmation error:', error);
      }
    }

    setIsProcessing(false);
  };

  const getPaymentDescription = () => {
    switch (type) {
      case 'APPLICATION_FEE':
        return `Application fee for ${propertyTitle}`;
      case 'SECURITY_DEPOSIT':
        return `Security deposit for ${propertyTitle}`;
      case 'FIRST_MONTH_RENT':
        return `First month rent for ${propertyTitle}`;
      case 'MONTHLY_RENT':
        return `Monthly rent for ${propertyTitle}`;
      case 'BACKGROUND_CHECK_FEE':
        return 'Background check processing fee';
      default:
        return 'Payment';
    }
  };

  const getPaymentTypeLabel = () => {
    switch (type) {
      case 'APPLICATION_FEE':
        return 'application fee';
      case 'SECURITY_DEPOSIT':
        return 'security deposit';
      case 'FIRST_MONTH_RENT':
        return 'first month rent';
      case 'MONTHLY_RENT':
        return 'rent payment';
      case 'BACKGROUND_CHECK_FEE':
        return 'background check fee';
      default:
        return 'payment';
    }
  };

  const getPaymentIcon = () => {
    switch (type) {
      case 'SECURITY_DEPOSIT':
        return <Shield className="h-5 w-5" />;
      case 'BACKGROUND_CHECK_FEE':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getPaymentBadge = () => {
    switch (type) {
      case 'SECURITY_DEPOSIT':
        return <Badge variant="outline" className="bg-blue-50">Held in Escrow</Badge>;
      case 'BACKGROUND_CHECK_FEE':
        return <Badge variant="outline" className="bg-purple-50">Processing Fee</Badge>;
      default:
        return null;
    }
  };

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPaymentIcon()}
            {getPaymentTypeLabel().charAt(0).toUpperCase() + getPaymentTypeLabel().slice(1)}
          </div>
          {getPaymentBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Property:</span>
              <span className="font-medium">{propertyTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Address:</span>
              <span className="text-gray-600">{propertyAddress}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment Type:</span>
              <span className="font-medium">{getPaymentTypeLabel()}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>${amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Fee Breakdown */}
          {feeBreakdown && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-blue-900">Payment Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Payment Amount:</span>
                  <span>${feeBreakdown.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Platform Fee (2.9%):</span>
                  <span>${feeBreakdown.platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Processing Fee:</span>
                  <span>${feeBreakdown.stripeFee.toFixed(2)}</span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-between font-medium">
                  <span>Landlord Receives:</span>
                  <span>${feeBreakdown.landlordAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Special Notices */}
          {type === 'SECURITY_DEPOSIT' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your security deposit will be held securely in escrow until lease completion. 
                It will be returned according to your lease terms.
              </AlertDescription>
            </Alert>
          )}

          {type === 'BACKGROUND_CHECK_FEE' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Background check processing typically takes 24-48 hours. 
                You'll be notified once the screening is complete.
              </AlertDescription>
            </Alert>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border rounded-lg p-4">
              <label className="block text-sm font-medium mb-2">
                Card Details
              </label>
              <CardElement options={cardElementOptions} />
            </div>

            <div className="text-xs text-gray-500">
              Your payment is secured by 256-bit SSL encryption and processed by Stripe.
            </div>

            <Button 
              type="submit" 
              disabled={!stripe || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </Button>
          </form>

          <div className="text-xs text-gray-500 text-center">
            By clicking "Pay", you agree to our terms of service and payment processing terms.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentProcessor(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
}