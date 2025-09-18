/**
 * Unit tests for report export utilities
 */

import {
  generateCSV,
  escapeCSVField,
  formatCSVValue,
  formatCurrency,
  createCSVBlob,
  generateExportFilename,
  transformDataForExport,
  exportReportAsCSV,
  REPORT_HEADERS
} from '../../../lib/reports/export';

describe('escapeCSVField', () => {
  test('should escape fields with commas', () => {
    const result = escapeCSVField('Last, First');
    expect(result).toBe('"Last, First"');
  });

  test('should escape fields with quotes', () => {
    const result = escapeCSVField('He said "Hello"');
    expect(result).toBe('"He said ""Hello"""');
  });

  test('should escape fields with newlines', () => {
    const result = escapeCSVField('Line 1\nLine 2');
    expect(result).toBe('"Line 1\nLine 2"');
  });

  test('should not escape simple fields', () => {
    const result = escapeCSVField('Simple Text');
    expect(result).toBe('Simple Text');
  });

  test('should handle null/undefined values', () => {
    expect(escapeCSVField(null)).toBe('');
    expect(escapeCSVField(undefined)).toBe('');
  });

  test('should convert numbers to strings', () => {
    expect(escapeCSVField(123)).toBe('123');
    expect(escapeCSVField(0)).toBe('0');
  });
});

describe('formatCSVValue', () => {
  test('should format dates in locale format by default', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatCSVValue(date, { dateFormat: 'locale' });
    
    expect(result).toContain('2024');
    expect(result).toContain('1/15/');
  });

  test('should format dates in ISO format', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatCSVValue(date, { dateFormat: 'iso' });
    
    expect(result).toBe('2024-01-15T12:00:00.000Z');
  });

  test('should format dates in short format', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatCSVValue(date, { dateFormat: 'short' });
    
    expect(result).toMatch(/1\/15\/2024/);
  });

  test('should format currency from pennies to dollars', () => {
    const result = formatCSVValue(2500, { currencyFormat: 'dollars' });
    
    expect(result).toBe('$25.00');
  });

  test('should keep pennies as pennies when specified', () => {
    const result = formatCSVValue(2500, { currencyFormat: 'pennies' });
    
    expect(result).toBe('2500');
  });

  test('should format booleans as Yes/No', () => {
    expect(formatCSVValue(true, {})).toBe('Yes');
    expect(formatCSVValue(false, {})).toBe('No');
  });

  test('should format arrays as semicolon-separated', () => {
    const result = formatCSVValue(['item1', 'item2', 'item3'], {});
    
    expect(result).toBe('item1; item2; item3');
  });

  test('should handle null/undefined values', () => {
    expect(formatCSVValue(null, {})).toBe('');
    expect(formatCSVValue(undefined, {})).toBe('');
  });

  test('should convert other types to strings', () => {
    expect(formatCSVValue(123, { currencyFormat: 'pennies' })).toBe('123');
    expect(formatCSVValue('text', {})).toBe('text');
  });

  test('should handle invalid dates', () => {
    const result = formatCSVValue('invalid-date', {});
    expect(result).toBe('invalid-date');
  });
});

describe('generateCSV', () => {
  const testData = [
    { name: 'John Doe', email: 'john@example.com', amount: 2500 },
    { name: 'Jane Smith', email: 'jane@example.com', amount: 3000 }
  ];
  const headers = ['name', 'email', 'amount'];

  test('should generate CSV with headers', () => {
    const csv = generateCSV(testData, headers, { includeHeaders: true });
    
    expect(csv).toContain('name,email,amount');
    expect(csv).toContain('John Doe,john@example.com,$25.00');
    expect(csv).toContain('Jane Smith,jane@example.com,$30.00');
  });

  test('should generate CSV without headers', () => {
    const csv = generateCSV(testData, headers, { includeHeaders: false });
    
    expect(csv).not.toContain('name,email,amount');
    expect(csv).toContain('John Doe,john@example.com,$25.00');
  });

  test('should include BOM by default', () => {
    const csv = generateCSV(testData, headers);
    
    expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM character
  });

  test('should exclude BOM when disabled', () => {
    const csv = generateCSV(testData, headers, { includeBOM: false });
    
    expect(csv.charCodeAt(0)).not.toBe(0xFEFF);
  });

  test('should handle empty data', () => {
    const csv = generateCSV([], headers);
    
    expect(csv).toBe('\uFEFFname,email,amount\n');
  });

  test('should format currency values', () => {
    const csv = generateCSV(testData, headers, { currencyFormat: 'dollars' });
    
    expect(csv).toContain('$25.00');
    expect(csv).toContain('$30.00');
  });
});

describe('formatCurrency', () => {
  test('should format USD by default', () => {
    const result = formatCurrency(25);
    
    expect(result).toBe('$25.00');
  });

  test('should format different currencies', () => {
    const result = formatCurrency(25, 'EUR');
    
    expect(result).toContain('25.00');
    expect(result).toContain('€');
  });

  test('should handle zero amounts', () => {
    const result = formatCurrency(0);
    
    expect(result).toBe('$0.00');
  });

  test('should handle negative amounts', () => {
    const result = formatCurrency(-25);
    
    expect(result).toBe('-$25.00');
  });

  test('should fallback for invalid currency', () => {
    const result = formatCurrency(2500, 'INVALID');
    
    expect(result).toBe('$2500.00');
  });

  test('should handle large amounts', () => {
    const result = formatCurrency(1234567);
    
    expect(result).toBe('$1,234,567.00');
  });
});

describe('createCSVBlob', () => {
  test('should create blob with correct MIME type', () => {
    const csv = 'name,email\nJohn,john@example.com';
    const blob = createCSVBlob(csv);
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(blob.size).toBeGreaterThan(0);
  });

  test('should handle empty CSV content', () => {
    const blob = createCSVBlob('');
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(0);
  });
});

describe('generateExportFilename', () => {
  test('should generate filename with timestamp', () => {
    const filename = generateExportFilename('attendances');
    const today = new Date().toISOString().split('T')[0];
    
    expect(filename).toBe(`attendances-${today}.csv`);
  });

  test('should include date range when provided', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');
    const filename = generateExportFilename('attendances', { from, to });
    
    expect(filename).toBe('attendances-2024-01-01-to-2024-01-31.csv');
  });

  test('should use custom extension', () => {
    const filename = generateExportFilename('attendances', undefined, 'xlsx');
    
    expect(filename.endsWith('.xlsx')).toBe(true);
  });

  test('should handle different report types', () => {
    const filename = generateExportFilename('invoices');
    
    expect(filename).toContain('invoices');
  });
});

describe('transformDataForExport', () => {
  test('should transform attendance data', () => {
    const rawData = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        class_type_name: 'Yoga',
        class_start_at: '2024-01-15T10:00:00Z',
        venue_name: 'Main Studio',
        attendance_status: 'attended',
        booking_method: 'membership',
        payment_amount_pennies: 2000
      }
    ];

    const result = transformDataForExport(rawData, 'attendances');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      class_name: 'Yoga',
      venue_name: 'Main Studio',
      attendance_status: 'attended',
      booking_method: 'membership',
      payment_amount: 2000
    });
  });

  test('should transform invoice data', () => {
    const rawData = [
      {
        invoice_number: 'INV-001',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        status: 'paid',
        total_amount_pennies: 5000
      }
    ];

    const result = transformDataForExport(rawData, 'invoices');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      invoice_number: 'INV-001',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      status: 'paid',
      total_amount: 5000
    });
  });

  test('should handle empty data', () => {
    const result = transformDataForExport([], 'attendances');
    
    expect(result).toEqual([]);
  });

  test('should handle null data', () => {
    const result = transformDataForExport(null as any, 'attendances');
    
    expect(result).toEqual([]);
  });

  test('should handle missing fields gracefully', () => {
    const rawData = [{ first_name: 'John' }]; // Missing many fields
    const result = transformDataForExport(rawData, 'attendances');

    expect(result).toHaveLength(1);
    expect(result[0].customer_name).toBe('John');
    expect(result[0].customer_email).toBe('');
  });
});

describe('REPORT_HEADERS', () => {
  test('should have headers for all report types', () => {
    const expectedReportTypes = [
      'attendances',
      'invoices',
      'discount-codes',
      'invoice-items',
      'payouts'
    ];

    expectedReportTypes.forEach(reportType => {
      expect(REPORT_HEADERS[reportType as keyof typeof REPORT_HEADERS]).toBeDefined();
      expect(Array.isArray(REPORT_HEADERS[reportType as keyof typeof REPORT_HEADERS])).toBe(true);
    });
  });

  test('should have reasonable headers for attendances', () => {
    const headers = REPORT_HEADERS.attendances;
    
    expect(headers).toContain('customer_name');
    expect(headers).toContain('customer_email');
    expect(headers).toContain('class_name');
    expect(headers).toContain('attendance_status');
  });

  test('should have reasonable headers for invoices', () => {
    const headers = REPORT_HEADERS.invoices;
    
    expect(headers).toContain('invoice_number');
    expect(headers).toContain('customer_name');
    expect(headers).toContain('total_amount');
    expect(headers).toContain('status');
  });
});

describe('exportReportAsCSV', () => {
  test('should export attendance report', () => {
    const data = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        class_type_name: 'Yoga',
        class_start_at: '2024-01-15T10:00:00Z',
        attendance_status: 'attended',
        payment_amount_pennies: 2000
      }
    ];

    const csv = exportReportAsCSV(data, 'attendances');

    expect(csv).toContain('customer_name,customer_email');
    expect(csv).toContain('John Doe,john@example.com');
    expect(csv).toContain('$20.00');
  });

  test('should handle empty data', () => {
    const csv = exportReportAsCSV([], 'attendances');
    
    expect(csv).toContain('customer_name,customer_email');
    expect(csv.split('\n')).toHaveLength(2); // Header + empty line
  });

  test('should use appropriate headers for report type', () => {
    const data = [{ invoice_number: 'INV-001' }];
    const csv = exportReportAsCSV(data, 'invoices');
    
    expect(csv).toContain('invoice_number');
    expect(csv).toContain('customer_name');
    expect(csv).toContain('total_amount');
  });

  test('should respect export options', () => {
    const data = [{ first_name: 'John', last_name: 'Doe' }];
    const csv = exportReportAsCSV(data, 'attendances', {
      includeHeaders: false,
      includeBOM: false
    });

    expect(csv).not.toContain('customer_name');
    expect(csv.charCodeAt(0)).not.toBe(0xFEFF);
  });
});