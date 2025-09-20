// Webhook Security and HMAC Validation
// Provides secure webhook handling with signature verification

import crypto from "crypto";
import { AutomationInputValidator } from "./input-validator";

export interface WebhookValidationOptions {
  algorithm?: string;
  encoding?: BufferEncoding;
  tolerance?: number; // Tolerance for timestamp validation in seconds
  requireTimestamp?: boolean;
  maxPayloadSize?: number;
}

export interface WebhookValidationResult {
  isValid: boolean;
  payload: any;
  errors: string[];
  warnings: string[];
  metadata: {
    timestamp?: number;
    signatureValid: boolean;
    payloadSize: number;
  };
}

export class WebhookSecurityManager {
  private static readonly DEFAULT_ALGORITHM = "sha256";
  private static readonly DEFAULT_ENCODING: BufferEncoding = "hex";
  private static readonly DEFAULT_TOLERANCE = 300; // 5 minutes
  private static readonly MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

  /**
   * Validate webhook signature using HMAC
   */
  static validateSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
    options: WebhookValidationOptions = {},
  ): boolean {
    try {
      const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
      const encoding = options.encoding || this.DEFAULT_ENCODING;

      // Ensure payload is a string
      const payloadString = Buffer.isBuffer(payload)
        ? payload.toString()
        : payload;

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payloadString, "utf8")
        .digest(encoding);

      // Handle different signature formats
      const cleanSignature = this.cleanSignature(signature);
      const expectedCleanSignature = this.cleanSignature(expectedSignature);

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, encoding),
        Buffer.from(expectedCleanSignature, encoding),
      );
    } catch (error) {
      console.error("Signature validation error:", error);
      return false;
    }
  }

  /**
   * Validate webhook with comprehensive security checks
   */
  static async validateWebhook(
    payload: string,
    signature: string | undefined,
    secret: string,
    organizationId: string,
    options: WebhookValidationOptions = {},
  ): Promise<WebhookValidationResult> {
    const result: WebhookValidationResult = {
      isValid: false,
      payload: null,
      errors: [],
      warnings: [],
      metadata: {
        signatureValid: false,
        payloadSize: payload.length,
      },
    };

    try {
      // Check payload size
      const maxSize = options.maxPayloadSize || this.MAX_PAYLOAD_SIZE;
      if (payload.length > maxSize) {
        result.errors.push(
          `Payload too large: ${payload.length} bytes (max: ${maxSize})`,
        );
        return result;
      }

      // Validate signature if provided
      if (signature && secret) {
        result.metadata.signatureValid = this.validateSignature(
          payload,
          signature,
          secret,
          options,
        );

        if (!result.metadata.signatureValid) {
          result.errors.push("Invalid webhook signature");
          return result;
        }
      } else if (signature) {
        result.warnings.push("Signature provided but no secret configured");
      }

      // Parse and validate payload
      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (parseError) {
        result.errors.push("Invalid JSON payload");
        return result;
      }

      // Extract timestamp for replay attack prevention
      const timestamp = this.extractTimestamp(parsedPayload);
      if (timestamp) {
        result.metadata.timestamp = timestamp;

        if (options.requireTimestamp) {
          const tolerance = options.tolerance || this.DEFAULT_TOLERANCE;
          const now = Math.floor(Date.now() / 1000);

          if (Math.abs(now - timestamp) > tolerance) {
            result.errors.push(
              "Webhook timestamp too old or too far in future",
            );
            return result;
          }
        }
      } else if (options.requireTimestamp) {
        result.errors.push("Missing required timestamp in webhook payload");
        return result;
      }

      // Validate and sanitize payload using existing validator
      const validationResult = AutomationInputValidator.validateTriggerData(
        parsedPayload,
        organizationId,
      );

      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors);
        return result;
      }

      result.warnings.push(...validationResult.warnings);
      result.payload = validationResult.sanitizedData;
      result.isValid = true;
    } catch (error: any) {
      result.errors.push(`Webhook validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate webhook signature for outgoing webhooks
   */
  static generateSignature(
    payload: string,
    secret: string,
    options: WebhookValidationOptions = {},
  ): string {
    const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
    const encoding = options.encoding || this.DEFAULT_ENCODING;

    const signature = crypto
      .createHmac(algorithm, secret)
      .update(payload, "utf8")
      .digest(encoding);

    return `${algorithm}=${signature}`;
  }

  /**
   * Create webhook payload with timestamp and signature
   */
  static createSecureWebhookPayload(
    data: any,
    secret: string,
    options: WebhookValidationOptions = {},
  ): { payload: string; signature: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000);

    const payloadWithTimestamp = {
      ...data,
      timestamp: timestamp,
    };

    const payload = JSON.stringify(payloadWithTimestamp);
    const signature = this.generateSignature(payload, secret, options);

    return {
      payload,
      signature,
      timestamp,
    };
  }

  /**
   * Validate webhook URL format and security
   */
  static validateWebhookUrl(url: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const parsedUrl = new URL(url);

      // Must use HTTPS in production
      if (
        parsedUrl.protocol !== "https:" &&
        process.env.NODE_ENV === "production"
      ) {
        errors.push("Webhook URLs must use HTTPS in production");
      }

      // Prevent localhost/private IP ranges in production
      if (process.env.NODE_ENV === "production") {
        const hostname = parsedUrl.hostname;

        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("10.") ||
          hostname.startsWith("172.")
        ) {
          errors.push("Private IP addresses not allowed for webhook URLs");
        }
      }

      // Validate reasonable port ranges
      if (parsedUrl.port) {
        const port = parseInt(parsedUrl.port);
        if (port < 80 || port > 65535) {
          errors.push("Invalid port number");
        }
      }

      // Prevent excessively long URLs
      if (url.length > 2048) {
        errors.push("Webhook URL too long (max 2048 characters)");
      }
    } catch (error) {
      errors.push("Invalid URL format");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Rate limiting for webhook endpoints
   */
  static async checkRateLimit(
    organizationId: string,
    endpoint: string,
    windowMs: number = 60000, // 1 minute
    maxRequests: number = 100,
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    // This would typically use Redis or a similar store
    // For now, we'll use a simple in-memory implementation

    const key = `webhook_rate_limit:${organizationId}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // In a real implementation, you'd use Redis:
    // const redis = getRedisClient()
    // const requests = await redis.zcount(key, windowStart, now)

    // Simplified in-memory rate limiting (not suitable for production clustering)
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    let requests = this.rateLimitStore.get(key) || [];
    requests = requests.filter((timestamp: number) => timestamp > windowStart);

    const allowed = requests.length < maxRequests;
    const resetTime = now + windowMs;
    const remaining = Math.max(0, maxRequests - requests.length);

    if (allowed) {
      requests.push(now);
      this.rateLimitStore.set(key, requests);
    }

    return {
      allowed,
      resetTime,
      remaining,
    };
  }

  /**
   * Clean signature format (remove algorithm prefix if present)
   */
  private static cleanSignature(signature: string): string {
    // Handle formats like "sha256=abc123" or just "abc123"
    const match = signature.match(/^(?:sha256=|sha1=)?(.+)$/);
    return match ? match[1] : signature;
  }

  /**
   * Extract timestamp from webhook payload
   */
  private static extractTimestamp(payload: any): number | null {
    // Try different common timestamp field names
    const timestampFields = ["timestamp", "ts", "created_at", "event_time"];

    for (const field of timestampFields) {
      if (payload[field]) {
        const timestamp = parseInt(payload[field]);
        if (!isNaN(timestamp)) {
          // Handle both seconds and milliseconds
          return timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp;
        }
      }
    }

    return null;
  }

  /**
   * Generate secure webhook secret
   */
  static generateWebhookSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Verify webhook delivery attempt authenticity
   */
  static verifyDeliveryAttempt(
    payload: any,
    organizationId: string,
    webhookId: string,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verify the webhook belongs to the organization
    if (!payload.webhook_id || payload.webhook_id !== webhookId) {
      errors.push("Webhook ID mismatch");
    }

    if (
      !payload.organization_id ||
      payload.organization_id !== organizationId
    ) {
      errors.push("Organization ID mismatch");
    }

    // Verify required fields
    if (!payload.event_type) {
      errors.push("Missing event type");
    }

    if (!payload.event_id) {
      errors.push("Missing event ID");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Simple in-memory rate limit store (use Redis in production)
  private static rateLimitStore: Map<string, number[]>;
}

/**
 * Webhook Security Middleware for Express/Next.js
 */
export function createWebhookSecurityMiddleware(
  getSecret: (organizationId: string) => Promise<string | null>,
  options: WebhookValidationOptions = {},
) {
  return async (
    payload: string,
    signature: string | undefined,
    organizationId: string,
  ): Promise<WebhookValidationResult> => {
    const secret = await getSecret(organizationId);

    if (!secret) {
      return {
        isValid: false,
        payload: null,
        errors: ["No webhook secret configured for organization"],
        warnings: [],
        metadata: {
          signatureValid: false,
          payloadSize: payload.length,
        },
      };
    }

    return WebhookSecurityManager.validateWebhook(
      payload,
      signature,
      secret,
      organizationId,
      options,
    );
  };
}
