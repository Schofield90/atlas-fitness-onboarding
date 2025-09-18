import { toOrgTimezone } from "./query";

// ====================
// CURRENCY FORMATTING
// ====================

/**
 * Format currency based on locale and currency code
 */
export function formatCurrency(
  amountInPennies: number,
  currencyCode: string = "GBP",
  locale: string = "en-GB",
): string {
  if (typeof amountInPennies !== "number" || isNaN(amountInPennies)) {
    return formatCurrency(0, currencyCode, locale);
  }

  const amount = amountInPennies / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.warn(
      `Failed to format currency ${currencyCode} for locale ${locale}:`,
      error,
    );
    // Fallback to basic formatting
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format currency for export (plain text)
 */
export function formatCurrencyForExport(
  amountInPennies: number,
  currencyCode: string = "GBP",
): string {
  if (typeof amountInPennies !== "number" || isNaN(amountInPennies)) {
    return "0.00";
  }

  const amount = amountInPennies / 100;
  return amount.toFixed(2);
}

/**
 * Format currency with symbol only (no code)
 */
export function formatCurrencySymbol(
  amountInPennies: number,
  currencyCode: string = "GBP",
  locale: string = "en-GB",
): string {
  const formatted = formatCurrency(amountInPennies, currencyCode, locale);

  // Currency symbols by code
  const symbols: Record<string, string> = {
    GBP: "£",
    USD: "$",
    EUR: "€",
    CAD: "C$",
    AUD: "A$",
  };

  const symbol = symbols[currencyCode] || currencyCode;
  const amount = amountInPennies / 100;

  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ====================
// DATE FORMATTING
// ====================

/**
 * Format date based on format string and timezone
 */
export function formatDate(
  date: string | Date,
  format: string = "dd/MM/yyyy",
  timezone: string = "UTC",
): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const tzDate = toOrgTimezone(dateObj, timezone);

    switch (format) {
      case "dd/MM/yyyy":
        return tzDate.toLocaleDateString("en-GB");

      case "MM/dd/yyyy":
        return tzDate.toLocaleDateString("en-US");

      case "yyyy-MM-dd":
        return tzDate.toISOString().split("T")[0];

      case "dd MMM yyyy":
        return tzDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

      case "dd MMMM yyyy":
        return tzDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });

      case "relative":
        return formatRelativeDate(tzDate);

      case "iso":
        return tzDate.toISOString();

      default:
        return tzDate.toLocaleDateString("en-GB");
    }
  } catch (error) {
    console.warn("Date formatting error:", error);
    return "";
  }
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: string | Date,
  format: string = "dd/MM/yyyy HH:mm",
  timezone: string = "UTC",
): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "";
    }

    const tzDate = toOrgTimezone(dateObj, timezone);

    switch (format) {
      case "dd/MM/yyyy HH:mm":
        return `${tzDate.toLocaleDateString("en-GB")} ${tzDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

      case "MM/dd/yyyy hh:mm a":
        return tzDate.toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

      case "yyyy-MM-dd HH:mm":
        return `${tzDate.toISOString().split("T")[0]} ${tzDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

      case "readable":
        return tzDate.toLocaleString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

      default:
        return tzDate.toLocaleString("en-GB");
    }
  } catch (error) {
    console.warn("DateTime formatting error:", error);
    return "";
  }
}

/**
 * Format time only
 */
export function formatTime(
  date: string | Date,
  format: string = "HH:mm",
  timezone: string = "UTC",
): string {
  if (!date) return "";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const tzDate = toOrgTimezone(dateObj, timezone);

    switch (format) {
      case "HH:mm":
        return tzDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

      case "hh:mm a":
        return tzDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

      case "HH:mm:ss":
        return tzDate.toLocaleTimeString("en-GB");

      default:
        return tzDate.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  } catch (error) {
    console.warn("Time formatting error:", error);
    return "";
  }
}

/**
 * Format relative date (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (Math.abs(diffDays) >= 7) {
    // More than a week - show actual date
    return formatDate(date, "dd MMM yyyy");
  } else if (Math.abs(diffDays) >= 1) {
    // Days
    return diffDays > 0
      ? `in ${diffDays} day${diffDays === 1 ? "" : "s"}`
      : `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
  } else if (Math.abs(diffHours) >= 1) {
    // Hours
    return diffHours > 0
      ? `in ${diffHours} hour${diffHours === 1 ? "" : "s"}`
      : `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? "" : "s"} ago`;
  } else if (Math.abs(diffMinutes) >= 1) {
    // Minutes
    return diffMinutes > 0
      ? `in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`
      : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) === 1 ? "" : "s"} ago`;
  } else {
    return "just now";
  }
}

// ====================
// NUMBER FORMATTING
// ====================

/**
 * Format number with locale-specific formatting
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    locale?: string;
    style?: "decimal" | "percent";
    compact?: boolean;
  } = {},
): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0";
  }

  const {
    decimals = 0,
    locale = "en-GB",
    style = "decimal",
    compact = false,
  } = options;

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      style,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    };

    if (compact && Math.abs(value) >= 1000) {
      formatOptions.notation = "compact";
      formatOptions.compactDisplay = "short";
    }

    return new Intl.NumberFormat(locale, formatOptions).format(value);
  } catch (error) {
    console.warn("Number formatting error:", error);
    return value.toFixed(decimals);
  }
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = "en-GB",
): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0%";
  }

  // Convert to percentage (value should be 0-100, not 0-1)
  const percentage = value > 1 ? value : value * 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(percentage / 100);
  } catch (error) {
    console.warn("Percentage formatting error:", error);
    return `${percentage.toFixed(decimals)}%`;
  }
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatCompactNumber(
  value: number,
  locale: string = "en-GB",
): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0";
  }

  try {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value);
  } catch (error) {
    // Fallback for browsers without compact notation support
    const abs = Math.abs(value);
    if (abs >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (abs >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (abs >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  }
}

// ====================
// DURATION FORMATTING
// ====================

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (typeof minutes !== "number" || isNaN(minutes) || minutes <= 0) {
    return "0 min";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  } else if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Format seconds to MM:SS format
 */
export function formatTimeFromSeconds(seconds: number): string {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// ====================
// STATUS FORMATTING
// ====================

/**
 * Format attendance status for display
 */
export function formatAttendanceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    registered: "Registered",
    attended: "Attended",
    late_cancelled: "Late Cancelled",
    no_show: "No Show",
  };

  return statusMap[status] || status;
}

/**
 * Format invoice status for display
 */
export function formatInvoiceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}

/**
 * Format payout status for display
 */
export function formatPayoutStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}

/**
 * Format booking method for display
 */
export function formatBookingMethod(method: string): string {
  const methodMap: Record<string, string> = {
    membership: "Membership",
    drop_in: "Drop-in",
    free: "Free",
    package: "Package",
  };

  return methodMap[method] || method;
}

/**
 * Format booking source for display
 */
export function formatBookingSource(source: string): string {
  const sourceMap: Record<string, string> = {
    web: "Website",
    kiosk: "Kiosk",
    mobile_app: "Mobile App",
    staff: "Staff",
    api: "API",
  };

  return sourceMap[source] || source;
}

// ====================
// CONTACT FORMATTING
// ====================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(
  phoneNumber: string,
  countryCode: string = "GB",
): string {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  if (countryCode === "GB" && digits.length === 11 && digits.startsWith("0")) {
    // UK mobile: 07123 456789
    if (digits.startsWith("07")) {
      return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    // UK landline: 020 1234 5678
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
  }

  // Fallback: just return the original number
  return phoneNumber;
}

/**
 * Format email for display (with optional truncation)
 */
export function formatEmail(email: string, maxLength?: number): string {
  if (!email) return "";

  if (maxLength && email.length > maxLength) {
    const [username, domain] = email.split("@");
    if (domain) {
      const availableLength = maxLength - domain.length - 4; // -4 for "@..."
      if (availableLength > 0) {
        return `${username.slice(0, availableLength)}...@${domain}`;
      }
    }
    return `${email.slice(0, maxLength - 3)}...`;
  }

  return email;
}

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Format customer name from first and last name
 */
export function formatCustomerName(
  firstName?: string,
  lastName?: string,
): string {
  const first = firstName?.trim() || "";
  const last = lastName?.trim() || "";

  if (first && last) {
    return `${first} ${last}`;
  } else if (first) {
    return first;
  } else if (last) {
    return last;
  } else {
    return "Unknown Customer";
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: {
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
}): string {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.postcode,
    address.country,
  ].filter(Boolean);

  return parts.join(", ");
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const base = 1024;
  const index = Math.floor(Math.log(bytes) / Math.log(base));
  const size = bytes / Math.pow(base, index);

  return `${size.toFixed(1)} ${units[index]}`;
}
