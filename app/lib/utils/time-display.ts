/**
 * Utility functions for consistent time display across the app
 * Uses date-fns-tz for proper timezone handling
 */

import { formatInTimeZone } from "date-fns-tz";

/**
 * Format a timestamp for display
 * Simply shows the UTC time as stored - no timezone conversion needed
 * What was entered is what gets displayed
 */
export function formatTimeDisplay(timestamp: string | Date): string {
  try {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Simply display the UTC hours/minutes as stored
    // If stored as "06:00:00Z", display as "06:00"
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch (error) {
    console.warn("Error formatting time display:", error);
    // Fallback
    return "00:00";
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
