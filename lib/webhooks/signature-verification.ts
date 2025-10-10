/**
 * Webhook signature verification utilities
 * Prevents webhook forgery attacks
 */

import crypto from 'crypto';
import Stripe from 'stripe';

interface WebhookVerificationResult {
  verified: boolean;
  error?: string;
  payload?: any;
}

/**
 * Verifies Stripe webhook signatures
 * @param payload - Raw request body (must be raw string/buffer, not parsed JSON)
 * @param signature - Stripe-Signature header value
 * @param secret - Webhook endpoint secret from Stripe dashboard
 * @returns Verification result with parsed event if successful
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature) {
    return {
      verified: false,
      error: 'Missing Stripe-Signature header'
    };
  }

  if (!secret) {
    return {
      verified: false,
      error: 'Webhook secret not configured'
    };
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia'
    });

    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    return {
      verified: true,
      payload: event
    };
  } catch (err: any) {
    return {
      verified: false,
      error: `Webhook signature verification failed: ${err.message}`
    };
  }
}

/**
 * Verifies GoCardless webhook signatures
 * @param payload - Request body as string
 * @param signature - Webhook-Signature header value
 * @param secret - Webhook secret from GoCardless dashboard
 * @returns Verification result
 */
export function verifyGoCardlessWebhook(
  payload: string,
  signature: string | null,
  secret: string
): WebhookVerificationResult {
  if (!signature) {
    return {
      verified: false,
      error: 'Missing Webhook-Signature header'
    };
  }

  if (!secret) {
    return {
      verified: false,
      error: 'Webhook secret not configured'
    };
  }

  try {
    // GoCardless uses HMAC-SHA256
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computedSignature);

    if (signatureBuffer.length !== computedBuffer.length) {
      return {
        verified: false,
        error: 'Invalid signature format'
      };
    }

    const verified = crypto.timingSafeEqual(signatureBuffer, computedBuffer);

    if (verified) {
      return {
        verified: true,
        payload: JSON.parse(payload)
      };
    } else {
      return {
        verified: false,
        error: 'Invalid webhook signature'
      };
    }
  } catch (err: any) {
    return {
      verified: false,
      error: `Webhook verification failed: ${err.message}`
    };
  }
}

/**
 * Generic HMAC signature verification for custom webhooks
 * @param payload - Request body
 * @param signature - Signature header value
 * @param secret - Shared secret
 * @param algorithm - Hash algorithm (default: sha256)
 * @returns Verification result
 */
export function verifyHMACSignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string,
  algorithm: string = 'sha256'
): WebhookVerificationResult {
  if (!signature) {
    return {
      verified: false,
      error: 'Missing signature header'
    };
  }

  if (!secret) {
    return {
      verified: false,
      error: 'Webhook secret not configured'
    };
  }

  try {
    const computedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Timing-safe comparison
    const signatureBuffer = Buffer.from(signature);
    const computedBuffer = Buffer.from(computedSignature);

    if (signatureBuffer.length !== computedBuffer.length) {
      return {
        verified: false,
        error: 'Invalid signature format'
      };
    }

    const verified = crypto.timingSafeEqual(signatureBuffer, computedBuffer);

    return {
      verified,
      error: verified ? undefined : 'Invalid signature',
      payload: verified ? JSON.parse(payload.toString()) : undefined
    };
  } catch (err: any) {
    return {
      verified: false,
      error: `Signature verification failed: ${err.message}`
    };
  }
}

/**
 * Validates webhook payload structure and required fields
 * @param payload - Parsed webhook payload
 * @param requiredFields - Array of required field paths (supports dot notation)
 * @returns Validation result
 */
export function validateWebhookPayload(
  payload: any,
  requiredFields: string[]
): { valid: boolean; missingFields?: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = getNestedProperty(payload, field);
    if (value === undefined || value === null) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}

/**
 * Helper to get nested object property using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Rate limiting for webhook endpoints
 * Prevents webhook flooding attacks
 */
export class WebhookRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 100) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Checks if a webhook should be rate limited
   * @param identifier - Unique identifier (e.g., IP address, webhook ID)
   * @returns True if the webhook should be processed, false if rate limited
   */
  public checkLimit(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);

    if (validAttempts.length >= this.maxAttempts) {
      return false; // Rate limited
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(time => now - time < this.windowMs);
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, validAttempts);
      }
    }
  }
}

// Export singleton rate limiter instance
export const webhookRateLimiter = new WebhookRateLimiter();

/**
 * Webhook replay attack prevention
 * Stores processed webhook IDs to prevent replay
 */
export class WebhookReplayPrevention {
  private processedWebhooks: Set<string> = new Set();
  private readonly maxSize: number = 10000;
  private readonly ttlMs: number = 3600000; // 1 hour
  private webhookTimestamps: Map<string, number> = new Map();

  /**
   * Checks if a webhook has already been processed
   * @param webhookId - Unique webhook identifier
   * @returns True if webhook is new, false if it's a replay
   */
  public checkWebhook(webhookId: string): boolean {
    // Cleanup old entries
    this.cleanup();

    if (this.processedWebhooks.has(webhookId)) {
      return false; // Replay detected
    }

    // Add to processed set
    this.processedWebhooks.add(webhookId);
    this.webhookTimestamps.set(webhookId, Date.now());

    // Prevent set from growing too large
    if (this.processedWebhooks.size > this.maxSize) {
      const oldestId = this.getOldestWebhook();
      if (oldestId) {
        this.processedWebhooks.delete(oldestId);
        this.webhookTimestamps.delete(oldestId);
      }
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, timestamp] of this.webhookTimestamps.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.processedWebhooks.delete(id);
        this.webhookTimestamps.delete(id);
      }
    }
  }

  private getOldestWebhook(): string | null {
    let oldestId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, timestamp] of this.webhookTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestId = id;
      }
    }

    return oldestId;
  }
}

// Export singleton instance
export const webhookReplayPrevention = new WebhookReplayPrevention();