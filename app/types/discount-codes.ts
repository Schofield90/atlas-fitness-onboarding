// Discount Codes Types for Usage Reporting

export type DiscountType = "percentage" | "fixed" | "trial";
export type UseType = "class" | "course" | "membership" | "store";

export interface DiscountCode {
  id: string;
  org_id: string;
  code: string;
  name: string;
  group_name?: string;
  active: boolean;
  discount_type: DiscountType;
  discount_value: number;
  max_uses?: number;
  current_uses: number;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountCodeUse {
  id: string;
  org_id: string;
  code_id: string;
  customer_id?: string;
  use_type: UseType;
  used_for?: string;
  used_at: string;
  invoice_id?: string;
  amount_discounted_cents: number;
}

export interface DiscountUsageRecord {
  id: string;
  org_id: string;
  code_id: string;
  customer_id?: string;
  use_type: UseType;
  used_for?: string;
  used_at: string;
  invoice_id?: string;
  amount_discounted_cents: number;

  // Discount code details
  code: string;
  discount_name: string;
  group_name?: string;
  discount_type: DiscountType;
  discount_value: number;
  code_active: boolean;

  // Customer details
  first_name?: string;
  last_name?: string;
  email?: string;
  customer_name?: string;

  // Date extraction fields
  use_year: string;
  use_month: string;
  use_week: string;
  use_day: string;
  day_of_week: number;
  hour_of_day: number;
}

export interface DiscountCodeFilters {
  view?: "all" | "grouped";
  customer_id?: string;
  code_id?: string;
  group_name?: string;
  use_type?: UseType;
  date_from?: string;
  date_to?: string;
  group_by?: DiscountGroupBy;
  page?: number;
  page_size?: number;
}

export type DiscountGroupBy =
  | "each"
  | "customer"
  | "discount_code"
  | "group"
  | "use_type"
  | "use_year"
  | "use_month";

export interface DiscountGroupedData {
  group_key: string;
  group_label: string;
  total_uses: number;
  unique_codes: number;
  total_discounted_cents: number;
  average_discount_cents: number;
  use_types: string[];
  customers_count: number;
  most_used_code?: string;
  most_used_code_uses?: number;
}

export interface DiscountPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface DiscountCodeResponse {
  success: boolean;
  data: {
    uses?: DiscountUsageRecord[];
    grouped_data?: DiscountGroupedData[];
    pagination?: DiscountPagination;
    total_count: number;
    view: "all" | "grouped";
    group_by?: DiscountGroupBy;
  };
  error?: string;
}

export interface DiscountSummaryStats {
  total_uses: number;
  unique_codes_used: number;
  total_discounted_cents: number;
  average_discount_cents: number;
  most_popular_code: {
    code: string;
    name: string;
    uses: number;
  } | null;
  most_popular_group: {
    group_name: string;
    uses: number;
  } | null;
  use_type_breakdown: {
    [key in UseType]: number;
  };
}

// Filter option types for UI components
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
}

export interface DiscountCodeOption {
  id: string;
  code: string;
  name: string;
  group_name?: string;
  active: boolean;
}

export interface GroupOption {
  group_name: string;
  codes_count: number;
  total_uses: number;
}

// Date preset types
export interface DatePreset {
  label: string;
  getValue: () => { from: Date; to: Date };
}

// Export configuration
export interface ExportConfig {
  format: "csv";
  filename?: string;
  filters: DiscountCodeFilters;
}

// Chart data types
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  total_discounted?: number;
  use_count?: number;
}

export interface ChartDataResponse {
  success: boolean;
  data: {
    chart_data: ChartDataPoint[];
    chart_type: "daily" | "weekly" | "monthly" | "by_code" | "by_type";
    total_points: number;
    truncated?: boolean;
  };
  error?: string;
}

// API request/response types
export interface CreateDiscountCodeRequest {
  code: string;
  name: string;
  group_name?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface CreateDiscountUseRequest {
  code_id: string;
  customer_id?: string;
  use_type: UseType;
  used_for?: string;
  invoice_id?: string;
  amount_discounted_cents: number;
}

// Validation types
export interface DiscountValidationResult {
  is_valid: boolean;
  discount_amount_cents: number;
  final_amount_cents: number;
  discount_id?: string;
  message: string;
}

// Form types for UI
export interface DiscountCodeFormData {
  code: string;
  name: string;
  group_name: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

export interface FilterFormData {
  dateFrom: string;
  dateTo: string;
  customerId: string;
  codeId: string;
  groupName: string;
  useType: UseType | "";
  groupBy: DiscountGroupBy;
  view: "all" | "grouped";
}
