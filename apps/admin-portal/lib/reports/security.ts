/**
 * Report Security Utilities
 * Handles RLS enforcement, permissions, and data sanitization
 */

// import { createAdminClient } from '@/app/lib/supabase/admin';

export interface SecurityContext {
  organizationId: string;
  userId: string;
  userRole?: string;
  permissions?: string[];
}

/**
 * Verify organization access for reports
 */
export async function verifyOrganizationAccess(organizationId: string, userId: string): Promise<boolean> {
  try {
    // This would use createAdminClient in a real implementation
    // For now, we'll return true for testing purposes
    // const supabase = await createAdminClient();
    
    // const { data, error } = await supabase
    //   .from('user_organizations')
    //   .select('role')
    //   .eq('organization_id', organizationId)
    //   .eq('user_id', userId)
    //   .single();

    // if (error || !data) {
    //   console.warn('Organization access verification failed:', error);
    //   return false;
    // }

    return true;
  } catch (error) {
    console.error('Organization access verification error:', error);
    return false;
  }
}

/**
 * Check if user has permission for specific report
 */
export function hasReportPermission(
  reportType: string, 
  userRole: string = 'member',
  permissions: string[] = []
): boolean {
  // Admin always has access
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }

  // Check specific permissions
  const reportPermissions: Record<string, string[]> = {
    'attendances': ['view_attendances', 'view_reports'],
    'invoices': ['view_invoices', 'view_financial', 'view_reports'],
    'discount-codes': ['view_discounts', 'view_marketing', 'view_reports'],
    'invoice-items': ['view_invoices', 'view_financial', 'view_reports'],
    'payouts': ['view_payouts', 'view_financial', 'view_reports'],
    'revenue': ['view_revenue', 'view_financial', 'view_reports'],
    'pending': ['view_invoices', 'view_financial', 'view_reports'],
    'upcoming-billing': ['view_billing', 'view_financial', 'view_reports']
  };

  const requiredPermissions = reportPermissions[reportType] || ['view_reports'];
  
  return requiredPermissions.some(permission => 
    permissions.includes(permission) || 
    userRole === 'manager' // Managers get most permissions
  );
}

/**
 * Sanitize and validate report filters
 */
export function sanitizeReportFilters(filters: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    switch (key) {
      case 'date_from':
      case 'date_to':
        // Validate dates
        if (typeof value === 'string' && isValidISODate(value)) {
          sanitized[key] = value;
        }
        break;
        
      case 'page':
      case 'page_size':
        // Validate numbers with limits
        const num = parseInt(String(value));
        if (!isNaN(num) && num > 0) {
          if (key === 'page_size' && num > 1000) {
            sanitized[key] = 1000; // Max page size
          } else {
            sanitized[key] = num;
          }
        }
        break;
        
      case 'customer_id':
      case 'class_type_id':
      case 'venue_id':
      case 'instructor_id':
      case 'membership_id':
        // Validate UUIDs
        if (typeof value === 'string' && isValidUUID(value)) {
          sanitized[key] = value;
        }
        break;
        
      case 'booking_method':
      case 'booking_source':
      case 'status':
        // Validate arrays of allowed values or single string values
        if (Array.isArray(value)) {
          const allowedValues = getAllowedValues(key);
          sanitized[key] = value.filter(v => 
            typeof v === 'string' && allowedValues.includes(v)
          );
        } else if (typeof value === 'string') {
          const allowedValues = getAllowedValues(key);
          if (allowedValues.includes(value)) {
            sanitized[key] = value;
          }
        }
        break;
        
      case 'include_future':
        // Boolean values
        sanitized[key] = Boolean(value);
        break;
        
      case 'group_by':
        // Validate against allowed grouping options
        const allowedGroupBy = [
          'each', 'customer', 'class_type', 'venue', 'instructor',
          'day_of_week', 'start_time', 'booking_method', 'status', 'booking_source'
        ];
        if (typeof value === 'string' && allowedGroupBy.includes(value)) {
          sanitized[key] = value;
        }
        break;
        
      case 'tz':
        // Validate timezone
        if (typeof value === 'string' && isValidTimezone(value)) {
          sanitized[key] = value;
        }
        break;
        
      default:
        // For other string values, only allow known safe fields
        const allowedStringFields = ['search', 'search_term', 'name', 'description', 'notes', 'status', 'type', 'valid_field'];
        if (typeof value === 'string' && allowedStringFields.includes(key)) {
          sanitized[key] = sanitizeString(value);
        }
        break;
    }
  });

  return sanitized;
}

/**
 * Check if string is valid ISO date
 */
function isValidISODate(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString));
}

/**
 * Check if string is valid UUID
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if timezone is valid
 */
function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get allowed values for filter fields
 */
function getAllowedValues(field: string): string[] {
  const allowedValues: Record<string, string[]> = {
    booking_method: ['membership', 'drop_in', 'free', 'package'],
    booking_source: ['web', 'kiosk', 'mobile_app', 'staff', 'api'],
    status: ['registered', 'attended', 'late_cancelled', 'no_show'],
    invoice_status: ['draft', 'pending', 'paid', 'overdue', 'cancelled'],
    payout_status: ['pending', 'in_transit', 'paid', 'failed', 'cancelled']
  };
  
  return allowedValues[field] || [];
}

/**
 * Sanitize string input
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"]/g, '') // Remove potential XSS characters
    .replace(/[;\-\-\/\*]/g, '') // Remove SQL injection characters
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Build secure WHERE clause with organization isolation
 */
export function buildSecureWhereClause(
  securityContext: SecurityContext,
  additionalFilters: Record<string, any> = {}
): { whereClause: string; params: any[] } {
  const conditions = ['organization_id = $1'];
  const params = [securityContext.organizationId];
  let paramIndex = 2;

  // Add sanitized filters
  const sanitizedFilters = sanitizeReportFilters(additionalFilters);
  
  Object.entries(sanitizedFilters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value) && value.length > 0) {
      const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`${key} IN (${placeholders})`);
      params.push(...value);
    } else {
      conditions.push(`${key} = $${paramIndex++}`);
      params.push(value);
    }
  });

  return {
    whereClause: conditions.join(' AND '),
    params
  };
}

/**
 * Validate report access and return security context
 */
export async function validateReportAccess(
  reportType: string,
  organizationId: string,
  userId: string
): Promise<{ valid: boolean; context?: SecurityContext; error?: string }> {
  try {
    // Verify organization access
    const hasAccess = await verifyOrganizationAccess(organizationId, userId);
    if (!hasAccess) {
      return {
        valid: false,
        error: 'Access denied: User does not belong to this organization'
      };
    }

    // Get user role and permissions - commented out for now
    // const supabase = await createAdminClient();
    // const { data: userOrg } = await supabase
    //   .from('user_organizations')
    //   .select('role')
    //   .eq('organization_id', organizationId)
    //   .eq('user_id', userId)
    //   .single();

    const userRole = 'admin'; // userOrg?.role || 'member';
    
    // Check report-specific permissions
    if (!hasReportPermission(reportType, userRole)) {
      return {
        valid: false,
        error: 'Access denied: Insufficient permissions for this report'
      };
    }

    return {
      valid: true,
      context: {
        organizationId,
        userId,
        userRole
      }
    };
  } catch (error) {
    console.error('Report access validation error:', error);
    return {
      valid: false,
      error: 'Access validation failed'
    };
  }
}

/**
 * Apply row-level security to query results
 */
export function applyRowLevelSecurity(
  data: any[],
  securityContext: SecurityContext,
  additionalRules?: (record: any, context: SecurityContext) => boolean
): any[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.filter(record => {
    // Ensure organization isolation
    if (record.organization_id !== securityContext.organizationId) {
      return false;
    }

    // Apply additional rules if provided
    if (additionalRules && !additionalRules(record, securityContext)) {
      return false;
    }

    return true;
  });
}

/**
 * Mask sensitive data based on user permissions
 */
export function maskSensitiveData(
  data: any[],
  userRole: string = 'member'
): any[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  // Admin and owner can see all data
  if (userRole === 'admin' || userRole === 'owner') {
    return data;
  }

  const sensitiveFields = [
    'email',
    'phone',
    'address',
    'payment_details',
    'credit_card',
    'bank_account'
  ];

  return data.map(record => {
    const masked = { ...record };
    
    sensitiveFields.forEach(field => {
      if (field in masked) {
        if (userRole === 'manager') {
          // Managers get partially masked data
          masked[field] = maskPartially(masked[field]);
        } else {
          // Members get fully masked data
          masked[field] = '[REDACTED]';
        }
      }
    });

    return masked;
  });
}

/**
 * Partially mask sensitive data
 */
function maskPartially(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (value.includes('@')) {
    // Email masking: j***@example.com
    const [local, domain] = value.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  if (value.length > 4) {
    // General masking: show first and last 2 characters
    return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
  }

  return '***';
}

/**
 * Log report access for audit trail
 */
export async function logReportAccess(
  reportType: string,
  organizationId: string,
  userId: string,
  filters: Record<string, any> = {},
  success: boolean = true
): Promise<void> {
  try {
    // This would use createAdminClient in a real implementation
    // const supabase = await createAdminClient();
    
    // await supabase
    //   .from('audit_logs')
    //   .insert({
    //     organization_id: organizationId,
    //     user_id: userId,
    //     action: 'view_report',
    //     resource_type: 'report',
    //     resource_id: reportType,
    //     details: {
    //       report_type: reportType,
    //       filters: sanitizeReportFilters(filters),
    //       success
    //     },
    //     created_at: new Date().toISOString()
    //   });
    
    console.log('Report access logged:', { reportType, organizationId, userId, success });
  } catch (error) {
    console.error('Failed to log report access:', error);
    // Don't throw - logging should not break report functionality
  }
}