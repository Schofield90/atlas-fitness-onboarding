import { z } from "zod";
import {
  AttendanceFiltersSchema,
  InvoiceFiltersSchema,
  PayoutFiltersSchema,
  DiscountCodeFiltersSchema,
  DatePreset,
  type AttendanceFilters,
  type InvoiceFilters,
  type PayoutFilters,
  type DiscountCodeFilters,
  type ReportType,
} from "./types";

// ====================
// DATE UTILITIES
// ====================

/**
 * Get timezone offset for a given timezone
 */
export function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const targetTime = new Date(
      utc.toLocaleString("en-US", { timeZone: timezone }),
    );
    const offset = (utc.getTime() - targetTime.getTime()) / (1000 * 60 * 60);

    const sign = offset >= 0 ? "+" : "-";
    const hours = Math.floor(Math.abs(offset));
    const minutes = Math.round((Math.abs(offset) - hours) * 60);

    return `${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  } catch (error) {
    console.warn(`Invalid timezone ${timezone}, using UTC`);
    return "+00:00";
  }
}

/**
 * Convert date to organization timezone
 */
export function toOrgTimezone(
  date: Date | string,
  timezone: string = "UTC",
): Date {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (timezone === "UTC") {
    return dateObj;
  }

  try {
    // Create a date in the target timezone
    const utcTime = dateObj.getTime() + dateObj.getTimezoneOffset() * 60000;
    const targetTime = new Date(utcTime);
    return targetTime;
  } catch (error) {
    console.warn(`Error converting to timezone ${timezone}:`, error);
    return dateObj;
  }
}

/**
 * Format date for SQL queries with timezone
 */
export function formatDateForSQL(
  date: Date | string,
  timezone: string = "UTC",
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const tzDate = toOrgTimezone(dateObj, timezone);
  return tzDate.toISOString();
}

// ====================
// DATE PRESETS
// ====================

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    value: "today",
    description: "From start of today to now",
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();
      return { from: today, to: now };
    },
  },
  {
    label: "Yesterday",
    value: "yesterday",
    description: "Full day yesterday",
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return { from: yesterday, to: endOfYesterday };
    },
  },
  {
    label: "Last 7 Days",
    value: "last_7_days",
    description: "Past week including today",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: end };
    },
  },
  {
    label: "Last 30 Days",
    value: "last_30_days",
    description: "Past month including today",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: end };
    },
  },
  {
    label: "This Week",
    value: "this_week",
    description: "Monday to Sunday of current week",
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
      start.setDate(today.getDate() - daysToMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { from: start, to: end };
    },
  },
  {
    label: "Last Week",
    value: "last_week",
    description: "Previous Monday to Sunday",
    getValue: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;

      const start = new Date(today);
      start.setDate(today.getDate() - daysToLastMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      return { from: start, to: end };
    },
  },
  {
    label: "This Month",
    value: "this_month",
    description: "From 1st of current month to now",
    getValue: () => {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const end = new Date();
      return { from: start, to: end };
    },
  },
  {
    label: "Last Month",
    value: "last_month",
    description: "Full previous month",
    getValue: () => {
      const today = new Date();
      const start = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
        0,
        0,
        0,
        0,
      );
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
      return { from: start, to: end };
    },
  },
  {
    label: "This Quarter",
    value: "this_quarter",
    description: "From start of current quarter to now",
    getValue: () => {
      const today = new Date();
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      const end = new Date();
      return { from: start, to: end };
    },
  },
  {
    label: "This Year",
    value: "this_year",
    description: "From January 1st to now",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date();
      return { from: start, to: end };
    },
  },
];

/**
 * Get date preset by value
 */
export function getDatePreset(value: string): DatePreset | null {
  return DEFAULT_DATE_PRESETS.find((preset) => preset.value === value) || null;
}

/**
 * Resolve date preset or custom range
 */
export function resolveDateRange(
  preset?: string,
  customFrom?: string,
  customTo?: string,
  timezone: string = "UTC",
): { from: Date; to: Date } {
  if (preset) {
    const presetObj = getDatePreset(preset);
    if (presetObj) {
      const { from, to } = presetObj.getValue();
      return {
        from: toOrgTimezone(from, timezone),
        to: toOrgTimezone(to, timezone),
      };
    }
  }

  if (customFrom && customTo) {
    return {
      from: toOrgTimezone(new Date(customFrom), timezone),
      to: toOrgTimezone(new Date(customTo), timezone),
    };
  }

  // Default to last 30 days
  const defaultPreset = getDatePreset("last_30_days")!;
  const { from, to } = defaultPreset.getValue();
  return {
    from: toOrgTimezone(from, timezone),
    to: toOrgTimezone(to, timezone),
  };
}

// ====================
// QUERY PARAMETER PARSING
// ====================

/**
 * Parse query parameters from URLSearchParams
 */
export function parseQueryParams(
  searchParams: URLSearchParams,
): Record<string, any> {
  const params: Record<string, any> = {};

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Handle multiple values (convert to array)
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      // Try to parse as appropriate type
      if (value === "true" || value === "false") {
        params[key] = value === "true";
      } else if (/^\d+$/.test(value)) {
        params[key] = parseInt(value, 10);
      } else if (/^\d+\.\d+$/.test(value)) {
        params[key] = parseFloat(value);
      } else {
        params[key] = value;
      }
    }
  }

  return params;
}

/**
 * Normalize query parameters for consistent handling
 */
export function normalizeQueryParams(
  params: Record<string, any>,
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // Convert single values to arrays for multi-select filters
    const multiSelectFields = [
      "booking_method",
      "booking_source",
      "status",
      "payment_method",
    ];

    if (multiSelectFields.includes(key)) {
      normalized[key] = Array.isArray(value) ? value : [value];
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
}

// ====================
// FILTER VALIDATION
// ====================

/**
 * Validate filters based on report type
 */
export function validateFilters<T>(
  reportType: ReportType,
  filters: any,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    let schema: z.ZodSchema;

    switch (reportType) {
      case "attendance":
        schema = AttendanceFiltersSchema;
        break;
      case "invoice":
        schema = InvoiceFiltersSchema;
        break;
      case "payout":
        schema = PayoutFiltersSchema;
        break;
      case "discount_code":
        schema = DiscountCodeFiltersSchema;
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    const data = schema.parse(filters) as T;
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validate attendance filters specifically
 */
export function validateAttendanceFilters(filters: any): AttendanceFilters {
  return AttendanceFiltersSchema.parse(filters);
}

/**
 * Validate invoice filters specifically
 */
export function validateInvoiceFilters(filters: any): InvoiceFilters {
  return InvoiceFiltersSchema.parse(filters);
}

/**
 * Validate payout filters specifically
 */
export function validatePayoutFilters(filters: any): PayoutFilters {
  return PayoutFiltersSchema.parse(filters);
}

/**
 * Validate discount code filters specifically
 */
export function validateDiscountCodeFilters(filters: any): DiscountCodeFilters {
  return DiscountCodeFiltersSchema.parse(filters);
}

// ====================
// QUERY BUILDERS
// ====================

/**
 * Build WHERE clause conditions for common filters
 */
export function buildWhereConditions(
  filters: Record<string, any>,
  organizationId: string,
): { conditions: string[]; params: Record<string, any> } {
  const conditions: string[] = ["organization_id = $organizationId"];
  const params: Record<string, any> = { organizationId };

  let paramIndex = 1;

  // Date range conditions
  if (filters.date_from) {
    paramIndex++;
    conditions.push(`created_at >= $${paramIndex}`);
    params[`param${paramIndex}`] = filters.date_from;
  }

  if (filters.date_to) {
    paramIndex++;
    conditions.push(`created_at <= $${paramIndex}`);
    params[`param${paramIndex}`] = filters.date_to;
  }

  // Array conditions (IN clauses)
  const arrayFields = [
    "status",
    "booking_method",
    "booking_source",
    "payment_method",
  ];
  for (const field of arrayFields) {
    if (
      filters[field] &&
      Array.isArray(filters[field]) &&
      filters[field].length > 0
    ) {
      paramIndex++;
      conditions.push(`${field} = ANY($${paramIndex})`);
      params[`param${paramIndex}`] = filters[field];
    }
  }

  // UUID conditions
  const uuidFields = [
    "customer_id",
    "class_type_id",
    "venue_id",
    "instructor_id",
    "membership_id",
  ];
  for (const field of uuidFields) {
    if (filters[field]) {
      paramIndex++;
      conditions.push(`${field} = $${paramIndex}`);
      params[`param${paramIndex}`] = filters[field];
    }
  }

  // Numeric range conditions
  if (filters.amount_min !== undefined) {
    paramIndex++;
    conditions.push(`total_amount_pennies >= $${paramIndex}`);
    params[`param${paramIndex}`] = filters.amount_min;
  }

  if (filters.amount_max !== undefined) {
    paramIndex++;
    conditions.push(`total_amount_pennies <= $${paramIndex}`);
    params[`param${paramIndex}`] = filters.amount_max;
  }

  return { conditions, params };
}

/**
 * Build ORDER BY clause based on group_by parameter
 */
export function buildOrderByClause(
  groupBy: string,
  sortField?: string,
  sortDirection: "asc" | "desc" = "desc",
): string {
  if (groupBy === "each") {
    // Individual records - sort by date/time fields
    const defaultSorts: Record<string, string> = {
      attendance: "class_start_at DESC",
      invoice: "created_at DESC",
      payout: "class_date DESC",
      discount_code: "used_at DESC",
    };

    if (sortField) {
      return `${sortField} ${sortDirection.toUpperCase()}`;
    }

    return "created_at DESC";
  } else {
    // Grouped data - sort by aggregate values
    const groupSorts: Record<string, string> = {
      customer: "total_count DESC",
      class_type: "total_count DESC",
      venue: "total_count DESC",
      instructor: "total_count DESC",
      month: "period ASC",
      week: "period ASC",
      year: "period ASC",
    };

    return groupSorts[groupBy] || "total_count DESC";
  }
}

/**
 * Generate cache key for query results
 */
export function generateCacheKey(
  reportType: ReportType,
  organizationId: string,
  filters: Record<string, any>,
): string {
  // Sort filters for consistent cache keys
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce(
      (result, key) => {
        result[key] = filters[key];
        return result;
      },
      {} as Record<string, any>,
    );

  const filterString = JSON.stringify(sortedFilters);
  const hash = Buffer.from(filterString).toString("base64").slice(0, 16);

  return `report:${reportType}:${organizationId}:${hash}`;
}

// ====================
// ERROR HANDLING
// ====================

export class ReportQueryError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "ReportQueryError";
  }
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(
  error: z.ZodError,
): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

// ====================
// UTILITIES
// ====================

/**
 * Check if date range is too large (more than 1 year)
 */
export function isDateRangeTooLarge(from: Date, to: Date): boolean {
  const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds
  return to.getTime() - from.getTime() > oneYear;
}

/**
 * Check if query might be expensive based on filters
 */
export function isExpensiveQuery(filters: Record<string, any>): boolean {
  // Large date range
  if (filters.date_from && filters.date_to) {
    const from = new Date(filters.date_from);
    const to = new Date(filters.date_to);
    if (isDateRangeTooLarge(from, to)) {
      return true;
    }
  }

  // Large page size
  if (filters.page_size > 1000) {
    return true;
  }

  // No specific filters (could return all data)
  const hasSpecificFilters = Object.keys(filters).some(
    (key) =>
      !["date_from", "date_to", "tz", "group_by", "page", "page_size"].includes(
        key,
      ) &&
      filters[key] !== undefined &&
      filters[key] !== null,
  );

  return !hasSpecificFilters;
}
