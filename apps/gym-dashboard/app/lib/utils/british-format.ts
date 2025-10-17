/**
 * Utility functions for British formatting (currency, dates, etc.)
 */

/**
 * Format a number as British currency (pounds)
 * @param amount The amount in pence or pounds
 * @param inPence Whether the amount is in pence (true) or pounds (false)
 * @returns Formatted string like "£10.50"
 */
export function formatBritishCurrency(amount: number, inPence: boolean = true): string {
  const pounds = inPence ? amount / 100 : amount
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pounds)
}

/**
 * Format a date in British format (DD/MM/YYYY)
 * @param date The date to format
 * @returns Formatted string like "25/12/2024"
 */
export function formatBritishDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

/**
 * Format a date and time in British format
 * @param date The date to format
 * @returns Formatted string like "25/12/2024, 14:30"
 */
export function formatBritishDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

/**
 * Format time in 24-hour format
 * @param date The date to extract time from
 * @returns Formatted string like "14:30"
 */
export function formatBritishTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}

/**
 * Parse a British date string (DD/MM/YYYY) to Date object
 * @param dateString Date string in DD/MM/YYYY format
 * @returns Date object
 */
export function parseBritishDate(dateString: string): Date {
  const [day, month, year] = dateString.split('/').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get British timezone (Europe/London)
 */
export const BRITISH_TIMEZONE = 'Europe/London'

/**
 * Get current date/time in British timezone
 */
export function getBritishNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BRITISH_TIMEZONE }))
}

/**
 * Format a relative date (e.g., "Today", "Yesterday", "25/12/2024")
 */
export function formatBritishRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return formatBritishDate(d)
  }
}