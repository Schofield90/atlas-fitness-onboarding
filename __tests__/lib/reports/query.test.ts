/**
 * Unit tests for report query utilities
 */

import {
  DATE_PRESETS,
  convertToTimezone,
  validateDateRange,
  sanitizeInput,
  validatePagination,
  buildWhereConditions,
  getDatePreset,
  formatReportDate,
  isValidBusinessDate,
  generateCacheKey
} from '../../../lib/reports/query';

describe('DATE_PRESETS', () => {
  test('should have all expected presets', () => {
    const expectedLabels = [
      'Today',
      'Yesterday',
      'Last 7 Days',
      'Last 30 Days',
      'This Week',
      'Last Week',
      'This Month',
      'Last Month',
      'This Year',
      'Last Year'
    ];

    expect(DATE_PRESETS).toHaveLength(expectedLabels.length);
    DATE_PRESETS.forEach((preset, index) => {
      expect(preset.label).toBe(expectedLabels[index]);
      expect(typeof preset.getValue).toBe('function');
    });
  });

  test('Today preset should return current day range', () => {
    const today = DATE_PRESETS[0].getValue();
    const now = new Date();
    
    expect(today.from.getDate()).toBe(now.getDate());
    expect(today.from.getHours()).toBe(0);
    expect(today.from.getMinutes()).toBe(0);
    expect(today.from.getSeconds()).toBe(0);
    
    expect(today.to.getDate()).toBe(now.getDate() + 1);
  });

  test('Yesterday preset should return previous day range', () => {
    const yesterday = DATE_PRESETS[1].getValue();
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 1);
    
    expect(yesterday.from.getDate()).toBe(expectedDate.getDate());
    expect(yesterday.from.getHours()).toBe(0);
  });

  test('This Week preset should start on Sunday', () => {
    const thisWeek = DATE_PRESETS[4].getValue();
    expect(thisWeek.from.getDay()).toBe(0); // Sunday
  });

  test('This Month preset should start on first day', () => {
    const thisMonth = DATE_PRESETS[6].getValue();
    expect(thisMonth.from.getDate()).toBe(1);
  });
});

describe('convertToTimezone', () => {
  test('should convert date to different timezone', () => {
    const utcDate = new Date('2024-01-15T12:00:00Z');
    
    // Test with valid timezone
    const converted = convertToTimezone(utcDate, 'America/New_York');
    expect(converted).toBeInstanceOf(Date);
    
    // EST is UTC-5, so 12:00 UTC should be 07:00 EST
    expect(converted.getHours()).toBeLessThan(utcDate.getUTCHours());
  });

  test('should handle invalid timezone gracefully', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = convertToTimezone(date, 'Invalid/Timezone');
    
    // Should return original date when timezone is invalid
    expect(result).toEqual(date);
  });

  test('should handle UTC timezone', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = convertToTimezone(date, 'UTC');
    
    expect(result).toBeInstanceOf(Date);
  });
});

describe('validateDateRange', () => {
  test('should validate correct date range', () => {
    const from = '2024-01-01T00:00:00Z';
    const to = '2024-01-31T23:59:59Z';
    
    const result = validateDateRange(from, to);
    
    expect(result.valid).toBe(true);
    expect(result.fromDate).toBeInstanceOf(Date);
    expect(result.toDate).toBeInstanceOf(Date);
    expect(result.error).toBeUndefined();
  });

  test('should reject invalid start date', () => {
    const result = validateDateRange('invalid-date', '2024-01-31T23:59:59Z');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid start date');
  });

  test('should reject invalid end date', () => {
    const result = validateDateRange('2024-01-01T00:00:00Z', 'invalid-date');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid end date');
  });

  test('should reject when start date is after end date', () => {
    const result = validateDateRange('2024-01-31T00:00:00Z', '2024-01-01T00:00:00Z');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Start date must be before end date');
  });

  test('should reject date range exceeding 2 years', () => {
    const from = '2020-01-01T00:00:00Z';
    const to = '2024-01-01T00:00:00Z';
    
    const result = validateDateRange(from, to);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Date range cannot exceed 2 years');
  });

  test('should work with Date objects', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');
    
    const result = validateDateRange(from, to);
    
    expect(result.valid).toBe(true);
  });
});

describe('sanitizeInput', () => {
  test('should remove dangerous characters', () => {
    const input = `'; DROP TABLE users; --`;
    const result = sanitizeInput(input);
    
    expect(result).not.toContain("'");
    expect(result).not.toContain(';');
    expect(result).not.toContain('--');
    expect(result).toBe('DROP TABLE users');
  });

  test('should trim whitespace', () => {
    const result = sanitizeInput('  test  ');
    expect(result).toBe('test');
  });

  test('should limit length to 100 characters', () => {
    const longInput = 'a'.repeat(200);
    const result = sanitizeInput(longInput);
    
    expect(result.length).toBe(100);
  });

  test('should handle empty/null input', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });

  test('should handle non-string input', () => {
    expect(sanitizeInput(123 as any)).toBe('');
    expect(sanitizeInput({} as any)).toBe('');
  });
});

describe('validatePagination', () => {
  test('should validate correct pagination', () => {
    const result = validatePagination(2, 25);
    
    expect(result.valid).toBe(true);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.error).toBeUndefined();
  });

  test('should use defaults for missing values', () => {
    const result = validatePagination();
    
    expect(result.valid).toBe(true);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  test('should parse string values', () => {
    const result = validatePagination('3', '100');
    
    expect(result.valid).toBe(true);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(100);
  });

  test('should reject page less than 1', () => {
    const result = validatePagination(0, 50);
    
    expect(result.valid).toBe(false);
    expect(result.page).toBe(1);
    expect(result.error).toBe('Page must be >= 1');
  });

  test('should reject page size less than 1', () => {
    const result = validatePagination(1, 0);
    
    expect(result.valid).toBe(false);
    expect(result.pageSize).toBe(50);
    expect(result.error).toBe('Page size must be between 1 and 1000');
  });

  test('should reject page size greater than 1000', () => {
    const result = validatePagination(1, 1001);
    
    expect(result.valid).toBe(false);
    expect(result.pageSize).toBe(50);
    expect(result.error).toBe('Page size must be between 1 and 1000');
  });
});

describe('buildWhereConditions', () => {
  test('should build basic WHERE clause with organization isolation', () => {
    const orgId = 'org-123';
    const filters = { status: 'active', type: 'membership' };
    
    const result = buildWhereConditions(orgId, filters);
    
    expect(result.conditions).toEqual([
      'organization_id = $1',
      'status = $2',
      'type = $3'
    ]);
    expect(result.params).toEqual([orgId, 'active', 'membership']);
  });

  test('should handle array filters', () => {
    const orgId = 'org-123';
    const filters = { statuses: ['active', 'pending'] };
    
    const result = buildWhereConditions(orgId, filters);
    
    expect(result.conditions).toContain('statuses IN ($2, $3)');
    expect(result.params).toEqual([orgId, 'active', 'pending']);
  });

  test('should skip null/undefined/empty values', () => {
    const orgId = 'org-123';
    const filters = { 
      status: 'active',
      empty: '',
      nullValue: null,
      undefinedValue: undefined,
      emptyArray: []
    };
    
    const result = buildWhereConditions(orgId, filters);
    
    expect(result.conditions).toEqual([
      'organization_id = $1',
      'status = $2'
    ]);
    expect(result.params).toEqual([orgId, 'active']);
  });

  test('should sanitize string values', () => {
    const orgId = 'org-123';
    const filters = { name: "'; DROP TABLE; --" };
    
    const result = buildWhereConditions(orgId, filters);
    
    expect(result.params[1]).toBe('DROP TABLE');
  });
});

describe('getDatePreset', () => {
  test('should find preset by label', () => {
    const preset = getDatePreset('Today');
    
    expect(preset).toBeDefined();
    expect(preset?.label).toBe('Today');
    expect(typeof preset?.getValue).toBe('function');
  });

  test('should return null for non-existent preset', () => {
    const preset = getDatePreset('Non-existent');
    
    expect(preset).toBeNull();
  });

  test('should be case sensitive', () => {
    const preset = getDatePreset('today');
    
    expect(preset).toBeNull();
  });
});

describe('formatReportDate', () => {
  test('should format date without timezone', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatReportDate(date);
    
    expect(result).toMatch(/Jan 15, 2024/);
  });

  test('should format date with timezone', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatReportDate(date, 'America/New_York');
    
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
  });

  test('should handle string dates', () => {
    const result = formatReportDate('2024-01-15T12:00:00Z');
    
    expect(result).toMatch(/Jan 15, 2024/);
  });

  test('should handle invalid dates gracefully', () => {
    const result = formatReportDate('invalid-date');
    
    expect(result).toBe('Invalid Date');
  });
});

describe('isValidBusinessDate', () => {
  test('should accept current year dates', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, 0, 1);
    
    expect(isValidBusinessDate(date)).toBe(true);
  });

  test('should accept dates from 5 years ago', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear - 5, 0, 1);
    
    expect(isValidBusinessDate(date)).toBe(true);
  });

  test('should accept dates 1 year in future', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear + 1, 0, 1);
    
    expect(isValidBusinessDate(date)).toBe(true);
  });

  test('should reject dates too far in past', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear - 6, 0, 1);
    
    expect(isValidBusinessDate(date)).toBe(false);
  });

  test('should reject dates too far in future', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear + 2, 0, 1);
    
    expect(isValidBusinessDate(date)).toBe(false);
  });
});

describe('generateCacheKey', () => {
  test('should generate consistent cache keys', () => {
    const filters = { status: 'active', page: 1 };
    const key1 = generateCacheKey('attendances', filters);
    const key2 = generateCacheKey('attendances', filters);
    
    expect(key1).toBe(key2);
  });

  test('should sort filters for consistency', () => {
    const filters1 = { status: 'active', page: 1 };
    const filters2 = { page: 1, status: 'active' };
    
    const key1 = generateCacheKey('attendances', filters1);
    const key2 = generateCacheKey('attendances', filters2);
    
    expect(key1).toBe(key2);
  });

  test('should include endpoint in key', () => {
    const filters = { status: 'active' };
    const key = generateCacheKey('attendances', filters);
    
    expect(key).toContain('attendances');
  });

  test('should generate different keys for different endpoints', () => {
    const filters = { status: 'active' };
    const key1 = generateCacheKey('attendances', filters);
    const key2 = generateCacheKey('invoices', filters);
    
    expect(key1).not.toBe(key2);
  });

  test('should generate different keys for different filters', () => {
    const key1 = generateCacheKey('attendances', { status: 'active' });
    const key2 = generateCacheKey('attendances', { status: 'inactive' });
    
    expect(key1).not.toBe(key2);
  });
});