import { NextResponse } from "next/server";
import { formatCurrency, formatDate, formatPercentage } from "./formatting";
import type { ExportConfig, ExportField, ReportType } from "./types";

// ====================
// CSV EXPORT UTILITIES
// ====================

/**
 * Convert data to CSV format with proper escaping
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  fields: ExportField[],
  config: ExportConfig,
): string {
  const lines: string[] = [];

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";

  // Add headers if requested
  if (config.include_headers) {
    const headers = fields.map((field) => escapeCSVValue(field.label));
    lines.push(headers.join(","));
  }

  // Add data rows
  for (const row of data) {
    const values = fields.map((field) => {
      let value = row[field.key];

      // Apply transformation if provided
      if (field.transform) {
        value = field.transform(value);
      }

      // Format based on type
      value = formatValueForExport(value, field, config);

      return escapeCSVValue(value);
    });

    lines.push(values.join(","));
  }

  return BOM + lines.join("\n");
}

/**
 * Escape CSV values properly
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if escaping is needed
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format value based on field type and config
 */
function formatValueForExport(
  value: any,
  field: ExportField,
  config: ExportConfig,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  switch (field.type) {
    case "currency":
      return formatCurrency(value, config.currency);

    case "date":
      return formatDate(value, config.date_format, config.timezone);

    case "percentage":
      return formatPercentage(value);

    case "boolean":
      return value ? "Yes" : "No";

    case "number":
      if (typeof value === "number") {
        return field.format
          ? value.toFixed(parseInt(field.format))
          : value.toString();
      }
      return String(value);

    case "string":
    default:
      return String(value);
  }
}

// ====================
// FIELD DEFINITIONS
// ====================

/**
 * Get export fields for attendance reports
 */
export function getAttendanceExportFields(): ExportField[] {
  return [
    { key: "booking_id", label: "Booking ID", type: "string" },
    {
      key: "customer_name",
      label: "Customer Name",
      type: "string",
      transform: (_, row) => `${row.first_name} ${row.last_name}`,
    },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "class_type_name", label: "Class Type", type: "string" },
    { key: "class_start_at", label: "Class Date & Time", type: "date" },
    { key: "venue_name", label: "Venue", type: "string" },
    { key: "room_location", label: "Room", type: "string" },
    { key: "duration_min", label: "Duration (min)", type: "number" },
    { key: "attendance_status", label: "Status", type: "string" },
    { key: "booking_method", label: "Booking Method", type: "string" },
    { key: "booking_source", label: "Booking Source", type: "string" },
    { key: "checked_in_at", label: "Checked In", type: "date" },
    { key: "checked_out_at", label: "Checked Out", type: "date" },
    { key: "was_late", label: "Late Arrival", type: "boolean" },
    { key: "minutes_late", label: "Minutes Late", type: "number", format: "0" },
    {
      key: "payment_amount_pennies",
      label: "Payment Amount",
      type: "currency",
    },
    { key: "membership_name", label: "Membership", type: "string" },
    { key: "membership_active", label: "Membership Active", type: "boolean" },
    { key: "booking_created_at", label: "Booking Created", type: "date" },
  ];
}

/**
 * Get export fields for invoice reports
 */
export function getInvoiceExportFields(): ExportField[] {
  return [
    { key: "invoice_id", label: "Invoice ID", type: "string" },
    { key: "invoice_number", label: "Invoice Number", type: "string" },
    { key: "customer_name", label: "Customer Name", type: "string" },
    { key: "customer_email", label: "Customer Email", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "total_amount_pennies", label: "Total Amount", type: "currency" },
    { key: "net_amount_pennies", label: "Net Amount", type: "currency" },
    { key: "tax_amount_pennies", label: "Tax Amount", type: "currency" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "issue_date", label: "Issue Date", type: "date" },
    { key: "due_date", label: "Due Date", type: "date" },
    { key: "paid_date", label: "Paid Date", type: "date" },
    { key: "payment_method", label: "Payment Method", type: "string" },
    { key: "created_at", label: "Created", type: "date" },
    { key: "updated_at", label: "Last Updated", type: "date" },
  ];
}

/**
 * Get export fields for payout reports
 */
export function getPayoutExportFields(): ExportField[] {
  return [
    { key: "payout_id", label: "Payout ID", type: "string" },
    { key: "instructor_name", label: "Instructor Name", type: "string" },
    { key: "instructor_email", label: "Instructor Email", type: "string" },
    { key: "class_type_name", label: "Class Type", type: "string" },
    { key: "class_date", label: "Class Date", type: "date" },
    { key: "venue_name", label: "Venue", type: "string" },
    { key: "hours_taught", label: "Hours Taught", type: "number", format: "2" },
    { key: "hourly_rate_pennies", label: "Hourly Rate", type: "currency" },
    { key: "bonus_amount_pennies", label: "Bonus Amount", type: "currency" },
    { key: "total_amount_pennies", label: "Total Amount", type: "currency" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "status", label: "Status", type: "string" },
    { key: "payment_date", label: "Payment Date", type: "date" },
    { key: "payment_method", label: "Payment Method", type: "string" },
    { key: "created_at", label: "Created", type: "date" },
  ];
}

/**
 * Get export fields for discount code reports
 */
export function getDiscountCodeExportFields(): ExportField[] {
  return [
    { key: "usage_id", label: "Usage ID", type: "string" },
    { key: "code", label: "Discount Code", type: "string" },
    { key: "customer_name", label: "Customer Name", type: "string" },
    { key: "customer_email", label: "Customer Email", type: "string" },
    { key: "usage_type", label: "Usage Type", type: "string" },
    { key: "discount_type", label: "Discount Type", type: "string" },
    {
      key: "discount_value",
      label: "Discount Value",
      type: "number",
      format: "2",
    },
    {
      key: "original_amount_pennies",
      label: "Original Amount",
      type: "currency",
    },
    {
      key: "discount_amount_pennies",
      label: "Discount Amount",
      type: "currency",
    },
    { key: "final_amount_pennies", label: "Final Amount", type: "currency" },
    {
      key: "savings_percentage",
      label: "Savings %",
      type: "percentage",
      transform: (_, row) =>
        (row.discount_amount_pennies / row.original_amount_pennies) * 100,
    },
    { key: "currency", label: "Currency", type: "string" },
    { key: "used_at", label: "Used At", type: "date" },
    { key: "invoice_id", label: "Invoice ID", type: "string" },
  ];
}

/**
 * Get export fields based on report type
 */
export function getExportFields(reportType: ReportType): ExportField[] {
  switch (reportType) {
    case "attendance":
      return getAttendanceExportFields();
    case "invoice":
      return getInvoiceExportFields();
    case "payout":
      return getPayoutExportFields();
    case "discount_code":
      return getDiscountCodeExportFields();
    default:
      throw new Error(`Unsupported report type for export: ${reportType}`);
  }
}

// ====================
// RESPONSE HELPERS
// ====================

/**
 * Create CSV download response
 */
export function createCSVDownloadResponse(
  csvContent: string,
  filename: string,
  config: ExportConfig,
): NextResponse {
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  return new NextResponse(csvContent, { headers });
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  reportType: ReportType,
  organizationId: string,
  config: ExportConfig,
): string {
  if (config.filename) {
    return config.filename;
  }

  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const extension = config.format === "xlsx" ? "xlsx" : "csv";

  return `${reportType}-report-${timestamp}.${extension}`;
}

// ====================
// GROUPED DATA EXPORT
// ====================

/**
 * Get export fields for grouped attendance data
 */
export function getGroupedAttendanceExportFields(): ExportField[] {
  return [
    { key: "group_label", label: "Group", type: "string" },
    { key: "total_bookings", label: "Total Bookings", type: "number" },
    { key: "attended_count", label: "Attended", type: "number" },
    { key: "no_show_count", label: "No Shows", type: "number" },
    { key: "cancelled_count", label: "Cancelled", type: "number" },
    { key: "registered_count", label: "Registered", type: "number" },
    { key: "attendance_rate", label: "Attendance Rate", type: "percentage" },
  ];
}

/**
 * Get export fields for grouped invoice data
 */
export function getGroupedInvoiceExportFields(): ExportField[] {
  return [
    { key: "group_label", label: "Group", type: "string" },
    { key: "total_invoices", label: "Total Invoices", type: "number" },
    { key: "total_amount_pennies", label: "Total Amount", type: "currency" },
    { key: "paid_amount_pennies", label: "Paid Amount", type: "currency" },
    {
      key: "outstanding_amount_pennies",
      label: "Outstanding Amount",
      type: "currency",
    },
    { key: "payment_rate", label: "Payment Rate", type: "percentage" },
  ];
}

/**
 * Get export fields for grouped payout data
 */
export function getGroupedPayoutExportFields(): ExportField[] {
  return [
    { key: "group_label", label: "Group", type: "string" },
    { key: "total_payouts", label: "Total Payouts", type: "number" },
    { key: "total_amount_pennies", label: "Total Amount", type: "currency" },
    { key: "paid_amount_pennies", label: "Paid Amount", type: "currency" },
    {
      key: "pending_amount_pennies",
      label: "Pending Amount",
      type: "currency",
    },
    { key: "average_hourly_rate", label: "Avg Hourly Rate", type: "currency" },
  ];
}

/**
 * Get export fields for grouped discount code data
 */
export function getGroupedDiscountCodeExportFields(): ExportField[] {
  return [
    { key: "group_label", label: "Group", type: "string" },
    { key: "total_uses", label: "Total Uses", type: "number" },
    {
      key: "total_discount_amount_pennies",
      label: "Total Discount Amount",
      type: "currency",
    },
    {
      key: "total_original_amount_pennies",
      label: "Total Original Amount",
      type: "currency",
    },
    { key: "savings_rate", label: "Savings Rate", type: "percentage" },
    { key: "unique_customers", label: "Unique Customers", type: "number" },
  ];
}

/**
 * Get grouped export fields based on report type
 */
export function getGroupedExportFields(reportType: ReportType): ExportField[] {
  switch (reportType) {
    case "attendance":
      return getGroupedAttendanceExportFields();
    case "invoice":
      return getGroupedInvoiceExportFields();
    case "payout":
      return getGroupedPayoutExportFields();
    case "discount_code":
      return getGroupedDiscountCodeExportFields();
    default:
      throw new Error(
        `Unsupported report type for grouped export: ${reportType}`,
      );
  }
}

// ====================
// EXCEL UTILITIES (Future Enhancement)
// ====================

/**
 * Placeholder for XLSX export functionality
 * This would require adding a library like 'exceljs' or 'xlsx'
 */
export function convertToXLSX<T extends Record<string, any>>(
  data: T[],
  fields: ExportField[],
  config: ExportConfig,
): Buffer {
  throw new Error("XLSX export not yet implemented. Use CSV format instead.");
}

// ====================
// EXPORT LIMITS
// ====================

export const EXPORT_LIMITS = {
  MAX_ROWS: 100000,
  MAX_FILE_SIZE_MB: 50,
  CHUNK_SIZE: 10000,
} as const;

/**
 * Check if export is within limits
 */
export function validateExportLimits(rowCount: number): {
  valid: boolean;
  error?: string;
} {
  if (rowCount > EXPORT_LIMITS.MAX_ROWS) {
    return {
      valid: false,
      error: `Export too large. Maximum ${EXPORT_LIMITS.MAX_ROWS.toLocaleString()} rows allowed. Please add more filters to reduce the data size.`,
    };
  }

  return { valid: true };
}

/**
 * Estimate file size for export
 */
export function estimateExportFileSize(
  rowCount: number,
  fieldCount: number,
): number {
  // Rough estimate: 50 bytes per field on average
  const estimatedSizeBytes = rowCount * fieldCount * 50;
  return Math.round(estimatedSizeBytes / (1024 * 1024)); // Convert to MB
}
