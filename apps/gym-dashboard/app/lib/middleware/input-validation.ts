import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

// Create a server-side DOMPurify instance
const window = new JSDOM("").window;
const purify = DOMPurify(window);

/**
 * Input validation and sanitization middleware for security
 */
export class InputValidationMiddleware {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== "string") {
      return "";
    }

    return purify.sanitize(input, {
      ALLOWED_TAGS: [
        "b",
        "i",
        "em",
        "strong",
        "p",
        "br",
        "ul",
        "ol",
        "li",
        "a",
      ],
      ALLOWED_ATTR: ["href", "target"],
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPT: true,
      FORBID_TAGS: ["script", "object", "embed", "iframe", "form", "input"],
      KEEP_CONTENT: true,
    });
  }

  /**
   * Sanitize plain text to remove potential malicious content
   */
  static sanitizeText(input: string): string {
    if (typeof input !== "string") {
      return "";
    }

    // Remove script tags and suspicious patterns
    return input
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/data:text\/html/gi, "")
      .replace(/vbscript:/gi, "")
      .replace(/onload=/gi, "")
      .replace(/onerror=/gi, "")
      .replace(/onclick=/gi, "")
      .replace(/onmouseover=/gi, "")
      .trim();
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): string | null {
    if (typeof email !== "string") {
      return null;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = email.toLowerCase().trim();

    if (!emailRegex.test(sanitized)) {
      return null;
    }

    // Additional security checks
    if (
      sanitized.includes("..") ||
      sanitized.startsWith(".") ||
      sanitized.endsWith(".")
    ) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize phone numbers
   */
  static sanitizePhone(phone: string): string | null {
    if (typeof phone !== "string") {
      return null;
    }

    // Remove all non-digit characters except + at the beginning
    const sanitized = phone.replace(/[^\d+]/g, "");

    // Basic phone number validation
    if (sanitized.length < 7 || sanitized.length > 15) {
      return null;
    }

    // Check for valid international format
    if (sanitized.startsWith("+")) {
      return sanitized;
    }

    // Add + for international numbers or validate domestic format
    return sanitized.length >= 10 ? `+${sanitized}` : sanitized;
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string | null {
    if (typeof url !== "string") {
      return null;
    }

    try {
      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return null;
      }

      // Block suspicious patterns
      if (
        urlObj.href.includes("javascript:") ||
        urlObj.href.includes("data:") ||
        urlObj.href.includes("vbscript:")
      ) {
        return null;
      }

      return urlObj.href;
    } catch {
      return null;
    }
  }

  /**
   * Sanitize SQL-like inputs to prevent injection
   */
  static sanitizeSqlInput(input: string): string {
    if (typeof input !== "string") {
      return "";
    }

    // Remove common SQL injection patterns
    return input
      .replace(/['";]/g, "") // Remove quotes and semicolons
      .replace(/--/g, "") // Remove SQL comments
      .replace(/\/\*/g, "") // Remove SQL block comment start
      .replace(/\*\//g, "") // Remove SQL block comment end
      .replace(/\bUNION\b/gi, "")
      .replace(/\bSELECT\b/gi, "")
      .replace(/\bINSERT\b/gi, "")
      .replace(/\bUPDATE\b/gi, "")
      .replace(/\bDELETE\b/gi, "")
      .replace(/\bDROP\b/gi, "")
      .replace(/\bALTER\b/gi, "")
      .replace(/\bCREATE\b/gi, "")
      .replace(/\bEXEC\b/gi, "")
      .trim();
  }

  /**
   * Validate JSON input and prevent prototype pollution
   */
  static sanitizeJson(input: any): any {
    if (typeof input !== "object" || input === null) {
      return input;
    }

    // Prevent prototype pollution
    if (
      "__proto__" in input ||
      "constructor" in input ||
      "prototype" in input
    ) {
      const sanitized = { ...input };
      delete sanitized.__proto__;
      delete sanitized.constructor;
      delete sanitized.prototype;
      return sanitized;
    }

    return input;
  }

  /**
   * Comprehensive input sanitization for API requests
   */
  static sanitizeRequestBody(body: any): any {
    if (typeof body !== "object" || body === null) {
      return body;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(body)) {
      // Skip prototype pollution keys
      if (["__proto__", "constructor", "prototype"].includes(key)) {
        continue;
      }

      if (typeof value === "string") {
        // Apply appropriate sanitization based on field name
        if (key.toLowerCase().includes("email")) {
          sanitized[key] = this.sanitizeEmail(value);
        } else if (key.toLowerCase().includes("phone")) {
          sanitized[key] = this.sanitizePhone(value);
        } else if (
          key.toLowerCase().includes("url") ||
          key.toLowerCase().includes("link")
        ) {
          sanitized[key] = this.sanitizeUrl(value);
        } else if (
          key.toLowerCase().includes("html") ||
          key.toLowerCase().includes("content")
        ) {
          sanitized[key] = this.sanitizeHtml(value);
        } else {
          sanitized[key] = this.sanitizeText(value);
        }
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate file upload security
   */
  static validateFileUpload(file: {
    name: string;
    type: string;
    size: number;
  }): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: "File size exceeds 10MB limit" };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: "File type not allowed" };
    }

    // Check filename for malicious patterns
    const suspiciousPatterns = [
      /\.php$/i,
      /\.js$/i,
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.com$/i,
      /\.pif$/i,
      /\.asp$/i,
      /\.jsp$/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        return {
          valid: false,
          error: "Filename contains prohibited extension",
        };
      }
    }

    return { valid: true };
  }

  /**
   * Rate limiting validation
   */
  static checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000, // 1 minute
  ): { allowed: boolean; remaining: number; resetTime: number } {
    // This is a simplified in-memory rate limiter
    // In production, use Redis or similar
    const now = Date.now();
    const key = `rate_limit:${identifier}`;

    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime,
    };
  }

  private static rateLimitStore: Map<
    string,
    { count: number; resetTime: number }
  > = new Map();

  /**
   * Clean up expired rate limit entries
   */
  static cleanupRateLimit(): void {
    if (!this.rateLimitStore) return;

    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

// Clean up rate limit store every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      InputValidationMiddleware.cleanupRateLimit();
    },
    5 * 60 * 1000,
  );
}

export default InputValidationMiddleware;
