// Invoice types for the revenue reporting system

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_membership_id: string | null;
  membership_plan_id: string | null;
  membership_plan_name: string | null;
  status: "paid" | "pending" | "offline" | "retrying" | "failed";
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  fees_cents: number;
  total_cents: number;
  processor: "stripe" | "gocardless" | "cash" | "account_credit";
  invoice_date: string;
  payment_date: string | null;
  description: string | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
  // Calculated fields
  subtotal: number;
  tax: number;
  discount: number;
  fees: number;
  total: number;
  item_count: number;
  item_names: string[];
}

export interface InvoiceItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  item_type: "membership" | "class" | "course" | "store";
  item_id: string | null;
  name: string;
  qty: number;
  unit_price_cents: number;
  total_cents: number;
  tax_cents: number;
  discount_cents: number;
  created_at: string;
}

export interface InvoiceFilters {
  status?: string[];
  time?: "preset" | "custom";
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  membership_id?: string;
  processor?: string[];
  search?: string;
  page?: number;
  page_size?: number;
}

export interface InvoicesResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    summary: {
      total_invoices: number;
      total_amount_cents: number;
      total_amount: number;
      paid_amount_cents: number;
      paid_amount: number;
      pending_amount_cents: number;
      pending_amount: number;
      failed_amount_cents: number;
      failed_amount: number;
    };
  };
}

export interface InvoiceColumn {
  key: string;
  label: string;
  enabled: boolean;
  sortable?: boolean;
  width?: string;
}

export interface ColumnPreferences {
  columns: InvoiceColumn[];
}

export interface ReportPreference {
  id: string;
  user_id: string;
  report_key: string;
  columns_json: InvoiceColumn[];
  created_at: string;
  updated_at: string;
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

export interface InvoiceTab {
  key: string;
  label: string;
  status_filter?: string[];
  count?: number;
}
