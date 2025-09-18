/**
 * Report Query Utilities
 * Handles date presets, timezone conversion, and filter validation
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

/**
 * Standard date presets for reports
 */
export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return { from: today, to: tomorrow };
    }
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(yesterday.getDate() + 1);
      return { from: yesterday, to: today };
    }
  },
  {
    label: "Last 7 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      return { from: start, to: end };
    }
  },
  {
    label: "Last 30 Days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { from: start, to: end };
    }
  },
  {
    label: "This Week",
    getValue: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { from: start, to: end };
    }
  },
  {
    label: "Last Week",
    getValue: () => {
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      
      return { from: lastWeekStart, to: thisWeekStart };
    }
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return { from: start, to: end };
    }
  },
  {
    label: "Last Month",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: start, to: end };
    }
  },
  {
    label: "This Year",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear() + 1, 0, 1);
      return { from: start, to: end };
    }
  },
  {
    label: "Last Year",
    getValue: () => {
      const today = new Date();
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear(), 0, 1);
      return { from: start, to: end };
    }
  }
];

/**
 * Convert date to user's timezone
 */
export function convertToTimezone(date: Date, timezone: string): Date {
  try {
    // Create a date string in the target timezone
    const dateStr = date.toLocaleString('en-CA', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    return new Date(dateStr);
  } catch (error) {
    console.warn('Invalid timezone:', timezone, 'falling back to UTC');
    return date;
  }
}

/**
 * Validate date range for reports
 */
export function validateDateRange(from: string | Date, to: string | Date): {
  valid: boolean;
  error?: string;
  fromDate?: Date;
  toDate?: Date;
} {
  try {
    const fromDate = typeof from === 'string' ? new Date(from) : from;
    const toDate = typeof to === 'string' ? new Date(to) : to;

    if (isNaN(fromDate.getTime())) {
      return { valid: false, error: 'Invalid start date' };
    }

    if (isNaN(toDate.getTime())) {
      return { valid: false, error: 'Invalid end date' };
    }

    if (fromDate >= toDate) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    // Check for reasonable date range (not more than 2 years)
    const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 730) {
      return { valid: false, error: 'Date range cannot exceed 2 years' };
    }

    return { valid: true, fromDate, toDate };
  } catch (error) {
    return { valid: false, error: 'Failed to validate date range' };
  }
}

/**
 * Sanitize string input for SQL queries
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove potential SQL injection characters
  return input
    .replace(/['";\-\-\/\*]/g, '')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: string | number, pageSize?: string | number): {
  page: number;
  pageSize: number;
  valid: boolean;
  error?: string;
} {
  const pageNum = typeof page === 'string' ? parseInt(page) : (page !== undefined ? page : 1);
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize) : (pageSize !== undefined ? pageSize : 50);

  if (pageNum < 1) {
    return { page: 1, pageSize: 50, valid: false, error: 'Page must be >= 1' };
  }

  if (pageSizeNum < 1 || pageSizeNum > 1000) {
    return { page: pageNum, pageSize: 50, valid: false, error: 'Page size must be between 1 and 1000' };
  }

  return { page: pageNum, pageSize: pageSizeNum, valid: true };
}

/**
 * Build SQL WHERE conditions with proper organization isolation
 */
export function buildWhereConditions(organizationId: string, filters: Record<string, any>): {
  conditions: string[];
  params: any[];
} {
  const conditions = [`organization_id = $1`];
  const params = [organizationId];
  let paramIndex = 2;

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value) && value.length > 0) {
      const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`${key} IN (${placeholders})`);
      params.push(...value);
    } else if (typeof value === 'string' && value.trim()) {
      conditions.push(`${key} = $${paramIndex++}`);
      params.push(sanitizeInput(value));
    } else if (typeof value === 'number') {
      conditions.push(`${key} = $${paramIndex++}`);
      params.push(value.toString());
    }
  });

  return { conditions, params };
}

/**
 * Get date preset by label
 */
export function getDatePreset(label: string): DatePreset | null {
  return DATE_PRESETS.find(preset => preset.label === label) || null;
}

/**
 * Format date for display in reports
 */
export function formatReportDate(date: Date | string, timezone?: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (timezone) {
    return dateObj.toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if date is within valid business range
 */
export function isValidBusinessDate(date: Date): boolean {
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  
  // Allow dates from 5 years ago to 1 year in the future
  return year >= (currentYear - 5) && year <= (currentYear + 1);
}

/**
 * Generate cache key for report queries
 */
export function generateCacheKey(endpoint: string, filters: Record<string, any>): string {
  const sortedFilters = Object.keys(filters)
    .sort()
    .reduce((result: Record<string, any>, key) => {
      result[key] = filters[key];
      return result;
    }, {});

  return `reports:${endpoint}:${JSON.stringify(sortedFilters)}`;
}