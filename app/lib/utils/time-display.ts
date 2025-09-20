/**
 * Utility functions for consistent time display across the app
 * Uses date-fns-tz for proper timezone handling
 */

import { formatInTimeZone } from "date-fns-tz";

/**
 * Format a timestamp for display in the correct timezone
 * Uses formatInTimeZone for proper timezone handling including DST
 */
export function formatTimeDisplay(timestamp: string | Date): string {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Use formatInTimeZone for proper timezone handling
    return formatInTimeZone(date, "Europe/London", "HH:mm");
  } catch (error) {
    console.warn("Error formatting time display:", error);
    // Fallback to basic formatting if timezone conversion fails
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

/**
 * Format a date for display in the correct timezone
 */
export function formatDateDisplay(timestamp: string | Date): string {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Use formatInTimeZone for consistent timezone handling
    return formatInTimeZone(date, "Europe/London", "dd/MM/yyyy");
  } catch (error) {
    console.warn("Error formatting date display:", error);
    // Fallback to basic formatting if timezone conversion fails
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

/**
 * Format date and time together in the correct timezone
 */
export function formatDateTimeDisplay(timestamp: string | Date): string {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Use formatInTimeZone for consistent timezone handling
    return formatInTimeZone(date, "Europe/London", "dd/MM/yyyy HH:mm");
  } catch (error) {
    console.warn("Error formatting date time display:", error);
    // Fallback to separate formatting
    return `${formatDateDisplay(timestamp)} ${formatTimeDisplay(timestamp)}`;
  }
}
