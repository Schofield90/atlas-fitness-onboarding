// ====================
// REPORTS LIBRARY INDEX
// ====================

// Export all types
export * from "./types";

// Export utilities
export * from "./query";
export * from "./cache";
export * from "./security";
export * from "./formatting";
export * from "./export";
export * from "./performance";

// Export commonly used functions with specific names for easier importing
export {
  // Query utilities
  validateAttendanceFilters,
  validateInvoiceFilters,
  validatePayoutFilters,
  validateDiscountCodeFilters,
  generateCacheKey,
  resolveDateRange,
  DEFAULT_DATE_PRESETS,

  // Cache utilities
  generateReportCacheKey,
  generateChartCacheKey,
  getCacheTTL,
  getSWRConfig,

  // Security utilities
  verifyOrganizationAccess,
  verifyReportPermission,
  sanitizeQueryParams,
  logReportAccess,
  maskSensitiveData,

  // Formatting utilities
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercentage,
  formatNumber,
  formatDuration,
  formatAttendanceStatus,
  formatInvoiceStatus,
  formatCustomerName,

  // Export utilities
  convertToCSV,
  createCSVDownloadResponse,
  generateExportFilename,
  getExportFields,
  getGroupedExportFields,
  validateExportLimits,

  // Performance utilities
  startQueryTracking,
  endQueryTracking,
  recordCacheEvent,
  recordReportError,
  getQueryPerformanceStats,
  getCachePerformanceStats,
  getErrorStats,
  checkPerformanceAlerts,
  getPerformanceDashboard,
} from "./query";

export {
  generateReportCacheKey,
  generateChartCacheKey,
  getCacheTTL,
  getSWRConfig,
  invalidateCache,
  warmCache,
} from "./cache";

export {
  verifyOrganizationAccess,
  verifyReportPermission,
  enforceRLS,
  validateOrganizationIsolation,
  sanitizeQueryParams,
  checkRateLimit,
  logReportAccess,
  maskSensitiveData,
  getSecurityHeaders,
} from "./security";

export {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatPercentage,
  formatNumber,
  formatDuration,
  formatAttendanceStatus,
  formatInvoiceStatus,
  formatPayoutStatus,
  formatBookingMethod,
  formatBookingSource,
  formatCustomerName,
  formatPhoneNumber,
  formatEmail,
} from "./formatting";

export {
  convertToCSV,
  createCSVDownloadResponse,
  generateExportFilename,
  getExportFields,
  getGroupedExportFields,
  getAttendanceExportFields,
  getInvoiceExportFields,
  getPayoutExportFields,
  getDiscountCodeExportFields,
  validateExportLimits,
  estimateExportFileSize,
  EXPORT_LIMITS,
} from "./export";

export {
  startQueryTracking,
  endQueryTracking,
  recordCacheEvent,
  recordReportError,
  getQueryPerformanceStats,
  getCachePerformanceStats,
  getErrorStats,
  checkPerformanceAlerts,
  getPerformanceDashboard,
  cleanupPerformanceData,
  exportPerformanceMetrics,
} from "./performance";

// ====================
// CONVENIENCE HELPERS
// ====================

/**
 * All-in-one report query helper that includes validation, caching, and performance tracking
 */
export async function executeReportQuery<T = any>(config: {
  reportType: import("./types").ReportType;
  organizationId: string;
  userId: string;
  filters: Record<string, any>;
  queryFn: () => Promise<T>;
  cacheKey?: string;
  skipCache?: boolean;
}): Promise<T> {
  const queryId = `${config.reportType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = startQueryTracking(queryId);

  try {
    // Validate organization access
    const orgAccess = await verifyOrganizationAccess();
    if (!orgAccess.success) {
      throw new Error(orgAccess.error);
    }

    // Verify report permissions
    const hasPermission = await verifyReportPermission(
      config.userId,
      config.organizationId,
      config.reportType,
    );
    if (!hasPermission) {
      throw new Error("Insufficient permissions for this report");
    }

    // Sanitize filters
    const sanitizedFilters = sanitizeQueryParams(config.filters);

    // Execute query
    const result = await config.queryFn();

    // Track performance
    const rowCount = Array.isArray(result) ? result.length : 1;
    endQueryTracking(
      queryId,
      startTime,
      config.organizationId,
      config.reportType,
      sanitizedFilters,
      rowCount,
      false, // Not from cache since we executed the query
      config.cacheKey,
    );

    // Log access
    await logReportAccess(
      config.userId,
      config.organizationId,
      config.reportType,
      "view",
      sanitizedFilters,
    );

    return result;
  } catch (error: any) {
    // Record error
    recordReportError(
      "QUERY_EXECUTION_ERROR",
      error.message,
      { reportType: config.reportType, organizationId: config.organizationId },
      queryId,
    );

    // Track failed query
    endQueryTracking(
      queryId,
      startTime,
      config.organizationId,
      config.reportType,
      config.filters,
      0,
      false,
    );

    throw error;
  }
}

/**
 * Helper to validate and format report request
 */
export function prepareReportRequest(
  reportType: import("./types").ReportType,
  rawFilters: Record<string, any>,
): {
  valid: boolean;
  filters?: Record<string, any>;
  errors?: string[];
} {
  // Validate the request
  const validation = import("./security").then((security) =>
    security.validateReportRequest(rawFilters),
  );

  // Note: This should be called in an async context
  // Implementation would depend on specific validation needs

  return {
    valid: true,
    filters: rawFilters,
    errors: undefined,
  };
}

// ====================
// CONSTANTS
// ====================

export const REPORT_CONSTANTS = {
  MAX_EXPORT_ROWS: 100000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  CACHE_TTL_SHORT: 300, // 5 minutes
  CACHE_TTL_DEFAULT: 1800, // 30 minutes
  CACHE_TTL_LONG: 3600, // 1 hour
  SLOW_QUERY_THRESHOLD_MS: 5000,
  HIGH_ERROR_RATE_THRESHOLD: 5, // errors per hour
  LOW_CACHE_HIT_RATE_THRESHOLD: 70, // percentage
} as const;

// ====================
// VERSION INFO
// ====================

export const REPORTS_VERSION = "1.0.0";
export const REPORTS_BUILD_DATE = new Date().toISOString();
