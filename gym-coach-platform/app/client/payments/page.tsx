"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Trash2, Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last_four: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export default function PaymentsPage() {
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data - replace with actual API call
  const paymentMethods: PaymentMethod[] = [
    {
      id: '1',
      type: 'card',
      brand: 'Visa',
      last_four: '4242',
      exp_month: 12,
      exp_year: 2025,
      is_default: true,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      type: 'card',
      brand: 'Mastercard',
      last_four: '5555',
      exp_month: 6,
      exp_year: 2026,
      is_default: false,
      created_at: '2024-02-20T14:30:00Z',
    },
  ];

  // Mock transaction history
  const recentTransactions = [
    {
      id: '1',
      description: 'Morning HIIT Class',
      amount: 10,
      date: '2024-03-15T09:00:00Z',
      status: 'succeeded',
    },
    {
      id: '2',
      description: 'Personal Training Session',
      amount: 40,
      date: '2024-03-10T18:00:00Z',
      status: 'succeeded',
    },
    {
      id: '3',
      description: 'Yoga Flow Class',
      amount: 8,
      date: '2024-03-08T10:30:00Z',
      status: 'succeeded',
    },
  ];

  const handleSetDefault = async (methodId: string) => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Default payment method updated');
    } catch (error) {
      toast.error('Failed to update default payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMethod = async () => {
    if (!deletingMethod) return;
    
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Payment method removed');
      setDeletingMethod(null);
    } catch (error) {
      toast.error('Failed to remove payment method');
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand?: string) => {
    // In a real app, you'd have specific brand icons
    return <CreditCard className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <p className="text-muted-foreground">Manage your payment methods and view transaction history</p>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Saved Payment Methods</CardTitle>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length > 0 ? (
            paymentMethods.map(method => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getCardIcon(method.brand)}
                  <div>
                    <p className="font-medium">
                      {method.brand} •••• {method.last_four}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {method.exp_month}/{method.exp_year}
                    </p>
                  </div>
                  {method.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {!method.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={loading}
                    >
                      Set as Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingMethod(method)}
                    disabled={loading || method.is_default}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-4">No payment methods saved</p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your payment history for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">£{transaction.amount}</p>
                  {transaction.status === 'succeeded' ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Check className="w-3 h-3" />
                      Paid
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                      <X className="w-3 h-3" />
                      Failed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMethod} onOpenChange={() => setDeletingMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {deletingMethod?.brand} card ending in {deletingMethod?.last_four}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMethod}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}