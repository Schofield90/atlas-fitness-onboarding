"use client";

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Smartphone, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import moment from 'moment';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  cost: number;
  currency?: string;
  trainer_name?: string;
}

interface MobilePaymentFormProps {
  session: Session;
  onSuccess: () => void;
}

export function MobilePaymentForm({ session, onSuccess }: MobilePaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent session={session} onSuccess={onSuccess} />
    </Elements>
  );
}

function PaymentFormContent({ session, onSuccess }: MobilePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [saveCard, setSaveCard] = useState(true);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      // Create payment intent - replace with actual API call
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          amount: session.cost * 100, // Convert to pence
          currency: session.currency || 'gbp'
        })
      });

      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            // Add billing details if needed
          }
        },
        setup_future_usage: saveCard ? 'off_session' : undefined
      });

      if (result.error) {
        toast.error(result.error.message || 'Payment failed');
      } else {
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Session Details</span>
            <Badge variant="outline">£{session.cost}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Session</span>
            <span className="font-medium">{session.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date & Time</span>
            <span className="font-medium">
              {moment.utc(session.start_time).format('DD MMM YYYY [at] h:mm A')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="font-medium">
              {moment(session.end_time).diff(moment(session.start_time), 'minutes')} mins
            </span>
          </div>
          {session.trainer_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trainer</span>
              <span className="font-medium">{session.trainer_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Payment Methods */}
          <SavedPaymentMethods />
          
          <Separator />
          
          {/* New Payment Method */}
          <div className="space-y-4">
            <h3 className="font-medium">Add New Payment Method</h3>
            
            {/* Payment Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className="flex flex-col items-center gap-2 h-16"
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Card</span>
              </Button>
              <Button
                variant={paymentMethod === 'apple_pay' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('apple_pay')}
                className="flex flex-col items-center gap-2 h-16"
                disabled
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs">Apple Pay</span>
              </Button>
              <Button
                variant={paymentMethod === 'google_pay' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('google_pay')}
                className="flex flex-col items-center gap-2 h-16"
                disabled
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs">Google Pay</span>
              </Button>
            </div>

            {/* Card Form */}
            {paymentMethod === 'card' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                      },
                    }}
                  />
                </div>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Save this card for future payments</span>
                </label>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!stripe || processing}
                >
                  {processing ? 'Processing...' : `Pay £${session.cost}`}
                </Button>
              </form>
            )}
          </div>
          
          {/* Security Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your payment information is secure and encrypted</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component to show saved payment methods
function SavedPaymentMethods() {
  // Mock data - replace with actual saved payment methods
  const savedMethods = [
    {
      id: '1',
      type: 'card',
      brand: 'Visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
      is_default: true
    }
  ];

  if (savedMethods.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Saved Payment Methods</h3>
      {savedMethods.map(method => (
        <div
          key={method.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {method.brand} •••• {method.last4}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires {method.exp_month}/{method.exp_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {method.is_default && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
            <Button variant="outline" size="sm">
              Use this card
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}