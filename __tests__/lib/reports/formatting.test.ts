/**
 * Unit tests for report formatting utilities
 */

import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatPhoneNumber,
  formatStatus,
  formatBoolean,
  formatArray,
  formatAddress,
  truncateText,
  formatFileSize,
  formatRelativeTime,
  formatReportTitle,
  getStatusColor
} from '../../../lib/reports/formatting';

describe('formatCurrency', () => {
  test('should format USD currency by default', () => {
    expect(formatCurrency(2500)).toBe('$25.00');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(123456)).toBe('$1,234.56');
  });

  test('should format different currencies', () => {
    expect(formatCurrency(2500, 'EUR')).toContain('25.00');
    expect(formatCurrency(2500, 'GBP')).toContain('25.00');
  });

  test('should handle different locales', () => {
    const result = formatCurrency(2500, 'USD', { locale: 'en-US' });
    expect(result).toBe('$25.00');
  });

  test('should hide cents when specified', () => {
    const result = formatCurrency(2500, 'USD', { showCents: false });
    expect(result).toBe('$25');
  });

  test('should handle invalid amounts', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
    expect(formatCurrency(null as any)).toBe('$0.00');
    expect(formatCurrency(undefined as any)).toBe('$0.00');
  });

  test('should handle negative amounts', () => {
    expect(formatCurrency(-2500)).toBe('-$25.00');
  });

  test('should fallback gracefully for invalid currency', () => {
    const result = formatCurrency(2500, 'INVALID');
    expect(result).toBe('INVALID 25.00');
  });
});

describe('formatPercentage', () => {
  test('should format percentage with default decimals', () => {
    expect(formatPercentage(75)).toBe('75.0%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(0)).toBe('0.0%');
  });

  test('should format with custom decimal places', () => {
    expect(formatPercentage(75.456, 2)).toBe('75.46%');
    expect(formatPercentage(75, 0)).toBe('75%');
  });

  test('should handle invalid values', () => {
    expect(formatPercentage(NaN)).toBe('0%');
    expect(formatPercentage(null as any)).toBe('0%');
    expect(formatPercentage(undefined as any)).toBe('0%');
  });

  test('should handle negative percentages', () => {
    expect(formatPercentage(-25)).toBe('-25.0%');
  });
});

describe('formatNumber', () => {
  test('should format numbers with default settings', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(123.456)).toBe('123');
  });

  test('should format with decimals', () => {
    expect(formatNumber(123.456, { decimals: 2 })).toBe('123.46');
    expect(formatNumber(123, { decimals: 2 })).toBe('123.00');
  });

  test('should format in compact notation for large numbers', () => {
    expect(formatNumber(1500, { compact: true })).toBe('1.5K');
    expect(formatNumber(1500000, { compact: true })).toBe('1.5M');
    expect(formatNumber(1500000000, { compact: true })).toBe('1.5B');
  });

  test('should not use compact notation for small numbers', () => {
    expect(formatNumber(500, { compact: true })).toBe('500');
  });

  test('should handle invalid numbers', () => {
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(null as any)).toBe('0');
    expect(formatNumber(undefined as any)).toBe('0');
  });
});

describe('formatDate', () => {
  const testDate = new Date('2024-01-15T12:00:00Z');

  test('should format date in different styles', () => {
    expect(formatDate(testDate, 'short')).toMatch(/1\/15\/24/);
    expect(formatDate(testDate, 'medium')).toMatch(/Jan 15, 2024/);
    expect(formatDate(testDate, 'iso')).toBe('2024-01-15T12:00:00.000Z');
  });

  test('should handle string dates', () => {
    const result = formatDate('2024-01-15T12:00:00Z', 'medium');
    expect(result).toMatch(/Jan 15, 2024/);
  });

  test('should handle timezone', () => {
    const result = formatDate(testDate, 'medium', { timezone: 'America/New_York' });
    expect(result).toContain('2024');
  });

  test('should handle invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('');
    expect(formatDate(new Date('invalid'))).toBe('');
  });

  test('should handle null/undefined dates', () => {
    expect(formatDate(null as any)).toBe('');
    expect(formatDate(undefined as any)).toBe('');
  });
});

describe('formatTime', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  test('should format time in 12h format by default', () => {
    const result = formatTime(testDate);
    expect(result).toMatch(/PM|AM/);
  });

  test('should format time in 24h format', () => {
    const result = formatTime(testDate, '24h');
    expect(result).not.toMatch(/PM|AM/);
  });

  test('should handle string dates', () => {
    const result = formatTime('2024-01-15T14:30:00Z');
    expect(result).toMatch(/:/);
  });

  test('should handle invalid dates', () => {
    expect(formatTime('invalid-date')).toBe('');
    expect(formatTime(null as any)).toBe('');
  });
});

describe('formatDateTime', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  test('should format date and time together', () => {
    const result = formatDateTime(testDate);
    expect(result).toContain('2024');
    expect(result).toMatch(/:/);
  });

  test('should handle different formats', () => {
    const short = formatDateTime(testDate, 'short', '12h');
    const long = formatDateTime(testDate, 'long', '24h');
    
    expect(short).toBeDefined();
    expect(long).toBeDefined();
    expect(short.length).toBeLessThan(long.length);
  });

  test('should handle invalid dates', () => {
    expect(formatDateTime('invalid-date')).toBe('');
  });
});

describe('formatDuration', () => {
  test('should format minutes', () => {
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(1)).toBe('1 min');
  });

  test('should format hours and minutes', () => {
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(125)).toBe('2h 5m');
  });

  test('should handle zero and negative values', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(-10)).toBe('0 min');
  });

  test('should handle invalid values', () => {
    expect(formatDuration(NaN)).toBe('0 min');
    expect(formatDuration(null as any)).toBe('0 min');
  });
});

describe('formatPhoneNumber', () => {
  test('should format US phone numbers', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('15551234567')).toBe('+1 (555) 123-4567');
  });

  test('should handle phone numbers with formatting', () => {
    expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('+1-555-123-4567')).toBe('+1 (555) 123-4567');
  });

  test('should handle international numbers', () => {
    expect(formatPhoneNumber('447700900123', 'UK')).toBe('+447700900123');
  });

  test('should handle invalid phone numbers', () => {
    expect(formatPhoneNumber('')).toBe('');
    expect(formatPhoneNumber(null as any)).toBe('');
    expect(formatPhoneNumber('123')).toBe('+123');
  });
});

describe('formatStatus', () => {
  test('should capitalize status words', () => {
    expect(formatStatus('active')).toBe('Active');
    expect(formatStatus('inactive')).toBe('Inactive');
    expect(formatStatus('pending_approval')).toBe('Pending Approval');
  });

  test('should handle snake_case', () => {
    expect(formatStatus('late_cancelled')).toBe('Late Cancelled');
    expect(formatStatus('no_show')).toBe('No Show');
  });

  test('should handle empty/invalid values', () => {
    expect(formatStatus('')).toBe('');
    expect(formatStatus(null as any)).toBe('');
    expect(formatStatus(undefined as any)).toBe('');
  });
});

describe('formatBoolean', () => {
  test('should format boolean values', () => {
    expect(formatBoolean(true)).toBe('Yes');
    expect(formatBoolean(false)).toBe('No');
  });
});

describe('formatArray', () => {
  test('should join array with default separator', () => {
    expect(formatArray(['item1', 'item2', 'item3'])).toBe('item1, item2, item3');
  });

  test('should use custom separator', () => {
    expect(formatArray(['item1', 'item2'], undefined, ' | ')).toBe('item1 | item2');
  });

  test('should use custom formatter', () => {
    const formatter = (item: any) => item.toUpperCase();
    expect(formatArray(['item1', 'item2'], formatter)).toBe('ITEM1, ITEM2');
  });

  test('should handle empty arrays', () => {
    expect(formatArray([])).toBe('');
    expect(formatArray(null as any)).toBe('');
  });
});

describe('formatAddress', () => {
  test('should format complete address', () => {
    const address = {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'USA'
    };
    
    const result = formatAddress(address);
    expect(result).toBe('123 Main St, Apt 4B, New York, NY 10001, USA');
  });

  test('should handle partial addresses', () => {
    const address = {
      line1: '123 Main St',
      city: 'New York',
      state: 'NY'
    };
    
    const result = formatAddress(address);
    expect(result).toBe('123 Main St, New York, NY');
  });

  test('should handle empty address', () => {
    expect(formatAddress({})).toBe('');
    expect(formatAddress(null as any)).toBe('');
  });
});

describe('truncateText', () => {
  test('should truncate long text', () => {
    const longText = 'This is a very long text that should be truncated';
    const result = truncateText(longText, 20);
    
    expect(result).toBe('This is a very lo...');
    expect(result.length).toBe(20);
  });

  test('should not truncate short text', () => {
    const shortText = 'Short text';
    const result = truncateText(shortText, 20);
    
    expect(result).toBe('Short text');
  });

  test('should handle empty/invalid text', () => {
    expect(truncateText('', 10)).toBe('');
    expect(truncateText(null as any, 10)).toBe('');
  });
});

describe('formatFileSize', () => {
  test('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(0)).toBe('0 B');
  });

  test('should format KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  test('should format MB', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(2097152)).toBe('2.0 MB');
  });

  test('should format GB', () => {
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });

  test('should handle invalid values', () => {
    expect(formatFileSize(NaN)).toBe('0 B');
    expect(formatFileSize(-100)).toBe('0 B');
    expect(formatFileSize(null as any)).toBe('0 B');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date();

  test('should format recent time', () => {
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const result = formatRelativeTime(oneMinuteAgo);
    
    expect(result).toContain('minute');
  });

  test('should format hours ago', () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    
    expect(result).toContain('hour');
  });

  test('should format days ago', () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(threeDaysAgo);
    
    expect(result).toContain('day');
  });

  test('should handle string dates', () => {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const result = formatRelativeTime(oneHourAgo.toISOString());
    
    expect(result).toContain('hour');
  });

  test('should handle invalid dates', () => {
    expect(formatRelativeTime('invalid-date')).toBe('');
    expect(formatRelativeTime(null as any)).toBe('');
  });
});

describe('formatReportTitle', () => {
  test('should format report titles properly', () => {
    expect(formatReportTitle('attendance-report')).toBe('Attendance Report');
    expect(formatReportTitle('invoice_items')).toBe('Invoice Items');
    expect(formatReportTitle('discount codes')).toBe('Discount Codes');
  });

  test('should handle empty/invalid titles', () => {
    expect(formatReportTitle('')).toBe('');
    expect(formatReportTitle(null as any)).toBe('');
  });
});

describe('getStatusColor', () => {
  test('should return appropriate colors for attendance statuses', () => {
    expect(getStatusColor('attended')).toBe('text-green-500');
    expect(getStatusColor('registered')).toBe('text-blue-500');
    expect(getStatusColor('no_show')).toBe('text-red-500');
    expect(getStatusColor('late_cancelled')).toBe('text-yellow-500');
  });

  test('should return appropriate colors for invoice statuses', () => {
    expect(getStatusColor('paid')).toBe('text-green-500');
    expect(getStatusColor('pending')).toBe('text-yellow-500');
    expect(getStatusColor('overdue')).toBe('text-red-500');
    expect(getStatusColor('cancelled')).toBe('text-gray-500');
  });

  test('should return appropriate colors for general statuses', () => {
    expect(getStatusColor('active')).toBe('text-green-500');
    expect(getStatusColor('inactive')).toBe('text-gray-500');
    expect(getStatusColor('expired')).toBe('text-red-500');
  });

  test('should handle unknown statuses', () => {
    expect(getStatusColor('unknown_status')).toBe('text-gray-500');
    expect(getStatusColor('')).toBe('text-gray-500');
  });

  test('should be case insensitive', () => {
    expect(getStatusColor('ATTENDED')).toBe('text-green-500');
    expect(getStatusColor('Paid')).toBe('text-green-500');
  });
});