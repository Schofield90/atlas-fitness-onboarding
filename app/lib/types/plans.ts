// Plans and Subscription Management Types

export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type PlanTier = 'starter' | 'professional' | 'enterprise' | 'custom'

// Feature flags that can be enabled/disabled
export interface PlanFeatures {
  // Staff & User Management
  staff_accounts: number | -1 // -1 for unlimited
  
  // Booking & Classes
  monthly_bookings: number | -1
  max_classes_per_month: number | -1
  class_waitlists: boolean
  recurring_bookings: boolean
  
  // Communication
  sms_credits: number | -1
  email_credits: number | -1
  whatsapp_credits?: number | -1
  voice_calls: boolean
  
  // Forms & Automation
  custom_forms: number | -1
  automation_workflows: number | -1
  advanced_triggers: boolean
  conditional_logic: boolean
  
  // Integrations & API
  api_access: boolean
  facebook_leads: boolean
  google_calendar: boolean
  zapier_integration: boolean
  webhook_endpoints: number
  
  // Branding & Customization
  white_label: boolean
  custom_domain: boolean
  custom_branding: boolean
  remove_atlas_branding: boolean
  
  // Advanced Features
  multi_location: boolean
  staff_permissions: boolean
  reporting_analytics: boolean
  data_export: boolean
  custom_fields: boolean
  
  // AI Features
  ai_chat_responses: boolean
  ai_lead_scoring: boolean
  ai_insights: boolean
  ai_recommendations: boolean
}

// Usage limits and quotas
export interface PlanLimits {
  // Customer & Data Limits
  max_customers: number | -1
  max_leads_per_month: number | -1
  
  // Storage
  storage_gb: number | -1
  file_uploads_mb: number
  
  // Communication Limits
  sms_per_month: number | -1
  emails_per_month: number | -1
  
  // Form & Automation Limits
  form_submissions_per_month: number | -1
  workflow_executions_per_month: number | -1
  
  // API & Integration Limits
  api_calls_per_month: number | -1
  webhook_calls_per_month: number | -1
  
  // Reporting Limits
  report_exports_per_month: number | -1
  data_retention_months: number
}

// Plan configuration for trials and discounts
export interface PlanConfig {
  trial_days: number
  setup_fee?: number // in pence
  discount_percentage?: number
  promotional_price?: number // in pence
  promotional_until?: Date
  requires_setup_call: boolean
  priority_support: boolean
  dedicated_success_manager: boolean
}

// Core plan interface
export interface SaasPlan {
  id: string
  name: string
  slug: string
  description?: string
  tier: PlanTier
  
  // Pricing
  price_monthly: number // in pence
  price_yearly: number // in pence
  price_setup?: number // in pence
  
  // Stripe integration
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  stripe_product_id?: string
  
  // Features and limits
  features: PlanFeatures
  limits: PlanLimits
  config: PlanConfig
  
  // Status
  is_active: boolean
  is_popular: boolean
  is_hidden: boolean
  sort_order: number
  
  // Metadata
  created_at: Date
  updated_at: Date
}

// Subscription interface
export interface SaasSubscription {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  
  // Billing cycle
  billing_cycle: BillingCycle
  
  // Stripe data
  stripe_subscription_id?: string
  stripe_customer_id?: string
  
  // Billing periods
  current_period_start: Date
  current_period_end: Date
  cancel_at_period_end: boolean
  canceled_at?: Date
  trial_start?: Date
  trial_end?: Date
  
  // Pricing
  amount: number // in pence
  currency: string
  
  // Usage tracking
  usage_updated_at: Date
  
  // Metadata
  created_at: Date
  updated_at: Date
  
  // Relations
  plan?: SaasPlan
  organization?: {
    id: string
    name: string
    email?: string
  }
}

// Usage metrics for billing and limits
export interface UsageMetrics {
  organization_id: string
  metric_date: Date
  
  // Core metrics
  active_customers: number
  active_staff: number
  bookings_created: number
  classes_scheduled: number
  
  // Communication metrics
  sms_sent: number
  emails_sent: number
  whatsapp_sent: number
  voice_calls_made: number
  
  // Feature usage
  forms_submitted: number
  workflows_executed: number
  reports_generated: number
  api_calls: number
  webhook_calls: number
  
  // Storage metrics
  storage_used_mb: number
  files_uploaded: number
  
  // Billing metrics
  revenue_processed: number // in pence
  transactions_processed: number
  
  created_at: Date
}

// Plan comparison data
export interface PlanComparison {
  feature_key: string
  feature_name: string
  feature_description?: string
  category: string
  feature_type: 'boolean' | 'number' | 'text'
  
  // Values for each plan
  starter_value: boolean | number | string | null
  professional_value: boolean | number | string | null
  enterprise_value: boolean | number | string | null
  
  // Display settings
  is_highlight: boolean
  sort_order: number
}

// Form interfaces for creating/editing plans
export interface CreatePlanRequest {
  name: string
  slug: string
  description?: string
  tier: PlanTier
  price_monthly: number
  price_yearly: number
  price_setup?: number
  features: Partial<PlanFeatures>
  limits: Partial<PlanLimits>
  config: Partial<PlanConfig>
  is_popular?: boolean
  sort_order?: number
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  id: string
  is_active?: boolean
  is_hidden?: boolean
}

// Subscription management interfaces
export interface CreateSubscriptionRequest {
  organization_id: string
  plan_id: string
  billing_cycle: BillingCycle
  trial_days?: number
  coupon_code?: string
}

export interface UpdateSubscriptionRequest {
  subscription_id: string
  plan_id?: string
  billing_cycle?: BillingCycle
  cancel_at_period_end?: boolean
  trial_end?: Date
}

// Usage tracking interfaces
export interface TrackUsageRequest {
  organization_id: string
  metric_type: keyof Omit<UsageMetrics, 'organization_id' | 'metric_date' | 'created_at'>
  increment?: number
  date?: Date
}

// Response interfaces
export interface PlansResponse {
  plans: SaasPlan[]
  total: number
}

export interface SubscriptionsResponse {
  subscriptions: SaasSubscription[]
  total: number
}

export interface UsageResponse {
  usage: UsageMetrics[]
  current_limits: PlanLimits
  usage_warnings: Array<{
    metric: string
    current: number
    limit: number
    percentage: number
  }>
}

// Error interfaces
export interface PlanError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// Feature categories for organization
export const FEATURE_CATEGORIES = {
  CORE: 'Core Features',
  COMMUNICATION: 'Communication',
  AUTOMATION: 'Automation & Workflows',
  INTEGRATIONS: 'Integrations',
  BRANDING: 'Branding & Customization',
  ADVANCED: 'Advanced Features',
  AI: 'AI Features',
  SUPPORT: 'Support & Success'
} as const

export type FeatureCategory = keyof typeof FEATURE_CATEGORIES

// Helper types for form validation
export type PlanFormErrors = Partial<Record<keyof CreatePlanRequest, string>>
export type SubscriptionFormErrors = Partial<Record<keyof CreateSubscriptionRequest, string>>