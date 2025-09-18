/**
 * Report Export Utilities
 * Handles CSV generation, formatting, and download functionality
 */

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  includeBOM?: boolean;
  dateFormat?: 'iso' | 'locale' | 'short';
  currencyFormat?: 'pennies' | 'dollars';
  timezone?: string;
}

/**
 * Convert data to CSV format with proper escaping
 */
export function generateCSV(
  data: any[], 
  headers: string[], 
  options: ExportOptions = {}
): string {
  const {
    includeHeaders = true,
    includeBOM = true,
    dateFormat = 'locale',
    currencyFormat = 'dollars',
    timezone = 'UTC'
  } = options;

  let csv = '';
  
  // Add BOM for Excel compatibility
  if (includeBOM) {
    csv += '\uFEFF';
  }

  // Add headers
  if (includeHeaders) {
    csv += headers.map(header => escapeCSVField(header)).join(',') + '\n';
  }

  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      return formatCSVValue(value, { dateFormat, currencyFormat, timezone });
    });
    csv += values.map(value => escapeCSVField(value)).join(',') + '\n';
  });

  return csv;
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
export function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringValue = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  
  return stringValue;
}

/**
 * Format value for CSV output
 */
export function formatCSVValue(
  value: any, 
  options: Pick<ExportOptions, 'dateFormat' | 'currencyFormat' | 'timezone'>
): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date || (typeof value === 'string' && isValidDate(value))) {
    return formatDateForCSV(new Date(value), options.dateFormat, options.timezone);
  }

  // Handle currency (pennies to dollars)
  if (typeof value === 'number' && options.currencyFormat === 'dollars' && isLikelyPennies(value)) {
    return formatCurrency(value / 100);
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join('; ');
  }

  // Return as string
  return String(value);
}

/**
 * Check if string is a valid date
 */
function isValidDate(dateString: string): boolean {
  // Check for ISO date format or common date patterns
  const dateRegex = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  return dateRegex.test(dateString) && !isNaN(Date.parse(dateString));
}

/**
 * Check if a number is likely to be in pennies (large integer)
 */
function isLikelyPennies(value: number): boolean {
  return Number.isInteger(value) && value >= 100;
}

/**
 * Format date for CSV export
 */
function formatDateForCSV(date: Date, format?: string, timezone?: string): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  try {
    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'short':
        return timezone 
          ? date.toLocaleDateString('en-US', { timeZone: timezone })
          : date.toLocaleDateString('en-US');
      case 'locale':
      default:
        return timezone
          ? date.toLocaleString('en-US', { timeZone: timezone })
          : date.toLocaleString('en-US');
    }
  } catch (error) {
    console.warn('Date formatting error:', error);
    return date.toISOString();
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Create a downloadable CSV blob
 */
export function createCSVBlob(csvContent: string): Blob {
  return new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8' 
  });
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  reportType: string, 
  dateRange?: { from: Date; to: Date },
  extension: string = 'csv'
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  
  let filename = `${reportType}-${timestamp}`;
  
  if (dateRange) {
    const fromStr = dateRange.from.toISOString().split('T')[0];
    const toStr = dateRange.to.toISOString().split('T')[0];
    filename = `${reportType}-${fromStr}-to-${toStr}`;
  }
  
  return `${filename}.${extension}`;
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent);
  const url = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up blob URL
  window.URL.revokeObjectURL(url);
}

/**
 * Standard headers for different report types
 */
export const REPORT_HEADERS = {
  attendances: [
    'customer_name',
    'customer_email',
    'class_name',
    'class_date',
    'class_time',
    'venue_name',
    'instructor_name',
    'attendance_status',
    'booking_method',
    'booking_source',
    'checked_in_at',
    'payment_amount',
    'membership_name'
  ],
  invoices: [
    'invoice_number',
    'customer_name',
    'customer_email',
    'issue_date',
    'due_date',
    'status',
    'subtotal',
    'tax_amount',
    'total_amount',
    'currency',
    'description'
  ],
  'discount-codes': [
    'code',
    'description',
    'discount_type',
    'discount_value',
    'min_amount',
    'max_uses',
    'current_uses',
    'start_date',
    'end_date',
    'is_active'
  ],
  'invoice-items': [
    'invoice_number',
    'item_description',
    'quantity',
    'unit_price',
    'total_price',
    'tax_rate',
    'category'
  ],
  payouts: [
    'payout_id',
    'amount',
    'currency',
    'status',
    'arrival_date',
    'method',
    'description',
    'fees'
  ]
} as const;

/**
 * Transform raw data for CSV export
 */
export function transformDataForExport(data: any[], reportType: keyof typeof REPORT_HEADERS): any[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  switch (reportType) {
    case 'attendances':
      return data.map(record => ({
        customer_name: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
        customer_email: record.email || '',
        class_name: record.class_type_name || '',
        class_date: record.class_start_at ? new Date(record.class_start_at).toLocaleDateString() : '',
        class_time: record.class_start_at ? new Date(record.class_start_at).toLocaleTimeString() : '',
        venue_name: record.venue_name || '',
        instructor_name: record.instructor_names ? record.instructor_names.join(', ') : '',
        attendance_status: record.attendance_status || '',
        booking_method: record.booking_method || '',
        booking_source: record.booking_source || '',
        checked_in_at: record.checked_in_at ? new Date(record.checked_in_at).toLocaleString() : '',
        payment_amount: record.payment_amount_pennies || 0,
        membership_name: record.membership_name || ''
      }));

    case 'invoices':
      return data.map(record => ({
        invoice_number: record.invoice_number || '',
        customer_name: record.customer_name || '',
        customer_email: record.customer_email || '',
        issue_date: record.issue_date || '',
        due_date: record.due_date || '',
        status: record.status || '',
        subtotal: record.subtotal_pennies || 0,
        tax_amount: record.tax_amount_pennies || 0,
        total_amount: record.total_amount_pennies || 0,
        currency: record.currency || 'USD',
        description: record.description || ''
      }));

    case 'discount-codes':
      return data.map(record => ({
        code: record.code || '',
        description: record.description || '',
        discount_type: record.discount_type || '',
        discount_value: record.discount_value || 0,
        min_amount: record.min_amount_pennies || 0,
        max_uses: record.max_uses || '',
        current_uses: record.current_uses || 0,
        start_date: record.start_date || '',
        end_date: record.end_date || '',
        is_active: record.is_active || false
      }));

    case 'invoice-items':
      return data.map(record => ({
        invoice_number: record.invoice_number || '',
        item_description: record.description || '',
        quantity: record.quantity || 0,
        unit_price: record.unit_price_pennies || 0,
        total_price: record.total_price_pennies || 0,
        tax_rate: record.tax_rate || 0,
        category: record.category || ''
      }));

    case 'payouts':
      return data.map(record => ({
        payout_id: record.id || '',
        amount: record.amount_pennies || 0,
        currency: record.currency || 'USD',
        status: record.status || '',
        arrival_date: record.arrival_date || '',
        method: record.method || '',
        description: record.description || '',
        fees: record.fees_pennies || 0
      }));

    default:
      return data;
  }
}

/**
 * Export report data as CSV
 */
export function exportReportAsCSV(
  data: any[],
  reportType: keyof typeof REPORT_HEADERS,
  options: ExportOptions = {}
): string {
  const headers = [...(REPORT_HEADERS[reportType] || Object.keys(data[0] || {}))];
  const transformedData = transformDataForExport(data, reportType);
  
  return generateCSV(transformedData, headers, {
    includeHeaders: true,
    includeBOM: true,
    dateFormat: 'locale',
    currencyFormat: 'dollars',
    ...options
  });
}