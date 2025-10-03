/**
 * Standardized calendar navigation utilities for consistent date handling
 * across all calendar components
 */

import {
  formatInTimezone,
  getUserTimezone,
  utcToLocal,
  isSameDay,
} from "./timezone-utils";

export type CalendarView = "day" | "week" | "month";

/**
 * Navigate to next/previous period based on view type
 * @param currentDate - Current date being displayed
 * @param view - Current calendar view (day/week/month)
 * @param direction - Navigation direction
 * @returns New date after navigation
 */
export function navigateDate(
  currentDate: Date,
  view: CalendarView,
  direction: "prev" | "next",
): Date {
  const newDate = new Date(currentDate);

  switch (view) {
    case "day":
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
      break;
    case "week":
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
      break;
  }

  return newDate;
}

/**
 * Get start and end dates for the current view period
 * @param currentDate - Current date being displayed
 * @param view - Current calendar view
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Object with start and end dates for the period
 */
export function getViewDateRange(
  currentDate: Date,
  view: CalendarView,
  timezone?: string,
): { start: Date; end: Date } {
  const tz = timezone || getUserTimezone();

  // Ensure we're working with local timezone
  const localDate = utcToLocal(currentDate, tz);

  switch (view) {
    case "day":
      return {
        start: new Date(localDate),
        end: new Date(localDate),
      };

    case "week":
      const weekStart = new Date(localDate);
      // Set to Monday (start of week)
      const dayOfWeek = weekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      weekStart.setDate(weekStart.getDate() - daysToMonday);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      return { start: weekStart, end: weekEnd };

    case "month":
      const monthStart = new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        localDate.getFullYear(),
        localDate.getMonth() + 1,
        0,
      );

      return { start: monthStart, end: monthEnd };

    default:
      return { start: localDate, end: localDate };
  }
}

/**
 * Format date range for display based on view type
 * @param currentDate - Current date being displayed
 * @param view - Current calendar view
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Formatted date range string
 */
export function formatDateRange(
  currentDate: Date,
  view: CalendarView,
  timezone?: string,
): string {
  const tz = timezone || getUserTimezone();
  const { start, end } = getViewDateRange(currentDate, view, tz);

  switch (view) {
    case "day":
      return formatInTimezone(start, "EEEE, MMMM d, yyyy", tz);

    case "week":
      // If same month, show "Jan 1 - 7, 2024"
      if (start.getMonth() === end.getMonth()) {
        return `${formatInTimezone(start, "MMM d", tz)} - ${formatInTimezone(end, "d, yyyy", tz)}`;
      }
      // If different months, show "Jan 30 - Feb 5, 2024"
      return `${formatInTimezone(start, "MMM d", tz)} - ${formatInTimezone(end, "MMM d, yyyy", tz)}`;

    case "month":
      return formatInTimezone(start, "MMMM yyyy", tz);

    default:
      return formatInTimezone(currentDate, "PPP", tz);
  }
}

/**
 * Check if a date is within the current view's date range
 * @param date - Date to check
 * @param currentDate - Current date being displayed in view
 * @param view - Current calendar view
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns True if date is within the current view period
 */
export function isDateInView(
  date: Date,
  currentDate: Date,
  view: CalendarView,
  timezone?: string,
): boolean {
  const { start, end } = getViewDateRange(currentDate, view, timezone);

  switch (view) {
    case "day":
      return isSameDay(date, currentDate, timezone);

    case "week":
    case "month":
      return date >= start && date <= end;

    default:
      return false;
  }
}

/**
 * Navigate to today
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Date object representing today
 */
export function navigateToToday(timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  return new Date(); // Current date in local timezone
}

/**
 * Get the week start date (Monday) for a given date
 * @param date - Date to get week start for
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Monday of the week containing the given date
 */
export function getWeekStart(date: Date, timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  const localDate = utcToLocal(date, tz);

  const dayOfWeek = localDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekStart = new Date(localDate);
  weekStart.setDate(localDate.getDate() - daysToMonday);

  return weekStart;
}

/**
 * Get all days in the current week for week view display
 * @param currentDate - Current date being displayed
 * @param timezone - Target timezone (defaults to user timezone)
 * @returns Array of 7 dates representing the week (Monday to Sunday)
 */
export function getWeekDays(currentDate: Date, timezone?: string): Date[] {
  const weekStart = getWeekStart(currentDate, timezone);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }

  return days;
}
