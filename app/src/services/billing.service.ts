import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { z } from 'zod';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' })
  : null;

// Billing schemas
export const subscriptionPlanSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price_monthly_cents: z.number().min(0),
  price_yearly_cents: z.number().min(0).optional(),
  features: z.array(z.string()).default([]),
  limits: z.object({
    max_members: z.number().optional(),
    max_classes: z.number().optional(),
    max_bookings: z.number().optional(),
    max_staff: z.number().optional()
  }).default({})
});

export const paymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_transfer', 'direct_debit']),
  card: z.object({
    last4: z.string(),
    brand: z.string(),
    exp_month: z.number(),
    exp_year: z.number()
  }).optional()
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly?: number;
  features: string[];
  limits: Record<string, number>;
  stripeProductId?: string;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  amount: number;
  status: 'draft' | 'open' | 'paid' | 'void';
  dueDate?: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  items: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
}

class BillingService {
  // Get or create Stripe customer for organization
  private async getOrCreateStripeCustomer(orgId: string): Promise<string> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const supabase = await createClient();
    
    // Get organization
    const { data: org } = await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', orgId)
      .single();
      
    if (!org) throw new Error('Organization not found');
    
    // Return existing customer ID if available
    if (org.stripe_customer_id) {
      return org.stripe_customer_id;
    }
    
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { org_id: orgId }
    });
    
    // Update organization with Stripe customer ID
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', orgId);
      
    return customer.id;
  }

  // Create subscription plan
  async createPlan(data: z.infer<typeof subscriptionPlanSchema>): Promise<string> {
    const supabase = await createClient();
    const validated = subscriptionPlanSchema.parse(data);
    
    // Create Stripe product and prices if configured
    let stripeProductId: string | undefined;
    let stripePriceIdMonthly: string | undefined;
    let stripePriceIdYearly: string | undefined;
    
    if (stripe) {
      // Create product
      const product = await stripe.products.create({
        name: validated.name,
        description: validated.description
      });
      stripeProductId = product.id;
      
      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: validated.price_monthly_cents,
        currency: 'gbp',
        recurring: { interval: 'month' }
      });
      stripePriceIdMonthly = monthlyPrice.id;
      
      // Create yearly price if provided
      if (validated.price_yearly_cents) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: validated.price_yearly_cents,
          currency: 'gbp',
          recurring: { interval: 'year' }
        });
        stripePriceIdYearly = yearlyPrice.id;
      }
    }
    
    // Save to database
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .insert({
        ...validated,
        stripe_product_id: stripeProductId,
        stripe_price_id_monthly: stripePriceIdMonthly,
        stripe_price_id_yearly: stripePriceIdYearly
      })
      .select('id')
      .single();
      
    if (error) throw error;
    
    return plan.id;
  }

  // Get available plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly_cents');
      
    if (error) throw error;
    
    return (data || []).map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.price_monthly_cents / 100,
      priceYearly: plan.price_yearly_cents ? plan.price_yearly_cents / 100 : undefined,
      features: plan.features || [],
      limits: plan.limits || {},
      stripeProductId: plan.stripe_product_id,
      stripePriceIdMonthly: plan.stripe_price_id_monthly,
      stripePriceIdYearly: plan.stripe_price_id_yearly
    }));
  }

  // Subscribe organization to plan
  async subscribe(
    orgId: string,
    planId: string,
    interval: 'monthly' | 'yearly' = 'monthly'
  ): Promise<Subscription> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const supabase = await createClient();
    
    // Get plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (!plan) throw new Error('Plan not found');
    
    const priceId = interval === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;
      
    if (!priceId) throw new Error('Stripe price not configured for this plan');
    
    // Get or create Stripe customer
    const customerId = await this.getOrCreateStripeCustomer(orgId);
    
    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 14, // 14-day free trial
      metadata: { org_id: orgId, plan_id: planId }
    });
    
    // Save subscription to database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        org_id: orgId,
        plan_id: planId,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        stripe_subscription_id: stripeSubscription.id
      })
      .select('*')
      .single();
      
    if (error) throw error;
    
    // Update organization with subscription ID
    await supabase
      .from('organizations')
      .update({ 
        plan: plan.name.toLowerCase(),
        stripe_subscription_id: stripeSubscription.id 
      })
      .eq('id', orgId);
    
    if (!subscription) throw new Error('Failed to create subscription');
    
    return {
      id: subscription.id,
      orgId: subscription.org_id,
      planId: subscription.plan_id,
      status: subscription.status as any,
      currentPeriodStart: new Date(subscription.current_period_start),
      currentPeriodEnd: new Date(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripeSubscriptionId: subscription.stripe_subscription_id
    };
  }

  // Get organization subscription
  async getSubscription(orgId: string): Promise<Subscription | null> {
    const supabase = await createClient();
    
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single();
      
    if (!data) return null;
    
    return {
      id: data.id,
      orgId: data.org_id,
      planId: data.plan_id,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      stripeSubscriptionId: data.stripe_subscription_id
    };
  }

  // Cancel subscription
  async cancelSubscription(orgId: string, immediately = false): Promise<void> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const subscription = await this.getSubscription(orgId);
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }
    
    // Cancel in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: !immediately }
    );
    
    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }
    
    // Update database
    const supabase = await createClient();
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: !immediately,
        status: immediately ? 'cancelled' : 'active'
      })
      .eq('id', subscription.id);
  }

  // Update payment method
  async updatePaymentMethod(orgId: string, paymentMethodId: string): Promise<void> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const customerId = await this.getOrCreateStripeCustomer(orgId);
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    
    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
  }

  // Get payment methods
  async getPaymentMethods(orgId: string): Promise<any[]> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const customerId = await this.getOrCreateStripeCustomer(orgId);
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      } : undefined
    }));
  }

  // Get invoices
  async getInvoices(orgId: string, limit = 10): Promise<Invoice[]> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const customerId = await this.getOrCreateStripeCustomer(orgId);
    
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit
    });
    
    return invoices.data.map(invoice => ({
      id: invoice.id,
      orgId,
      amount: invoice.amount_paid / 100,
      status: invoice.status as any,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      paidAt: invoice.status_transitions.paid_at 
        ? new Date(invoice.status_transitions.paid_at * 1000) 
        : undefined,
      stripeInvoiceId: invoice.id,
      items: invoice.lines.data.map(line => ({
        description: line.description || '',
        amount: line.amount / 100,
        quantity: line.quantity || 1
      }))
    }));
  }

  // Get usage for current period
  async getUsage(orgId: string): Promise<Record<string, number>> {
    const supabase = await createClient();
    
    // Get current subscription
    const subscription = await this.getSubscription(orgId);
    if (!subscription) return {};
    
    // Get plan limits
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('limits')
      .eq('id', subscription.planId)
      .single();
      
    if (!plan) return {};
    
    // Get current usage
    const startOfPeriod = subscription.currentPeriodStart.toISOString();
    
    // Count members
    const { count: memberCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
      
    // Count bookings this period
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', startOfPeriod);
      
    // Count staff
    const { count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
      
    // Count classes
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId);
    
    return {
      members: memberCount || 0,
      members_limit: plan.limits?.max_members || Infinity,
      bookings: bookingCount || 0,
      bookings_limit: plan.limits?.max_bookings || Infinity,
      staff: staffCount || 0,
      staff_limit: plan.limits?.max_staff || Infinity,
      classes: classCount || 0,
      classes_limit: plan.limits?.max_classes || Infinity
    };
  }

  // Create checkout session for upgrades
  async createCheckoutSession(
    orgId: string,
    planId: string,
    interval: 'monthly' | 'yearly' = 'monthly',
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    if (!stripe) throw new Error('Stripe not configured');
    
    const supabase = await createClient();
    
    // Get plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (!plan) throw new Error('Plan not found');
    
    const priceId = interval === 'yearly' 
      ? plan.stripe_price_id_yearly 
      : plan.stripe_price_id_monthly;
      
    if (!priceId) throw new Error('Stripe price not configured for this plan');
    
    const customerId = await this.getOrCreateStripeCustomer(orgId);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { org_id: orgId, plan_id: planId }
    });
    
    return session.url || '';
  }

  // Handle Stripe webhook events
  async handleWebhook(event: Stripe.Event): Promise<void> {
    const supabase = await createClient();
    
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata.org_id;
        const planId = subscription.metadata.plan_id;
        
        if (orgId && planId) {
          await supabase
            .from('subscriptions')
            .upsert({
              org_id: orgId,
              plan_id: planId,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              stripe_subscription_id: subscription.id
            });
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // Log successful payment
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Handle failed payment
        break;
      }
    }
  }
}

export const billingService = new BillingService();