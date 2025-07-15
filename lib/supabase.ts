import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client
export const createSupabaseClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// =============================================
// EXISTING TYPES (Employee Onboarding)
// =============================================

export type Employee = {
  id: string;
  name: string;
  email: string;
  job_title: string;
  annual_salary: number;
  hours_per_week: number;
  location: string;
  start_date: string;
  created_at: string;
};

export type OnboardingSession = {
  id: string;
  employee_id: string;
  token: string;
  expires_at: string;
  completed: boolean;
  completed_at: string | null;
  signature_name: string | null;
  signature_date: string | null;
  documents_saved: boolean;
  created_at: string;
};

// =============================================
// CRM TYPES
// =============================================

export type Organization = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'staff';
  permissions: Record<string, unknown>;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source: 'facebook' | 'google' | 'instagram' | 'website' | 'referral' | 'walk-in' | 'phone' | 'email' | 'other' | 'unknown';
  campaign_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  status: 'new' | 'contacted' | 'qualified' | 'interested' | 'not_interested' | 'follow_up' | 'converted' | 'lost';
  qualification_score?: number;
  ai_qualification?: Record<string, unknown>;
  interests?: string[];
  goals?: string;
  budget_range?: string;
  preferred_contact_method?: 'email' | 'phone' | 'sms' | 'whatsapp';
  assigned_to?: string;
  last_contacted?: string;
  next_follow_up?: string;
  conversion_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

export type LeadActivity = {
  id: string;
  lead_id: string;
  user_id?: string;
  type: 'call' | 'email' | 'sms' | 'whatsapp' | 'meeting' | 'note' | 'status_change' | 'assignment' | 'ai_qualification';
  subject?: string;
  content?: string;
  outcome?: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Client = {
  id: string;
  organization_id: string;
  lead_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relationship?: string;
  medical_conditions?: string;
  medications?: string;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string;
  status: 'active' | 'inactive' | 'frozen' | 'cancelled';
  assigned_trainer?: string;
  joined_date: string;
  last_visit?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
};

export type MembershipPlan = {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  features?: string[];
  access_level: 'basic' | 'premium' | 'vip';
  class_limit?: number;
  guest_passes?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  client_id: string;
  plan_id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  monthly_price: number;
  billing_date?: number;
  last_payment_date?: string;
  next_payment_date?: string;
  classes_used?: number;
  guest_passes_used?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type Campaign = {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: 'facebook' | 'google' | 'instagram' | 'email' | 'sms' | 'whatsapp' | 'referral' | 'other';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget?: number;
  start_date?: string;
  end_date?: string;
  target_audience?: Record<string, unknown>;
  location_targeting?: string[];
  age_range?: Record<string, unknown>;
  interests?: string[];
  headline?: string;
  ad_description?: string;
  image_url?: string;
  video_url?: string;
  call_to_action?: string;
  landing_page_url?: string;
  created_by?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CommunicationTemplate = {
  id: string;
  organization_id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  subject?: string;
  content: string;
  variables: Record<string, unknown>;
  is_active: boolean;
  category?: string;
  created_at: string;
  updated_at: string;
};

export type Communication = {
  id: string;
  organization_id: string;
  lead_id?: string;
  client_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  template_id?: string;
  subject?: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  sent_by?: string;
  metadata: Record<string, unknown>;
  created_at: string;
};