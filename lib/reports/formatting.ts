/**
 * Report Formatting Utilities
 * Handles currency, date, number formatting for reports
 */

export interface FormattingOptions {
  locale?: string;
  timezone?: string;
  currency?: string;
  showCents?: boolean;
}

/**
 * Format currency amount (pennies to display currency)
 */
export function formatCurrency(
  amountPennies: number,
  currency: string = 'USD',
  options: FormattingOptions = {}
): string {
  const { locale = 'en-US', showCents = true } = options;
  
  if (typeof amountPennies !== 'number' || isNaN(amountPennies)) {
    return formatCurrency(0, currency, options);
  }

  const amount = amountPennies / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    }).format(amount);
  } catch (error) {
    console.warn('Currency formatting error:', error);
    return `${currency} ${amount.toFixed(showCents ? 2 : 0)}`;
  }
}

/**
 * Format percentage with proper rounding
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  } catch (error) {
    return `${value.toFixed(decimals)}%`;
  }
}

/**
 * Format large numbers with proper units (K, M, B)
 */
export function formatNumber(
  value: number,
  options: {
    compact?: boolean;
    decimals?: number;
    locale?: string;
  } = {}
): string {
  const { compact = false, decimals = 0, locale = 'en-US' } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }

  try {
    if (compact && Math.abs(value) >= 1000) {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      }).format(value);
    }

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (error) {
    return value.toFixed(decimals);
  }
}

/**
 * Format date for display in reports
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'medium' | 'long' | 'full' | 'iso' = 'medium',
  options: FormattingOptions = {}
): string {
  const { locale = 'en-US', timezone } = options;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  try {
    if (format === 'iso') {
      return dateObj.toISOString();
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone
    };

    switch (format) {
      case 'short':
        formatOptions.dateStyle = 'short';
        break;
      case 'medium':
        formatOptions.dateStyle = 'medium';
        break;
      case 'long':
        formatOptions.dateStyle = 'long';
        break;
      case 'full':
        formatOptions.dateStyle = 'full';
        break;
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return dateObj.toLocaleDateString();
  }
}

/**
 * Format time for display
 */
export function formatTime(
  date: Date | string,
  format: '12h' | '24h' = '12h',
  options: FormattingOptions = {}
): string {
  const { locale = 'en-US', timezone } = options;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
      hour12: format === '12h',
      timeZone: timezone
    }).format(dateObj);
  } catch (error) {
    console.warn('Time formatting error:', error);
    return dateObj.toLocaleTimeString();
  }
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | string,
  dateFormat: 'short' | 'medium' | 'long' = 'medium',
  timeFormat: '12h' | '24h' = '12h',
  options: FormattingOptions = {}
): string {
  const { locale = 'en-US', timezone } = options;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour12: timeFormat === '12h'
    };

    switch (dateFormat) {
      case 'short':
        formatOptions.dateStyle = 'short';
        formatOptions.timeStyle = 'short';
        break;
      case 'medium':
        formatOptions.dateStyle = 'medium';
        formatOptions.timeStyle = 'short';
        break;
      case 'long':
        formatOptions.dateStyle = 'long';
        formatOptions.timeStyle = 'medium';
        break;
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  } catch (error) {
    console.warn('DateTime formatting error:', error);
    return dateObj.toLocaleString();
  }
}

/**
 * Format duration (minutes to human readable)
 */
export function formatDuration(minutes: number): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
    return '0 min';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string, country: string = 'US'): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (country === 'US' && cleaned.length === 10) {
    // US format: (555) 123-4567
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (country === 'US' && cleaned.length === 11 && cleaned.startsWith('1')) {
    // US format with country code: +1 (555) 123-4567
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // International format or fallback
  return `+${cleaned}`;
}

/**
 * Format status with proper capitalization
 */
export function formatStatus(status: string): string {
  if (!status || typeof status !== 'string') {
    return '';
  }

  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format boolean as Yes/No
 */
export function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * Format array as comma-separated list
 */
export function formatArray(
  array: any[],
  formatter?: (item: any) => string,
  separator: string = ', '
): string {
  if (!Array.isArray(array) || array.length === 0) {
    return '';
  }

  if (formatter) {
    return array.map(formatter).join(separator);
  }

  return array.join(separator);
}

/**
 * Format address for display
 */
export function formatAddress(address: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}): string {
  if (!address) return '';

  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.state && address.postal_code ? `${address.state} ${address.postal_code}` : address.state || address.postal_code,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format file size (bytes to human readable)
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '';
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffDays) >= 1) {
      return rtf.format(-diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(-diffHours, 'hour');
    } else if (Math.abs(diffMinutes) >= 1) {
      return rtf.format(-diffMinutes, 'minute');
    } else {
      return rtf.format(-diffSeconds, 'second');
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return formatDate(dateObj, 'short');
  }
}

/**
 * Format report title with proper casing
 */
export function formatReportTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get appropriate color for status
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    // Attendance statuses
    attended: 'text-green-500',
    registered: 'text-blue-500',
    no_show: 'text-red-500',
    late_cancelled: 'text-yellow-500',
    
    // Invoice statuses
    paid: 'text-green-500',
    pending: 'text-yellow-500',
    overdue: 'text-red-500',
    cancelled: 'text-gray-500',
    draft: 'text-blue-500',
    
    // Payout statuses
    completed: 'text-green-500',
    processing: 'text-blue-500',
    failed: 'text-red-500',
    
    // General statuses
    active: 'text-green-500',
    inactive: 'text-gray-500',
    expired: 'text-red-500'
  };

  return colorMap[status.toLowerCase()] || 'text-gray-500';
}