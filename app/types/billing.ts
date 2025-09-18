// Billing types for upcoming billing schedules and pending payments

export interface BillingSchedule {
  id: string;
  organization_id: string;
  customer_id: string;
  customer_membership_id: string | null;
  due_at: string;
  amount_cents: number;
  processor: "stripe" | "gocardless" | "cash" | "account_credit";
  status: "scheduled" | "paused" | "skipped";
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // View fields
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  customer_name: string;
  membership_plan_id: string | null;
  membership_plan_name: string | null;
  membership_price_cents: number | null;
  amount: number; // Calculated field (amount_cents / 100)
}

export interface PendingPayment {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  customer_id: string;
  pending_type: "online" | "offline";
  amount_cents: number;
  processor: "stripe" | "gocardless" | "cash" | "account_credit";
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // View fields
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  customer_name: string;
  invoice_date: string | null;
  invoice_number: string | null;
  amount: number; // Calculated field (amount_cents / 100)
}

export interface BillingScheduleFilters {
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  membership_id?: string;
  processor?: string[];
  status?: string[];
  search?: string;
  page?: number;
  page_size?: number;
}

export interface PendingPaymentFilters {
  pending_type?: "online" | "offline";
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  processor?: string[];
  search?: string;
  page?: number;
  page_size?: number;
}

export interface BillingSchedulesResponse {
  success: boolean;
  data: {
    schedules: BillingSchedule[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    summary: {
      total_scheduled: number;
      total_amount_cents: number;
      total_amount: number;
      paused_count: number;
      paused_amount_cents: number;
      paused_amount: number;
      this_week_count: number;
      this_week_amount_cents: number;
      this_week_amount: number;
      next_week_count: number;
      next_week_amount_cents: number;
      next_week_amount: number;
    };
  };
}

export interface PendingPaymentsResponse {
  success: boolean;
  data: {
    payments: PendingPayment[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    summary: {
      total_pending: number;
      total_amount_cents: number;
      total_amount: number;
      online_pending: number;
      online_amount_cents: number;
      online_amount: number;
      offline_pending: number;
      offline_amount_cents: number;
      offline_amount: number;
    };
  };
}

export interface BillingScheduleAction {
  action: "pause" | "resume" | "skip";
  reason?: string;
}

export interface BillingActionResponse {
  success: boolean;
  message: string;
}

export interface DatePreset {
  label: string;
  getValue: () => { from: Date; to: Date };
}

export interface CustomerOption {
  value: string;
  label: string;
  email?: string;
}

export interface MembershipOption {
  value: string;
  label: string;
  customer_name?: string;
}
