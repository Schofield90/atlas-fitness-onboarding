import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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