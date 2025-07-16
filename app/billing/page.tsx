'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Crown,
  Shield,
  Zap
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  subscription_status: string;
  subscription_id: string;
  settings: {
    trial_ends_at: string;
  };
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_start: string;
  trial_end: string;
  cancel_at_period_end: boolean;
  price_id: string;
}

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signup');
        return;
      }
      setUser(user);
      await fetchBillingData(user.id);
    };
    getUser();
  }, [router]);

  const fetchBillingData = async (userId: string) => {
    try {
      // Get user profile and organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();

        setOrganization(org);

        // Get subscription if exists
        if (org?.subscription_id) {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .single();

          setSubscription(sub);
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user || !organization) return;

    setUpgradeLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          organization_id: organization.id,
          price_id: 'price_1234567890', // Replace with actual Stripe price ID
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'trialing':
        return 'text-blue-600';
      case 'cancelled':
      case 'canceled':
        return 'text-red-600';
      case 'past_due':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'trialing':
        return <Crown className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
      case 'canceled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'past_due':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const isOnTrial = subscription?.status === 'trialing' || (!subscription && organization?.settings?.trial_ends_at);
  const trialEndsAt = subscription?.trial_end || organization?.settings?.trial_ends_at;
  const daysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your Atlas Fitness subscription</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
                {subscription && (
                  <div className="flex items-center">
                    {getStatusIcon(subscription.status)}
                    <span className={`ml-2 font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status === 'trialing' ? 'Free Trial' : subscription.status}
                    </span>
                  </div>
                )}
              </div>

              {isOnTrial ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Crown className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="font-semibold text-blue-900">Free Trial Active</p>
                      <p className="text-sm text-blue-700">
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Trial expires today'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : subscription?.status === 'active' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="font-semibold text-green-900">Pro Plan Active</p>
                      <p className="text-sm text-green-700">
                        Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                    <div>
                      <p className="font-semibold text-red-900">No Active Subscription</p>
                      <p className="text-sm text-red-700">
                        Upgrade to continue using Atlas Fitness
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Plan</span>
                  <span className="font-medium">
                    {subscription?.status === 'active' ? 'Pro Plan' : 'Free Trial'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Price</span>
                  <span className="font-medium">
                    {subscription?.status === 'active' ? '£197/month' : '£0/month'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Status</span>
                  <span className={`font-medium ${getStatusColor(subscription?.status || 'trial')}`}>
                    {subscription?.status === 'trialing' ? 'Free Trial' : subscription?.status || 'Trial'}
                  </span>
                </div>
                {subscription && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Next billing date</span>
                    <span className="font-medium">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                {!subscription || subscription.status === 'trialing' ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradeLoading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {upgradeLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Upgrade to Pro Plan
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => window.open('https://billing.stripe.com/p/login/test', '_blank')}
                      className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Manage Subscription
                    </button>
                    <p className="text-sm text-gray-600 text-center">
                      Update billing details, download invoices, and manage your subscription
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pro Plan Features</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Unlimited SMS responses</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Facebook lead integration</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Real-time analytics</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">ROI tracking</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Priority support</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">💰 ROI Calculator</h4>
              <p className="text-sm text-gray-600 mb-4">
                Average gym saves £2,847/month with faster lead response
              </p>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">1,444%</div>
                <div className="text-sm text-gray-600">Return on investment</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}