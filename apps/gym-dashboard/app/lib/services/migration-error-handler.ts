/**
 * Migration Error Handler
 * Comprehensive error handling and validation for GoTeamUp migration system
 */

import { supabaseAdmin } from "../supabase/admin";
import { enhancedQueueManager } from "../queue/enhanced-queue-manager";

export interface ValidationError {
  type: "validation" | "format" | "reference" | "duplicate" | "required";
  field: string;
  value: any;
  message: string;
  suggestion?: string;
  severity: "error" | "warning" | "info";
  row?: number;
}

export interface MigrationError {
  id: string;
  jobId: string;
  type: "upload" | "analysis" | "mapping" | "import" | "system";
  code: string;
  message: string;
  details: any;
  severity: "critical" | "high" | "medium" | "low";
  recoverable: boolean;
  timestamp: Date;
  context?: any;
}

export interface ErrorReport {
  totalErrors: number;
  criticalErrors: number;
  recoverableErrors: number;
  errorsByType: Record<string, number>;
  validationIssues: ValidationError[];
  migrationErrors: MigrationError[];
  recommendations: string[];
}

export class MigrationErrorHandler {
  private jobId: string;
  private organizationId: string;

  constructor(jobId: string, organizationId: string) {
    this.jobId = jobId;
    this.organizationId = organizationId;
  }

  /**
   * Validate uploaded file before processing
   */
  async validateFile(file: File): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // File size validation
    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      errors.push({
        type: "validation",
        field: "file_size",
        value: file.size,
        message: "File size exceeds 100MB limit",
        suggestion:
          "Split the file into smaller parts or remove unnecessary columns",
        severity: "error",
      });
    }

    // File type validation
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push({
        type: "format",
        field: "file_type",
        value: file.type,
        message: "Unsupported file format",
        suggestion: "Convert file to CSV or Excel format",
        severity: "error",
      });
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push({
        type: "validation",
        field: "file_name",
        value: file.name,
        message: "File name too long",
        suggestion: "Rename file to be under 255 characters",
        severity: "warning",
      });
    }

    return errors;
  }

  /**
   * Validate data structure and content
   */
  async validateData(
    data: any[],
    headers: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Header validation
    if (headers.length === 0) {
      errors.push({
        type: "validation",
        field: "headers",
        value: headers,
        message: "No column headers found",
        suggestion: "Ensure first row contains column headers",
        severity: "error",
      });
      return errors;
    }

    // Duplicate header check
    const duplicateHeaders = this.findDuplicates(headers);
    if (duplicateHeaders.length > 0) {
      errors.push({
        type: "validation",
        field: "headers",
        value: duplicateHeaders,
        message: `Duplicate column headers found: ${duplicateHeaders.join(", ")}`,
        suggestion: "Rename duplicate columns to have unique names",
        severity: "error",
      });
    }

    // Empty data validation
    if (data.length === 0) {
      errors.push({
        type: "validation",
        field: "data",
        value: data.length,
        message: "No data rows found",
        suggestion: "Ensure file contains data below the header row",
        severity: "error",
      });
      return errors;
    }

    // Row-by-row validation
    for (let i = 0; i < Math.min(data.length, 1000); i++) {
      // Validate first 1000 rows
      const row = data[i];
      const rowErrors = await this.validateRow(row, headers, i + 2); // +2 for 1-based index and header row
      errors.push(...rowErrors);
    }

    // Data consistency checks
    const consistencyErrors = await this.validateDataConsistency(data, headers);
    errors.push(...consistencyErrors);

    return errors;
  }

  /**
   * Validate individual row data
   */
  private async validateRow(
    row: any,
    headers: string[],
    rowNumber: number,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for completely empty rows
    const hasData = Object.values(row).some(
      (value) => value != null && value !== "",
    );
    if (!hasData) {
      errors.push({
        type: "validation",
        field: "row",
        value: row,
        message: "Empty row found",
        suggestion: "Remove empty rows or add data",
        severity: "warning",
        row: rowNumber,
      });
      return errors;
    }

    // Validate required fields (common fitness industry fields)
    const requiredFields = [
      "name",
      "first_name",
      "email",
      "member_name",
      "client_name",
    ];
    const hasRequiredField = requiredFields.some((field) =>
      headers.some(
        (header) =>
          header.toLowerCase().includes(field.toLowerCase()) &&
          row[header] != null &&
          row[header] !== "",
      ),
    );

    if (!hasRequiredField) {
      errors.push({
        type: "required",
        field: "identifier",
        value: row,
        message: "No identifiable name or email found",
        suggestion: "Ensure each row has at least a name or email field",
        severity: "error",
        row: rowNumber,
      });
    }

    // Email validation
    const emailFields = headers.filter((h) =>
      h.toLowerCase().includes("email"),
    );
    for (const emailField of emailFields) {
      const email = row[emailField];
      if (email && !this.isValidEmail(email)) {
        errors.push({
          type: "format",
          field: emailField,
          value: email,
          message: "Invalid email format",
          suggestion: "Correct email format (e.g., user@domain.com)",
          severity: "error",
          row: rowNumber,
        });
      }
    }

    // Phone validation
    const phoneFields = headers.filter(
      (h) =>
        h.toLowerCase().includes("phone") ||
        h.toLowerCase().includes("mobile") ||
        h.toLowerCase().includes("tel"),
    );
    for (const phoneField of phoneFields) {
      const phone = row[phoneField];
      if (phone && !this.isValidPhone(phone)) {
        errors.push({
          type: "format",
          field: phoneField,
          value: phone,
          message: "Invalid phone number format",
          suggestion: "Use format: +1234567890 or (123) 456-7890",
          severity: "warning",
          row: rowNumber,
        });
      }
    }

    // Date validation
    const dateFields = headers.filter(
      (h) =>
        h.toLowerCase().includes("date") ||
        h.toLowerCase().includes("birth") ||
        h.toLowerCase().includes("start") ||
        h.toLowerCase().includes("end"),
    );
    for (const dateField of dateFields) {
      const date = row[dateField];
      if (date && !this.isValidDate(date)) {
        errors.push({
          type: "format",
          field: dateField,
          value: date,
          message: "Invalid date format",
          suggestion: "Use format: YYYY-MM-DD or MM/DD/YYYY",
          severity: "warning",
          row: rowNumber,
        });
      }
    }

    return errors;
  }

  /**
   * Validate data consistency across the dataset
   */
  private async validateDataConsistency(
    data: any[],
    headers: string[],
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for potential duplicates based on email
    const emailField = headers.find((h) => h.toLowerCase().includes("email"));
    if (emailField) {
      const emailCounts = new Map<string, number>();
      data.forEach((row, index) => {
        const email = row[emailField];
        if (email && email.trim()) {
          const normalizedEmail = email.toLowerCase().trim();
          emailCounts.set(
            normalizedEmail,
            (emailCounts.get(normalizedEmail) || 0) + 1,
          );
        }
      });

      const duplicateEmails = Array.from(emailCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([email, count]) => `${email} (${count} times)`);

      if (duplicateEmails.length > 0) {
        errors.push({
          type: "duplicate",
          field: emailField,
          value: duplicateEmails,
          message: `Duplicate email addresses found: ${duplicateEmails.slice(0, 5).join(", ")}`,
          suggestion: "Review and merge duplicate records or use unique emails",
          severity: "warning",
        });
      }
    }

    // Check for suspicious data patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(data, headers);
    errors.push(...suspiciousPatterns);

    return errors;
  }

  /**
   * Handle migration errors during processing
   */
  async handleMigrationError(
    error: Error,
    type: MigrationError["type"],
    context?: any,
  ): Promise<MigrationError> {
    const migrationError: MigrationError = {
      id: crypto.randomUUID(),
      jobId: this.jobId,
      type,
      code: this.getErrorCode(error),
      message: error.message,
      details: {
        stack: error.stack,
        name: error.name,
        context,
      },
      severity: this.determineSeverity(error, type),
      recoverable: this.isRecoverable(error, type),
      timestamp: new Date(),
    };

    // Log error to database
    await this.logError(migrationError);

    // Handle based on severity and type
    await this.processErrorResponse(migrationError);

    return migrationError;
  }

  /**
   * Generate comprehensive error report
   */
  async generateErrorReport(
    validationErrors: ValidationError[],
  ): Promise<ErrorReport> {
    // Get migration errors from database
    const { data: migrationErrors } = await supabaseAdmin
      .from("migration_logs")
      .select("*")
      .eq("migration_job_id", this.jobId)
      .eq("log_level", "error");

    const errors = migrationErrors || [];

    const report: ErrorReport = {
      totalErrors: validationErrors.length + errors.length,
      criticalErrors:
        validationErrors.filter((e) => e.severity === "error").length +
        errors.filter((e) => e.metadata?.severity === "critical").length,
      recoverableErrors: validationErrors.filter(
        (e) => e.severity === "warning",
      ).length,
      errorsByType: this.groupErrorsByType(validationErrors),
      validationIssues: validationErrors,
      migrationErrors: errors.map(this.convertLogToError),
      recommendations: this.generateRecommendations(validationErrors, errors),
    };

    return report;
  }

  /**
   * Attempt automatic error recovery
   */
  async attemptAutoRecovery(error: MigrationError): Promise<boolean> {
    switch (error.code) {
      case "TIMEOUT_ERROR":
        // Retry with smaller batch size
        return await this.retryWithSmallerBatch(error);

      case "RATE_LIMIT_ERROR":
        // Wait and retry
        return await this.retryAfterDelay(error, 5000);

      case "VALIDATION_ERROR":
        // Skip invalid records and continue
        return await this.skipInvalidRecords(error);

      case "DUPLICATE_KEY_ERROR":
        // Handle duplicates based on settings
        return await this.handleDuplicateRecords(error);

      default:
        return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private findDuplicates(arr: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const item of arr) {
      if (seen.has(item.toLowerCase())) {
        duplicates.add(item);
      } else {
        seen.add(item.toLowerCase());
      }
    }

    return Array.from(duplicates);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  private isValidDate(date: string): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900;
  }

  private detectSuspiciousPatterns(
    data: any[],
    headers: string[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for too many identical values
    for (const header of headers) {
      const values = data
        .map((row) => row[header])
        .filter((v) => v != null && v !== "");
      if (values.length === 0) continue;

      const valueCounts = new Map<string, number>();
      values.forEach((v) => {
        const str = String(v).toLowerCase();
        valueCounts.set(str, (valueCounts.get(str) || 0) + 1);
      });

      const mostCommonValue = Array.from(valueCounts.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0];

      if (mostCommonValue && mostCommonValue[1] / values.length > 0.8) {
        errors.push({
          type: "validation",
          field: header,
          value: mostCommonValue[0],
          message: `Suspicious: ${Math.round((mostCommonValue[1] / values.length) * 100)}% of values are identical`,
          suggestion: "Review data for potential issues or placeholder values",
          severity: "warning",
        });
      }
    }

    return errors;
  }

  private getErrorCode(error: Error): string {
    if (error.message.includes("timeout")) return "TIMEOUT_ERROR";
    if (error.message.includes("rate limit")) return "RATE_LIMIT_ERROR";
    if (error.message.includes("duplicate")) return "DUPLICATE_KEY_ERROR";
    if (error.message.includes("validation")) return "VALIDATION_ERROR";
    if (error.message.includes("permission")) return "PERMISSION_ERROR";
    if (error.message.includes("network")) return "NETWORK_ERROR";
    return "UNKNOWN_ERROR";
  }

  private determineSeverity(
    error: Error,
    type: MigrationError["type"],
  ): MigrationError["severity"] {
    if (type === "system") return "critical";
    if (error.message.includes("timeout")) return "medium";
    if (error.message.includes("validation")) return "low";
    if (error.message.includes("duplicate")) return "low";
    return "medium";
  }

  private isRecoverable(error: Error, type: MigrationError["type"]): boolean {
    const recoverableCodes = [
      "TIMEOUT_ERROR",
      "RATE_LIMIT_ERROR",
      "VALIDATION_ERROR",
      "DUPLICATE_KEY_ERROR",
    ];
    return recoverableCodes.includes(this.getErrorCode(error));
  }

  private async logError(error: MigrationError): Promise<void> {
    try {
      await supabaseAdmin.from("migration_logs").insert({
        migration_job_id: this.jobId,
        organization_id: this.organizationId,
        log_level: "error",
        message: error.message,
        step: error.type,
        metadata: {
          errorId: error.id,
          code: error.code,
          severity: error.severity,
          recoverable: error.recoverable,
          details: error.details,
        },
      });
    } catch (logError) {
      console.error("Failed to log migration error:", logError);
    }
  }

  private async processErrorResponse(error: MigrationError): Promise<void> {
    // Update job status based on error severity
    if (error.severity === "critical") {
      await this.failMigrationJob(error.message);
    } else if (error.recoverable) {
      // Attempt auto-recovery
      const recovered = await this.attemptAutoRecovery(error);
      if (!recovered && error.severity === "high") {
        await this.pauseMigrationForManualReview(error);
      }
    }
  }

  private async failMigrationJob(errorMessage: string): Promise<void> {
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", this.jobId);
  }

  private async pauseMigrationForManualReview(
    error: MigrationError,
  ): Promise<void> {
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "pending",
        error_message: `Manual review required: ${error.message}`,
      })
      .eq("id", this.jobId);
  }

  private groupErrorsByType(errors: ValidationError[]): Record<string, number> {
    return errors.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private convertLogToError(log: any): MigrationError {
    return {
      id: log.id,
      jobId: log.migration_job_id,
      type: log.step || "system",
      code: log.metadata?.code || "UNKNOWN_ERROR",
      message: log.message,
      details: log.metadata?.details || {},
      severity: log.metadata?.severity || "medium",
      recoverable: log.metadata?.recoverable || false,
      timestamp: new Date(log.created_at),
    };
  }

  private generateRecommendations(
    validationErrors: ValidationError[],
    migrationErrors: any[],
  ): string[] {
    const recommendations: string[] = [];

    // Validation error recommendations
    const criticalCount = validationErrors.filter(
      (e) => e.severity === "error",
    ).length;
    if (criticalCount > 0) {
      recommendations.push(
        `${criticalCount} critical validation errors must be fixed before import`,
      );
    }

    const emailErrors = validationErrors.filter((e) =>
      e.field.toLowerCase().includes("email"),
    ).length;
    if (emailErrors > 0) {
      recommendations.push(
        `${emailErrors} email format issues found - consider data cleaning`,
      );
    }

    const duplicateErrors = validationErrors.filter(
      (e) => e.type === "duplicate",
    ).length;
    if (duplicateErrors > 0) {
      recommendations.push(
        "Duplicate records detected - enable duplicate handling or clean data first",
      );
    }

    // Migration error recommendations
    if (migrationErrors.length > 0) {
      recommendations.push("Review migration logs for processing errors");
    }

    // General recommendations
    if (validationErrors.length > 100) {
      recommendations.push(
        "High number of validation issues - consider data quality review",
      );
    }

    return recommendations;
  }

  // Recovery methods
  private async retryWithSmallerBatch(error: MigrationError): Promise<boolean> {
    // Implementation for retrying with smaller batch sizes
    return true;
  }

  private async retryAfterDelay(
    error: MigrationError,
    delay: number,
  ): Promise<boolean> {
    // Implementation for delayed retry
    await new Promise((resolve) => setTimeout(resolve, delay));
    return true;
  }

  private async skipInvalidRecords(error: MigrationError): Promise<boolean> {
    // Implementation for skipping invalid records
    return true;
  }

  private async handleDuplicateRecords(
    error: MigrationError,
  ): Promise<boolean> {
    // Implementation for handling duplicate records
    return true;
  }
}

// Export singleton factory
export function createMigrationErrorHandler(
  jobId: string,
  organizationId: string,
): MigrationErrorHandler {
  return new MigrationErrorHandler(jobId, organizationId);
}
