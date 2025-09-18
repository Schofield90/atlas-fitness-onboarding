/**
 * Unit tests for report security utilities
 */

import {
  hasReportPermission,
  sanitizeReportFilters,
  buildSecureWhereClause,
  applyRowLevelSecurity,
  maskSensitiveData
} from '../../../lib/reports/security';

// Mock createAdminClient to avoid actual Supabase calls
jest.mock('@/app/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
}));

describe('hasReportPermission', () => {
  test('should allow admin access to all reports', () => {
    expect(hasReportPermission('attendances', 'admin')).toBe(true);
    expect(hasReportPermission('invoices', 'admin')).toBe(true);
    expect(hasReportPermission('payouts', 'admin')).toBe(true);
  });

  test('should allow owner access to all reports', () => {
    expect(hasReportPermission('attendances', 'owner')).toBe(true);
    expect(hasReportPermission('invoices', 'owner')).toBe(true);
    expect(hasReportPermission('payouts', 'owner')).toBe(true);
  });

  test('should allow manager access to most reports', () => {
    expect(hasReportPermission('attendances', 'manager')).toBe(true);
    expect(hasReportPermission('invoices', 'manager')).toBe(true);
    expect(hasReportPermission('discount-codes', 'manager')).toBe(true);
  });

  test('should check specific permissions for members', () => {
    // Member without permissions
    expect(hasReportPermission('attendances', 'member', [])).toBe(false);
    
    // Member with view_attendances permission
    expect(hasReportPermission('attendances', 'member', ['view_attendances'])).toBe(true);
    
    // Member with view_reports permission
    expect(hasReportPermission('attendances', 'member', ['view_reports'])).toBe(true);
  });

  test('should handle financial reports appropriately', () => {
    // Member without financial permissions
    expect(hasReportPermission('invoices', 'member', [])).toBe(false);
    
    // Member with financial permissions
    expect(hasReportPermission('invoices', 'member', ['view_financial'])).toBe(true);
    expect(hasReportPermission('payouts', 'member', ['view_payouts'])).toBe(true);
  });

  test('should handle unknown report types', () => {
    expect(hasReportPermission('unknown-report', 'member', [])).toBe(false);
    expect(hasReportPermission('unknown-report', 'member', ['view_reports'])).toBe(true);
  });
});

describe('sanitizeReportFilters', () => {
  test('should validate and clean date filters', () => {
    const filters = {
      date_from: '2024-01-01T00:00:00Z',
      date_to: '2024-01-31T23:59:59Z',
      invalid_date: 'not-a-date'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.date_from).toBe('2024-01-01T00:00:00Z');
    expect(result.date_to).toBe('2024-01-31T23:59:59Z');
    expect(result).not.toHaveProperty('invalid_date');
  });

  test('should validate pagination parameters', () => {
    const filters = {
      page: '2',
      page_size: '100',
      invalid_page: 'not-a-number',
      huge_page_size: '5000'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.page).toBe(2);
    expect(result.page_size).toBe(100);
    expect(result).not.toHaveProperty('invalid_page');
    expect(result).not.toHaveProperty('huge_page_size'); // Not a recognized pagination field
  });

  test('should validate UUID fields', () => {
    const filters = {
      customer_id: '123e4567-e89b-12d3-a456-426614174000',
      invalid_uuid: 'not-a-uuid',
      class_type_id: 'invalid-format'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.customer_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result).not.toHaveProperty('invalid_uuid');
    expect(result).not.toHaveProperty('class_type_id');
  });

  test('should validate array filters', () => {
    const filters = {
      booking_method: ['membership', 'drop_in', 'invalid_method'],
      booking_source: ['web', 'mobile_app'],
      status: ['attended', 'no_show', 'invalid_status']
    };

    const result = sanitizeReportFilters(filters);

    expect(result.booking_method).toEqual(['membership', 'drop_in']);
    expect(result.booking_source).toEqual(['web', 'mobile_app']);
    expect(result.status).toEqual(['attended', 'no_show']);
  });

  test('should validate boolean filters', () => {
    const filters = {
      include_future: true,
      another_bool: 'true',
      false_bool: false,
      string_bool: 'false'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.include_future).toBe(true);
    expect(result).not.toHaveProperty('another_bool'); // Not a recognized field
    expect(result).not.toHaveProperty('false_bool'); // false is not included 
    expect(result).not.toHaveProperty('string_bool'); // Not a recognized field
  });

  test('should validate group_by parameter', () => {
    const filters = {
      group_by: 'customer',
      invalid_group: 'invalid_grouping'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.group_by).toBe('customer');
    expect(result).not.toHaveProperty('invalid_group');
  });

  test('should validate timezone', () => {
    const filters = {
      tz: 'America/New_York',
      invalid_tz: 'Invalid/Timezone'
    };

    const result = sanitizeReportFilters(filters);

    expect(result.tz).toBe('America/New_York');
    expect(result).not.toHaveProperty('invalid_tz');
  });

  test('should sanitize string values', () => {
    const filters = {
      search_term: '<script>alert("xss")</script>',
      another_field: "'; DROP TABLE users; --"
    };

    const result = sanitizeReportFilters(filters);

    expect(result.search_term).toBe('scriptalert(xss)script');
    expect(result).not.toHaveProperty('another_field'); // Not in allowedStringFields
  });

  test('should remove null and undefined values', () => {
    const filters = {
      valid_field: 'value',
      null_field: null,
      undefined_field: undefined,
      empty_string: ''
    };

    const result = sanitizeReportFilters(filters);

    expect(result.valid_field).toBe('value');
    expect(result.null_field).toBeUndefined();
    expect(result.undefined_field).toBeUndefined();
    expect(result).not.toHaveProperty('empty_string'); // Empty string not in allowedStringFields
  });
});

describe('buildSecureWhereClause', () => {
  const securityContext = {
    organizationId: 'org-123',
    userId: 'user-456',
    userRole: 'admin'
  };

  test('should always include organization isolation', () => {
    const result = buildSecureWhereClause(securityContext);

    expect(result.whereClause).toContain('organization_id = $1');
    expect(result.params[0]).toBe('org-123');
  });

  test('should add sanitized filters', () => {
    const filters = {
      status: 'attended',
      type: 'membership'
    };

    const result = buildSecureWhereClause(securityContext, filters);

    expect(result.whereClause).toContain('organization_id = $1');
    expect(result.whereClause).toContain('status = $2');
    expect(result.whereClause).toContain('type = $3');
    expect(result.params).toEqual(['org-123', 'attended', 'membership']);
  });

  test('should handle array filters', () => {
    const filters = {
      status: ['attended', 'registered']
    };

    const result = buildSecureWhereClause(securityContext, filters);

    expect(result.whereClause).toContain('organization_id = $1');
    expect(result.whereClause).toContain('status IN ($2, $3)');
    expect(result.params).toEqual(['org-123', 'attended', 'registered']);
  });

  test('should ignore invalid filters', () => {
    const filters = {
      valid_field: 'value',
      invalid_date: 'not-a-date',
      null_field: null
    };

    const result = buildSecureWhereClause(securityContext, filters);

    expect(result.whereClause).toContain('organization_id = $1');
    expect(result.whereClause).toContain('valid_field = $2');
    expect(result.whereClause).not.toContain('invalid_date');
    expect(result.whereClause).not.toContain('null_field');
    expect(result.params).toEqual(['org-123', 'value']);
  });
});

describe('applyRowLevelSecurity', () => {
  const securityContext = {
    organizationId: 'org-123',
    userId: 'user-456',
    userRole: 'admin'
  };

  test('should filter out records from other organizations', () => {
    const data = [
      { id: 1, organization_id: 'org-123', name: 'Record 1' },
      { id: 2, organization_id: 'org-456', name: 'Record 2' },
      { id: 3, organization_id: 'org-123', name: 'Record 3' }
    ];

    const result = applyRowLevelSecurity(data, securityContext);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(3);
  });

  test('should apply additional security rules', () => {
    const data = [
      { id: 1, organization_id: 'org-123', status: 'active' },
      { id: 2, organization_id: 'org-123', status: 'inactive' },
      { id: 3, organization_id: 'org-123', status: 'active' }
    ];

    const additionalRules = (record: any) => record.status === 'active';
    const result = applyRowLevelSecurity(data, securityContext, additionalRules);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(3);
  });

  test('should handle empty data', () => {
    const result = applyRowLevelSecurity([], securityContext);
    expect(result).toEqual([]);
  });

  test('should handle null/undefined data', () => {
    expect(applyRowLevelSecurity(null as any, securityContext)).toEqual([]);
    expect(applyRowLevelSecurity(undefined as any, securityContext)).toEqual([]);
  });
});

describe('maskSensitiveData', () => {
  const testData = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-123-4567',
      address: '123 Main St',
      payment_details: 'Card ending in 1234'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1-555-987-6543',
      address: '456 Oak Ave',
      credit_card: '1234-5678-9012-3456'
    }
  ];

  test('should not mask data for admin users', () => {
    const result = maskSensitiveData(testData, 'admin');

    expect(result[0].email).toBe('john@example.com');
    expect(result[0].phone).toBe('+1-555-123-4567');
    expect(result[1].credit_card).toBe('1234-5678-9012-3456');
  });

  test('should not mask data for owner users', () => {
    const result = maskSensitiveData(testData, 'owner');

    expect(result[0].email).toBe('john@example.com');
    expect(result[0].phone).toBe('+1-555-123-4567');
  });

  test('should partially mask data for manager users', () => {
    const result = maskSensitiveData(testData, 'manager');

    expect(result[0].email).toBe('j***@example.com');
    expect(result[0].phone).toBe('+1***67');
    expect(result[0].address).toBe('12***St');
  });

  test('should fully mask data for member users', () => {
    const result = maskSensitiveData(testData, 'member');

    expect(result[0].email).toBe('[REDACTED]');
    expect(result[0].phone).toBe('[REDACTED]');
    expect(result[0].address).toBe('[REDACTED]');
    expect(result[1].credit_card).toBe('[REDACTED]');
  });

  test('should handle empty data', () => {
    const result = maskSensitiveData([], 'member');
    expect(result).toEqual([]);
  });

  test('should handle null/undefined data', () => {
    expect(maskSensitiveData(null as any, 'member')).toEqual([]);
    expect(maskSensitiveData(undefined as any, 'member')).toEqual([]);
  });

  test('should preserve non-sensitive fields', () => {
    const result = maskSensitiveData(testData, 'member');

    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('John Doe');
    expect(result[1].id).toBe(2);
    expect(result[1].name).toBe('Jane Smith');
  });

  test('should handle missing sensitive fields gracefully', () => {
    const dataWithoutSensitive = [
      { id: 1, name: 'John Doe' }
    ];

    const result = maskSensitiveData(dataWithoutSensitive, 'member');

    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('John Doe');
    expect(result[0].email).toBeUndefined();
  });
});