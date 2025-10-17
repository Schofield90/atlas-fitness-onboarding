import Stripe from 'stripe';
import { createAdminClient } from '../supabase/admin';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (stripeKey) {
  stripe = new Stripe(stripeKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

interface CreateSubscriptionParams {
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  customerId?: string;
  paymentMethodId?: string;
  trialDays?: number;
  promoCode?: string;
}

interface UpdateSubscriptionParams {
  subscriptionId: string;
  newPlanId?: string;
  newBillingCycle?: 'monthly' | 'annual';
  cancelAtPeriodEnd?: boolean;
}

export class StripeBillingService {
  private supabase = createAdminClient();
  private stripe = stripe;

  private checkStripeConfigured(): void {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }
  }

  /**
   * Create or get Stripe customer for an organization
   */
  async ensureStripeCustomer(organizationId: string, email: string, name?: string): Promise<string> {
    // Check if organization already has a Stripe customer
    const { data: subscription } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (subscription?.stripe_customer_id) {
      return subscription.stripe_customer_id;
    }

    // Create new Stripe customer
    this.checkStripeConfigured();
    const customer = await this.stripe!.customers.create({
      email,
      name,
      metadata: {
        organization_id: organizationId
      }
    });

    return customer.id;
  }

  /**
   * Create subscription for organization
   */
  async createSubscription(params: CreateSubscriptionParams) {
    const { organizationId, planId, billingCycle, paymentMethodId, trialDays = 14, promoCode } = params;

    // Get plan details
    const { data: plan, error: planError } = await this.supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plan not found');
    }

    // Get or create Stripe customer
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name, contact_email')
      .eq('id', organizationId)
      .single();

    const customerId = await this.ensureStripeCustomer(
      organizationId,
      org?.contact_email || '',
      org?.name
    );

    // Attach payment method if provided
    if (paymentMethodId) {
      await this.stripe!.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await this.stripe!.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Get the appropriate price ID
    const priceId = billingCycle === 'annual' 
      ? plan.stripe_annual_price_id 
      : plan.stripe_monthly_price_id;

    if (!priceId) {
      // Create price in Stripe if it doesn't exist
      await this.syncPlanToStripe(plan);
    }

    // Create subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{
        price: priceId || await this.createStripePrice(plan, billingCycle),
      }],
      trial_period_days: trialDays,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
    };

    // Apply promo code if provided
    if (promoCode) {
      const promotionCode = await this.getPromotionCode(promoCode);
      if (promotionCode) {
        subscriptionParams.promotion_code = promotionCode.id;
      }
    }

    const subscription = await this.stripe!.subscriptions.create(subscriptionParams);

    // Save subscription to database
    await this.supabase.from('billing_subscriptions').upsert({
      organization_id: organizationId,
      plan_id: planId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      billing_cycle: billingCycle,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      price_per_period: billingCycle === 'annual' ? plan.annual_price : plan.monthly_price,
      promo_code: promoCode,
    });

    // Initialize usage tracking
    await this.initializeUsageTracking(organizationId, plan);

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as Stripe.Invoice)?.payment_intent?.client_secret,
      status: subscription.status,
    };
  }

  /**
   * Update existing subscription
   */
  async updateSubscription(params: UpdateSubscriptionParams) {
    this.checkStripeConfigured();
    const { subscriptionId, newPlanId, newBillingCycle, cancelAtPeriodEnd } = params;

    const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);

    if (cancelAtPeriodEnd !== undefined) {
      // Cancel or uncancel at period end
      await this.stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      await this.supabase
        .from('billing_subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          canceled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
        })
        .eq('stripe_subscription_id', subscriptionId);

      return { success: true };
    }

    if (newPlanId && newBillingCycle) {
      // Change plan
      const { data: newPlan } = await this.supabase
        .from('billing_plans')
        .select('*')
        .eq('id', newPlanId)
        .single();

      if (!newPlan) {
        throw new Error('New plan not found');
      }

      const newPriceId = newBillingCycle === 'annual' 
        ? newPlan.stripe_annual_price_id 
        : newPlan.stripe_monthly_price_id;

      if (!newPriceId) {
        throw new Error('Price not configured for this plan');
      }

      // Update subscription in Stripe
      const updatedSubscription = await this.stripe!.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
      });

      // Update in database
      await this.supabase
        .from('billing_subscriptions')
        .update({
          plan_id: newPlanId,
          billing_cycle: newBillingCycle,
          price_per_period: newBillingCycle === 'annual' ? newPlan.annual_price : newPlan.monthly_price,
        })
        .eq('stripe_subscription_id', subscriptionId);

      // Update usage limits
      await this.updateUsageTracking(subscription.metadata.organization_id, newPlan);

      return { success: true, subscription: updatedSubscription };
    }

    return { success: false };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately = false) {
    this.checkStripeConfigured();
    if (immediately) {
      await this.stripe!.subscriptions.cancel(subscriptionId);
      
      await this.supabase
        .from('billing_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);
    } else {
      await this.stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      await this.supabase
        .from('billing_subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);
    }

    return { success: true };
  }

  /**
   * Create checkout session for a plan
   */
  async createCheckoutSession(
    organizationId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ) {
    // Get plan details
    const { data: plan } = await this.supabase
      .from('billing_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get organization details
    const { data: org } = await this.supabase
      .from('organizations')
      .select('name, contact_email')
      .eq('id', organizationId)
      .single();

    // Ensure plan is synced to Stripe
    if (!plan.stripe_product_id) {
      await this.syncPlanToStripe(plan);
    }

    const priceId = billingCycle === 'annual' 
      ? plan.stripe_annual_price_id 
      : plan.stripe_monthly_price_id;

    const session = await this.stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: org?.contact_email,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          organization_id: organizationId,
          plan_id: planId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(organizationId: string, returnUrl: string) {
    this.checkStripeConfigured();
    // Get customer ID
    const { data: subscription } = await this.supabase
      .from('billing_subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!subscription?.stripe_customer_id) {
      throw new Error('No subscription found');
    }

    const session = await this.stripe!.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return {
      url: session.url,
    };
  }

  /**
   * Sync plan to Stripe
   */
  private async syncPlanToStripe(plan: any) {
    // Create product in Stripe if it doesn't exist
    let productId = plan.stripe_product_id;
    
    if (!productId) {
      const product = await this.stripe!.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          plan_id: plan.id,
        },
      });
      
      productId = product.id;
      
      // Save product ID
      await this.supabase
        .from('billing_plans')
        .update({ stripe_product_id: productId })
        .eq('id', plan.id);
    }

    // Create prices
    if (plan.monthly_price && !plan.stripe_monthly_price_id) {
      const monthlyPrice = await this.stripe!.prices.create({
        product: productId,
        unit_amount: Math.round(plan.monthly_price * 100), // Convert to pence
        currency: plan.currency || 'gbp',
        recurring: {
          interval: 'month',
        },
        metadata: {
          plan_id: plan.id,
          billing_cycle: 'monthly',
        },
      });

      await this.supabase
        .from('billing_plans')
        .update({ stripe_monthly_price_id: monthlyPrice.id })
        .eq('id', plan.id);
    }

    if (plan.annual_price && !plan.stripe_annual_price_id) {
      const annualPrice = await this.stripe!.prices.create({
        product: productId,
        unit_amount: Math.round(plan.annual_price * 100), // Convert to pence
        currency: plan.currency || 'gbp',
        recurring: {
          interval: 'year',
        },
        metadata: {
          plan_id: plan.id,
          billing_cycle: 'annual',
        },
      });

      await this.supabase
        .from('billing_plans')
        .update({ stripe_annual_price_id: annualPrice.id })
        .eq('id', plan.id);
    }
  }

  /**
   * Create Stripe price for a plan
   */
  private async createStripePrice(plan: any, billingCycle: 'monthly' | 'annual'): Promise<string> {
    await this.syncPlanToStripe(plan);
    
    return billingCycle === 'annual' 
      ? plan.stripe_annual_price_id 
      : plan.stripe_monthly_price_id;
  }

  /**
   * Get promotion code
   */
  private async getPromotionCode(code: string): Promise<Stripe.PromotionCode | null> {
    const promotionCodes = await this.stripe!.promotionCodes.list({
      code: code,
      active: true,
      limit: 1,
    });

    return promotionCodes.data[0] || null;
  }

  /**
   * Initialize usage tracking for new subscription
   */
  private async initializeUsageTracking(organizationId: string, plan: any) {
    const trackingData = [
      { resource_type: 'members', limit_amount: plan.max_members },
      { resource_type: 'staff', limit_amount: plan.max_staff },
      { resource_type: 'emails', limit_amount: plan.max_email_sends_per_month },
      { resource_type: 'sms', limit_amount: plan.max_sms_sends_per_month },
      { resource_type: 'whatsapp', limit_amount: plan.max_whatsapp_sends_per_month },
      { resource_type: 'ai_credits', limit_amount: plan.max_ai_credits_per_month },
    ].filter(item => item.limit_amount !== null);

    for (const tracking of trackingData) {
      await this.supabase
        .from('billing_usage_tracking')
        .upsert({
          organization_id: organizationId,
          ...tracking,
          current_usage: 0,
          reset_at: this.getNextResetDate(),
        });
    }
  }

  /**
   * Update usage tracking when plan changes
   */
  private async updateUsageTracking(organizationId: string, newPlan: any) {
    const updates = [
      { resource_type: 'members', limit_amount: newPlan.max_members },
      { resource_type: 'staff', limit_amount: newPlan.max_staff },
      { resource_type: 'emails', limit_amount: newPlan.max_email_sends_per_month },
      { resource_type: 'sms', limit_amount: newPlan.max_sms_sends_per_month },
      { resource_type: 'whatsapp', limit_amount: newPlan.max_whatsapp_sends_per_month },
      { resource_type: 'ai_credits', limit_amount: newPlan.max_ai_credits_per_month },
    ];

    for (const update of updates) {
      await this.supabase
        .from('billing_usage_tracking')
        .upsert({
          organization_id: organizationId,
          ...update,
        });
    }
  }

  /**
   * Get next reset date (first of next month)
   */
  private getNextResetDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    // Log event
    await this.supabase.from('billing_events').insert({
      organization_id: event.data.object.metadata?.organization_id,
      event_type: event.type,
      event_data: event.data.object,
      stripe_event_id: event.id,
    });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    await this.supabase
      .from('billing_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await this.supabase
      .from('billing_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Save invoice to database
    await this.supabase.from('billing_invoices').upsert({
      organization_id: invoice.metadata?.organization_id,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: invoice.subscription as string,
      invoice_number: invoice.number,
      status: 'paid',
      subtotal: invoice.subtotal / 100,
      tax_amount: invoice.tax || 0 / 100,
      total_amount: invoice.total / 100,
      amount_paid: invoice.amount_paid / 100,
      amount_due: 0,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
      invoice_pdf_url: invoice.invoice_pdf,
      line_items: invoice.lines.data,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Update subscription status
    await this.supabase
      .from('billing_subscriptions')
      .update({
        status: 'past_due',
      })
      .eq('stripe_subscription_id', invoice.subscription);

    // TODO: Send notification email
  }
}

// Export singleton instance
export const stripeBillingService = new StripeBillingService();