import Stripe from 'stripe';

// Initialize Stripe with optional API key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY || '';

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
}) : null;

export interface TenantBilling {
  organizationId: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
  mrr: number;
  currency: string;
  lastPaymentStatus?: string;
  paymentMethodLast4?: string;
}

export interface BillingMetrics {
  totalMrr: number;
  totalArr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  canceledSubscriptions: number;
  failedPayments: number;
  churnRate: number;
  averageRevenue: number;
}

/**
 * Get billing metrics for all tenants
 */
export async function getBillingMetrics(): Promise<BillingMetrics> {
  // If Stripe is not configured, return mock data
  if (!stripe) {
    return {
      totalMrr: 5432,
      totalArr: 65184,
      activeSubscriptions: 27,
      trialSubscriptions: 8,
      canceledSubscriptions: 3,
      failedPayments: 2,
      churnRate: 3.2,
      averageRevenue: 201
    };
  }

  try {
    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.customer']
    });

    // Get trial subscriptions
    const trialSubs = await stripe.subscriptions.list({
      status: 'trialing',
      limit: 100
    });

    // Get canceled subscriptions (last 30 days)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const canceledSubs = await stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: thirtyDaysAgo },
      limit: 100
    });

    // Calculate MRR
    let totalMrr = 0;
    subscriptions.data.forEach(sub => {
      sub.items.data.forEach(item => {
        if (item.price.recurring?.interval === 'month') {
          totalMrr += (item.price.unit_amount || 0) * (item.quantity || 1);
        } else if (item.price.recurring?.interval === 'year') {
          totalMrr += ((item.price.unit_amount || 0) * (item.quantity || 1)) / 12;
        }
      });
    });

    // Convert from cents to currency units
    totalMrr = totalMrr / 100;

    // Get failed payments
    const failedCharges = await stripe.charges.list({
      limit: 100,
      created: { gte: thirtyDaysAgo },
      status: 'failed'
    });

    // Calculate churn rate
    const totalActive = subscriptions.data.length;
    const churned = canceledSubs.data.length;
    const churnRate = totalActive > 0 ? (churned / totalActive) * 100 : 0;

    return {
      totalMrr,
      totalArr: totalMrr * 12,
      activeSubscriptions: subscriptions.data.length,
      trialSubscriptions: trialSubs.data.length,
      canceledSubscriptions: canceledSubs.data.length,
      failedPayments: failedCharges.data.length,
      churnRate: Math.round(churnRate * 10) / 10,
      averageRevenue: totalActive > 0 ? Math.round(totalMrr / totalActive) : 0
    };
  } catch (error) {
    console.error('Error fetching Stripe metrics:', error);
    // Return mock data as fallback
    return {
      totalMrr: 0,
      totalArr: 0,
      activeSubscriptions: 0,
      trialSubscriptions: 0,
      canceledSubscriptions: 0,
      failedPayments: 0,
      churnRate: 0,
      averageRevenue: 0
    };
  }
}

/**
 * Get billing details for a specific tenant
 */
export async function getTenantBilling(organizationId: string): Promise<TenantBilling | null> {
  if (!stripe) {
    // Return mock data if Stripe not configured
    return {
      organizationId,
      mrr: Math.floor(Math.random() * 500) + 50,
      currency: 'gbp',
      subscriptionStatus: 'active'
    };
  }

  try {
    // In production, you'd look up the Stripe customer ID from your database
    // For now, we'll search by metadata
    const customers = await stripe.customers.list({
      limit: 100,
      email: undefined // You'd filter by organization email
    });

    const customer = customers.data[0]; // Simplified - would need proper lookup

    if (!customer) {
      return null;
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      return {
        organizationId,
        stripeCustomerId: customer.id,
        mrr: 0,
        currency: 'gbp',
        subscriptionStatus: 'inactive'
      };
    }

    // Calculate MRR for this tenant
    let mrr = 0;
    subscription.items.data.forEach(item => {
      if (item.price.recurring?.interval === 'month') {
        mrr += (item.price.unit_amount || 0) * (item.quantity || 1);
      } else if (item.price.recurring?.interval === 'year') {
        mrr += ((item.price.unit_amount || 0) * (item.quantity || 1)) / 12;
      }
    });

    return {
      organizationId,
      stripeCustomerId: customer.id,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      mrr: mrr / 100,
      currency: subscription.currency,
      lastPaymentStatus: 'succeeded',
      paymentMethodLast4: '4242' // Would get from payment method
    };
  } catch (error) {
    console.error('Error fetching tenant billing:', error);
    return null;
  }
}

/**
 * Create a Stripe customer for a new tenant
 */
export async function createStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string | null> {
  if (!stripe) {
    console.warn('Stripe not configured');
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId
      }
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<boolean> {
  if (!stripe) {
    console.warn('Stripe not configured');
    return false;
  }

  try {
    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
}

/**
 * Issue a refund
 */
export async function issueRefund(
  chargeId: string,
  amount?: number,
  reason?: string
): Promise<boolean> {
  if (!stripe) {
    console.warn('Stripe not configured');
    return false;
  }

  try {
    await stripe.refunds.create({
      charge: chargeId,
      amount: amount, // In cents, partial refund if specified
      reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer'
    });
    return true;
  } catch (error) {
    console.error('Error issuing refund:', error);
    return false;
  }
}