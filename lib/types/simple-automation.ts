// Simplified Automation Types - Focus on Real Gym Needs

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  template_key: 'lead_follow_up' | 'dormant_member' | 'birthday_engagement' | 'trial_conversion' | 'payment_recovery';
  category: 'lead_management' | 'member_retention' | 'engagement' | 'recovery';
  default_config: Record<string, unknown>;
  expected_impact: string;
  setup_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymAutomation {
  id: string;
  organization_id: string;
  template_id: string;
  is_active: boolean;
  config: Record<string, unknown>;
  triggered_count: number;
  successful_count: number;
  last_triggered?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  template?: AutomationTemplate;
}

export interface AutomationExecution {
  id: string;
  organization_id: string;
  automation_id: string;
  template_key: string;
  lead_id?: string;
  client_id?: string;
  status: 'running' | 'completed' | 'failed';
  step_number: number;
  total_steps: number;
  actions_completed: number;
  sms_sent: number;
  emails_sent: number;
  tasks_created: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  context: Record<string, unknown>;
}

export interface SMSDelivery {
  id: string;
  organization_id: string;
  execution_id?: string;
  lead_id?: string;
  client_id?: string;
  phone_number: string;
  message_content: string;
  template_key?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  provider_response?: Record<string, unknown>;
  triggered_at: string;
  sent_at?: string;
  delivered_at?: string;
  cost_pence?: number;
  created_at: string;
}

export interface LeadResponseTracking {
  id: string;
  organization_id: string;
  lead_id: string;
  lead_created_at: string;
  first_sms_sent_at?: string;
  first_email_sent_at?: string;
  first_human_contact_at?: string;
  sms_response_time_minutes?: number;
  email_response_time_minutes?: number;
  human_response_time_minutes?: number;
  basic_score?: number;
  score_factors: Record<string, unknown>;
  responded_to_sms: boolean;
  responded_to_email: boolean;
  converted_to_trial: boolean;
  converted_to_member: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationJob {
  id: string;
  organization_id: string;
  job_type: string;
  template_key: string;
  lead_id?: string;
  client_id?: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  last_attempted?: string;
  completed_at?: string;
  error_message?: string;
  job_data: Record<string, unknown>;
  created_at: string;
}

// Configuration types for each template
export interface LeadFollowUpConfig {
  sms_delay_minutes: number;
  sms_message: string;
  email_delay_hours: number;
  email_subject: string;
  email_template?: string;
  task_delay_hours: number;
  task_message: string;
  assigned_user_id?: string;
}

export interface DormantMemberConfig {
  inactive_days: number;
  checkin_sms: string;
  offer_days: number;
  offer_sms: string;
  final_days: number;
  final_message: string;
  exclude_frozen_members: boolean;
}

export interface BirthdayEngagementConfig {
  birthday_sms: string;
  staff_task: string;
  offer_valid_days: number;
  include_guest_pass: boolean;
  assigned_user_id?: string;
}

export interface TrialConversionConfig {
  reminder_days_before: number;
  reminder_sms: string;
  offer_sms: string;
  followup_task: string;
  discount_percentage?: number;
  assigned_user_id?: string;
}

export interface PaymentRecoveryConfig {
  immediate_sms: string;
  reminder_delay_days: number;
  reminder_sms: string;
  staff_task_days: number;
  staff_task: string;
  max_attempts: number;
  assigned_user_id?: string;
}

// Dashboard metrics
export interface AutomationMetrics {
  total_executions: number;
  successful_executions: number;
  success_rate: number;
  avg_response_time_minutes: number;
  sms_sent_today: number;
  leads_contacted_today: number;
  conversion_rate: number;
  roi_estimate: number;
}

export interface LeadResponseMetrics {
  avg_sms_response_time: number; // minutes
  avg_email_response_time: number;
  avg_human_response_time: number;
  same_day_response_rate: number; // percentage
  leads_responded_today: number;
  fastest_response_time: number;
  slowest_response_time: number;
  under_5_min_rate: number; // percentage responding within 5 minutes
}

export interface TemplatePerformance {
  template_key: string;
  template_name: string;
  executions_count: number;
  success_rate: number;
  avg_completion_time_minutes: number;
  sms_delivery_rate: number;
  estimated_revenue_impact: number;
  is_active: boolean;
  last_executed?: string;
}

// Simplified automation engine interfaces
export interface AutomationContext {
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    source: string;
    created_at: string;
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    membership_status: string;
    last_visit?: string;
    trial_end_date?: string;
  };
  gym: {
    name: string;
    phone: string;
    email: string;
  };
  staff?: {
    name: string;
    email: string;
  };
}

export interface AutomationAction {
  type: 'sms' | 'email' | 'task' | 'wait' | 'score';
  delay_minutes?: number;
  config: Record<string, unknown>;
}

export interface AutomationResult {
  success: boolean;
  actions_completed: number;
  sms_sent: number;
  emails_sent: number;
  tasks_created: number;
  error?: string;
  execution_time_ms: number;
}

// API request/response types
export interface CreateAutomationRequest {
  template_id: string;
  config: Record<string, unknown>;
  is_active?: boolean;
}

export interface UpdateAutomationRequest {
  is_active?: boolean;
  config?: Record<string, unknown>;
}

export interface AutomationDashboardData {
  automations: GymAutomation[];
  templates: AutomationTemplate[];
  metrics: AutomationMetrics;
  response_metrics: LeadResponseMetrics;
  template_performance: TemplatePerformance[];
  recent_executions: AutomationExecution[];
}

// Template validation
export interface TemplateValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  estimated_monthly_cost: number;
  estimated_monthly_sends: number;
}

export type AutomationTemplateKey = 
  | 'lead_follow_up'
  | 'dormant_member' 
  | 'birthday_engagement'
  | 'trial_conversion'
  | 'payment_recovery';

export type AutomationCategory = 
  | 'lead_management'
  | 'member_retention'
  | 'engagement'
  | 'recovery';

// Types are already exported as interfaces above