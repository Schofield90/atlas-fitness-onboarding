import { format, parseISO, addMinutes, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Timezone utilities for consistent time handling across the Atlas Fitness CRM
 * Ensures proper conversion between UTC storage and local display
 */

// Default timezone for the organization (can be made configurable per organization)
export const DEFAULT_TIMEZONE = "Europe/London"; // UK timezone with DST handling

/**
 * Get the user's timezone from browser or fallback to default
 */
export function getUserTimezone(): string {
  try {
    // Check if running in browser environment
    if (typeof window !== "undefined") {
      return (
        Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
      );
    }
    return DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Convert local time to UTC for database storage
 * @param localDateTime - Date object in local timezone
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object in UTC
 */
export function localToUtc(localDateTime: Date, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  return fromZonedTime(localDateTime, tz);
}

/**
 * Convert UTC time to local timezone for display
 * @param utcDateTime - Date object in UTC
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object in local timezone
 */
export function utcToLocal(utcDateTime: Date, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  return toZonedTime(utcDateTime, tz);
}

/**
 * Parse ISO string and convert to local timezone
 * @param isoString - ISO datetime string (assumed to be UTC)
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object in local timezone
 */
export function parseISOToLocal(isoString: string, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  const utcDate = parseISO(isoString);
  return toZonedTime(utcDate, tz);
}

/**
 * Format date for display in local timezone
 * @param date - Date object
 * @param formatString - Format string (date-fns format)
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date,
  formatString: string = "PPpp",
  timezone?: string,
): string {
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(date, tz, formatString);
}

/**
 * Create a Date object from date and time strings for a specific timezone
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:mm format
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object in local timezone
 */
export function createDateTimeInTimezone(
  dateString: string,
  timeString: string,
  timezone?: string,
): Date {
  const tz = timezone || getUserTimezone();
  const [hours, minutes] = timeString.split(":").map(Number);

  // Parse date and set time in the specified timezone
  const baseDate = parseISO(`${dateString}T00:00:00`);
  const dateWithTime = new Date(baseDate);
  dateWithTime.setHours(hours, minutes, 0, 0);

  // Convert to the target timezone
  return fromZonedTime(dateWithTime, tz);
}

/**
 * Parse time string and create a Date object for today in local timezone
 * @param timeString - Time in HH:mm or HH:mm:ss format
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object for today at the specified time
 */
export function parseTimeForToday(timeString: string, timezone?: string): Date {
  const today = new Date();
  const dateString = format(today, "yyyy-MM-dd");
  return createDateTimeInTimezone(dateString, timeString, timezone);
}

/**
 * Format time for display (24-hour format by default)
 * @param date - Date object
 * @param use24Hour - Whether to use 24-hour format
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Formatted time string
 */
export function formatTime(
  date: Date,
  use24Hour: boolean = true,
  timezone?: string,
): string {
  const tz = timezone || getUserTimezone();
  const formatString = use24Hour ? "HH:mm" : "h:mm a";
  return formatInTimeZone(date, tz, formatString);
}

/**
 * Format date for display
 * @param date - Date object
 * @param formatString - Format string (defaults to 'PPP' - long date)
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  formatString: string = "PPP",
  timezone?: string,
): string {
  const tz = timezone || getUserTimezone();
  return formatInTimeZone(date, tz, formatString);
}

/**
 * Check if a date/time is in the same day in a specific timezone
 * @param date1 - First date
 * @param date2 - Second date
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns True if both dates are on the same day
 */
export function isSameDay(
  date1: Date,
  date2: Date,
  timezone?: string,
): boolean {
  const tz = timezone || getUserTimezone();
  const zonedDate1 = toZonedTime(date1, tz);
  const zonedDate2 = toZonedTime(date2, tz);

  return format(zonedDate1, "yyyy-MM-dd") === format(zonedDate2, "yyyy-MM-dd");
}

/**
 * Get start and end of day in a specific timezone, returned as UTC
 * @param date - Date object
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Object with start and end of day in UTC
 */
export function getDayBoundariesUtc(
  date: Date,
  timezone?: string,
): {
  start: Date;
  end: Date;
} {
  const tz = timezone || getUserTimezone();
  const zonedDate = toZonedTime(date, tz);

  const dayStart = startOfDay(zonedDate);
  const dayEnd = endOfDay(zonedDate);

  return {
    start: fromZonedTime(dayStart, tz),
    end: fromZonedTime(dayEnd, tz),
  };
}

/**
 * Get the current time in a specific timezone
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Current date/time in the specified timezone
 */
export function getNowInTimezone(timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  return toZonedTime(new Date(), tz);
}

/**
 * Parse various time formats and normalize to HH:mm
 * @param timeInput - Time string in various formats
 * @returns Normalized time string in HH:mm format
 */
export function normalizeTimeString(timeInput: string): string {
  if (!timeInput || typeof timeInput !== "string") {
    throw new Error("Invalid time input");
  }

  // Remove whitespace and convert to lowercase
  const cleaned = timeInput.trim().toLowerCase();

  // Handle different time formats
  if (cleaned.includes("am") || cleaned.includes("pm")) {
    // Convert 12-hour to 24-hour format
    const time12Hour = cleaned.replace(/[^0-9:apm]/g, "");
    const [timePart, meridiem] = time12Hour.split(/([ap]m)/);
    const [hours, minutes = "00"] = timePart.split(":");

    let hour24 = parseInt(hours, 10);
    if (meridiem === "pm" && hour24 !== 12) {
      hour24 += 12;
    } else if (meridiem === "am" && hour24 === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  // Handle 24-hour format
  const timeMatch = cleaned.match(/(\d{1,2}):?(\d{2})?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2] || "0", 10);

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  throw new Error(`Invalid time format: ${timeInput}`);
}

/**
 * Validate if a time string is valid
 * @param timeString - Time string to validate
 * @returns True if valid, false otherwise
 */
export function isValidTimeString(timeString: string): boolean {
  try {
    normalizeTimeString(timeString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get time difference between two dates in minutes
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Difference in minutes
 */
export function getTimeDifferenceMinutes(
  startDate: Date,
  endDate: Date,
): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Add duration to a date
 * @param date - Base date
 * @param durationMinutes - Duration to add in minutes
 * @returns New date with duration added
 */
export function addDurationToDate(date: Date, durationMinutes: number): Date {
  return addMinutes(date, durationMinutes);
}

/**
 * Convert duration from various formats to minutes
 * @param duration - Duration string (e.g., "1h 30m", "90m", "1.5h")
 * @returns Duration in minutes
 */
export function parseDurationToMinutes(duration: string | number): number {
  if (typeof duration === "number") {
    return duration;
  }

  if (typeof duration !== "string") {
    throw new Error("Invalid duration format");
  }

  const cleaned = duration.toLowerCase().trim();

  // Handle formats like "1h 30m", "1 hour 30 minutes"
  const hourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/);
  const minuteMatch = cleaned.match(/(\d+)\s*m(?:inute)?s?/);

  let totalMinutes = 0;

  if (hourMatch) {
    totalMinutes += parseFloat(hourMatch[1]) * 60;
  }

  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1], 10);
  }

  // If no hour/minute indicators found, assume it's just minutes
  if (totalMinutes === 0) {
    const numberMatch = cleaned.match(/^\d+$/);
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[0], 10);
    }
  }

  if (totalMinutes === 0) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  return totalMinutes;
}

/**
 * Helper function for database queries - get date range in UTC
 * @param startDate - Start date in local timezone
 * @param endDate - End date in local timezone
 * @param timezone - Source timezone (defaults to user timezone)
 * @returns Object with UTC start and end dates for database queries
 */
export function getUtcDateRange(
  startDate: Date,
  endDate: Date,
  timezone?: string,
): {
  startUtc: string;
  endUtc: string;
} {
  const tz = timezone || getUserTimezone();

  const startUtc = fromZonedTime(startDate, tz);
  const endUtc = fromZonedTime(endDate, tz);

  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
  };
}

/**
 * Debug helper - get timezone info for debugging
 * @param date - Date to analyze (defaults to now)
 * @returns Object with timezone information
 */
export function getTimezoneDebugInfo(date: Date = new Date()): {
  userTimezone: string;
  defaultTimezone: string;
  utcDate: string;
  localDate: string;
  offset: number;
} {
  const userTz = getUserTimezone();
  const localDate = toZonedTime(date, userTz);

  return {
    userTimezone: userTz,
    defaultTimezone: DEFAULT_TIMEZONE,
    utcDate: date.toISOString(),
    localDate: formatInTimeZone(localDate, userTz, "yyyy-MM-dd HH:mm:ss zzz"),
    offset: date.getTimezoneOffset(),
  };
}
