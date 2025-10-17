import { z } from "zod";

// ====================
// COMMON FILTER TYPES
// ====================

export const DateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(500).default(50),
});

export const GroupBySchema = z.enum([
  "each",
  "customer",
  "class_type",
  "venue",
  "instructor",
  "day_of_week",
  "start_time",
  "booking_method",
  "status",
  "booking_source",
  "month",
  "week",
  "year",
]);

// ====================
// ATTENDANCE REPORTS
// ====================

export const AttendanceFiltersSchema = z
  .object({
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    tz: z.string().default("UTC"),
    customer_id: z.string().uuid().optional(),
    class_type_id: z.string().uuid().optional(),
    venue_id: z.string().uuid().optional(),
    instructor_id: z.string().uuid().optional(),
    booking_method: z
      .array(z.enum(["membership", "drop_in", "free", "package"]))
      .optional(),
    booking_source: z
      .array(z.enum(["web", "kiosk", "mobile_app", "staff", "api"]))
      .optional(),
    membership_id: z.string().uuid().optional(),
    status: z
      .array(z.enum(["registered", "attended", "late_cancelled", "no_show"]))
      .optional(),
    include_future: z.boolean().default(false),
    group_by: GroupBySchema.default("each"),
  })
  .merge(PaginationSchema);

export type AttendanceFilters = z.infer<typeof AttendanceFiltersSchema>;

export interface AttendanceRecord {
  booking_id: string;
  organization_id: string;
  class_id: string;
  class_start_at: string;
  class_end_at: string;
  class_timezone: string;
  room_location?: string;
  class_type_name: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  instructor_ids: string[];
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_id?: string;
  membership_name?: string;
  membership_active: boolean;
  attendance_status: "registered" | "attended" | "late_cancelled" | "no_show";
  booking_method: "membership" | "drop_in" | "free" | "package";
  booking_source: "web" | "kiosk" | "mobile_app" | "staff" | "api";
  checked_in_at?: string;
  checked_out_at?: string;
  payment_amount_pennies: number;
  booking_created_at: string;
  booking_updated_at: string;
  attended: boolean;
  minutes_late?: number;
  was_late: boolean;
}

export interface AttendanceGroupedData {
  group_key: string;
  group_label: string;
  total_bookings: number;
  attended_count: number;
  no_show_count: number;
  cancelled_count: number;
  registered_count: number;
  attendance_rate: number;
}

// ====================
// INVOICE REPORTS
// ====================

export const InvoiceFiltersSchema = z
  .object({
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    tz: z.string().default("UTC"),
    customer_id: z.string().uuid().optional(),
    status: z
      .array(z.enum(["draft", "sent", "paid", "overdue", "cancelled"]))
      .optional(),
    payment_method: z
      .array(z.enum(["card", "bank_transfer", "cash", "direct_debit"]))
      .optional(),
    amount_min: z.number().int().min(0).optional(),
    amount_max: z.number().int().optional(),
    invoice_number: z.string().optional(),
    group_by: z
      .enum(["each", "customer", "month", "week", "status", "payment_method"])
      .default("each"),
  })
  .merge(PaginationSchema);

export type InvoiceFilters = z.infer<typeof InvoiceFiltersSchema>;

export interface InvoiceRecord {
  invoice_id: string;
  organization_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  total_amount_pennies: number;
  tax_amount_pennies: number;
  net_amount_pennies: number;
  currency: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  payment_method?: "card" | "bank_transfer" | "cash" | "direct_debit";
  created_at: string;
  updated_at: string;
}

export interface InvoiceGroupedData {
  group_key: string;
  group_label: string;
  total_invoices: number;
  total_amount_pennies: number;
  paid_amount_pennies: number;
  outstanding_amount_pennies: number;
  payment_rate: number;
}

// ====================
// PAYOUT REPORTS
// ====================

export const PayoutFiltersSchema = z
  .object({
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    tz: z.string().default("UTC"),
    instructor_id: z.string().uuid().optional(),
    class_type_id: z.string().uuid().optional(),
    venue_id: z.string().uuid().optional(),
    status: z.array(z.enum(["pending", "paid", "cancelled"])).optional(),
    amount_min: z.number().int().min(0).optional(),
    amount_max: z.number().int().optional(),
    group_by: z
      .enum(["each", "instructor", "class_type", "venue", "month", "week"])
      .default("each"),
  })
  .merge(PaginationSchema);

export type PayoutFilters = z.infer<typeof PayoutFiltersSchema>;

export interface PayoutRecord {
  payout_id: string;
  organization_id: string;
  instructor_id: string;
  instructor_name: string;
  instructor_email: string;
  class_id: string;
  class_type_name: string;
  class_date: string;
  venue_name: string;
  hours_taught: number;
  hourly_rate_pennies: number;
  bonus_amount_pennies: number;
  total_amount_pennies: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  payment_date?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutGroupedData {
  group_key: string;
  group_label: string;
  total_payouts: number;
  total_amount_pennies: number;
  paid_amount_pennies: number;
  pending_amount_pennies: number;
  average_hourly_rate: number;
}

// ====================
// DISCOUNT CODE REPORTS
// ====================

export const DiscountCodeFiltersSchema = z
  .object({
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    tz: z.string().default("UTC"),
    code_id: z.string().uuid().optional(),
    code: z.string().optional(),
    usage_type: z.enum(["membership", "class", "product"]).optional(),
    customer_id: z.string().uuid().optional(),
    group_by: z
      .enum(["each", "code", "customer", "usage_type", "month", "week"])
      .default("each"),
  })
  .merge(PaginationSchema);

export type DiscountCodeFilters = z.infer<typeof DiscountCodeFiltersSchema>;

export interface DiscountCodeRecord {
  usage_id: string;
  organization_id: string;
  code_id: string;
  code: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  usage_type: "membership" | "class" | "product";
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  original_amount_pennies: number;
  discount_amount_pennies: number;
  final_amount_pennies: number;
  currency: string;
  used_at: string;
  invoice_id?: string;
}

export interface DiscountCodeGroupedData {
  group_key: string;
  group_label: string;
  total_uses: number;
  total_discount_amount_pennies: number;
  total_original_amount_pennies: number;
  savings_rate: number;
  unique_customers: number;
}

// ====================
// COMMON RESPONSE TYPES
// ====================

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ReportResponse<TRecord = any, TGrouped = any> {
  success: boolean;
  data: {
    records?: TRecord[];
    grouped_data?: TGrouped[];
    pagination?: PaginationMeta;
    total_count: number;
    group_by: string;
    filters_applied: Record<string, any>;
    generated_at: string;
    timezone: string;
  };
  error?: string;
  details?: string;
}

// ====================
// CHART DATA TYPES
// ====================

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  metadata?: Record<string, any>;
}

export interface ChartDataResponse {
  success: boolean;
  data: {
    chart_data: ChartDataPoint[];
    chart_type: "daily" | "weekly" | "monthly" | "hourly" | "day_of_week";
    total_points: number;
    truncated?: boolean;
    max_value: number;
    min_value: number;
  };
  error?: string;
}

// ====================
// FILTER OPTION TYPES
// ====================

export interface FilterOption<T = string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone?: string;
  last_visit?: string;
}

export interface ClassTypeOption {
  id: string;
  name: string;
  duration_min: number;
  instructor_count?: number;
}

export interface VenueOption {
  id: string;
  name: string;
  capacity: number;
  address?: string;
}

export interface InstructorOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialties?: string[];
}

export interface MembershipOption {
  id: string;
  name: string;
  price_pennies: number;
  duration_months: number;
  active_count?: number;
}

// ====================
// DATE PRESET TYPES
// ====================

export interface DatePreset {
  label: string;
  value: string;
  getValue: () => { from: Date; to: Date };
  description?: string;
}

// ====================
// EXPORT TYPES
// ====================

export interface ExportConfig {
  format: "csv" | "xlsx";
  filename?: string;
  include_headers: boolean;
  timezone: string;
  currency: string;
  date_format: string;
}

export interface ExportField {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "currency" | "percentage" | "boolean";
  format?: string;
  transform?: (value: any) => any;
}

// ====================
// PERFORMANCE MONITORING
// ====================

export interface QueryPerformanceMetrics {
  query_id: string;
  organization_id: string;
  report_type: string;
  filters: Record<string, any>;
  execution_time_ms: number;
  row_count: number;
  cache_hit: boolean;
  cache_key?: string;
  executed_at: string;
}

export interface CacheMetrics {
  cache_key: string;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
  last_hit: string;
  last_miss: string;
  ttl_seconds: number;
}

// ====================
// ERROR TYPES
// ====================

export interface ReportError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  query_id?: string;
}

// ====================
// UTILITY TYPES
// ====================

export type ReportType =
  | "attendance"
  | "invoice"
  | "payout"
  | "discount_code"
  | "revenue";
export type GroupByOption = z.infer<typeof GroupBySchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// Type guards
export const isAttendanceRecord = (record: any): record is AttendanceRecord => {
  return record && typeof record.booking_id === "string";
};

export const isInvoiceRecord = (record: any): record is InvoiceRecord => {
  return record && typeof record.invoice_id === "string";
};

export const isPayoutRecord = (record: any): record is PayoutRecord => {
  return record && typeof record.payout_id === "string";
};

export const isDiscountCodeRecord = (
  record: any,
): record is DiscountCodeRecord => {
  return record && typeof record.usage_id === "string";
};
