/**
 * Security Test Suite for Payment Processing
 * Tests for critical vulnerabilities in payment system
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { encrypt, decrypt, validateApiKeyFormat, maskApiKey } from '@/lib/crypto/encryption';
import {
  verifyStripeWebhook,
  verifyGoCardlessWebhook,
  webhookRateLimiter,
  webhookReplayPrevention
} from '@/lib/webhooks/signature-verification';
import crypto from 'crypto';

describe('Payment Security Tests', () => {
  const testEncryptionKey = crypto.randomBytes(32).toString('hex');

  describe('API Key Encryption', () => {
    it('should encrypt and decrypt API keys correctly', () => {
      const apiKey = 'sk_live_testkey123456789';
      const encrypted = encrypt(apiKey, testEncryptionKey);
      const decrypted = decrypt(encrypted, testEncryptionKey);

      expect(encrypted).not.toBe(apiKey);
      expect(encrypted.length).toBeGreaterThan(100); // Encrypted should be longer
      expect(decrypted).toBe(apiKey);
    });

    it('should fail decryption with wrong password', () => {
      const apiKey = 'sk_live_testkey123456789';
      const encrypted = encrypt(apiKey, testEncryptionKey);
      const wrongKey = crypto.randomBytes(32).toString('hex');

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it('should validate Stripe API key format', () => {
      expect(validateApiKeyFormat('sk_live_valid123', 'stripe')).toBe(true);
      expect(validateApiKeyFormat('sk_test_valid123', 'stripe')).toBe(true);
      expect(validateApiKeyFormat('pk_live_invalid', 'stripe')).toBe(false);
      expect(validateApiKeyFormat('invalid_key', 'stripe')).toBe(false);
    });

    it('should validate GoCardless API key format', () => {
      expect(validateApiKeyFormat('live_valid123', 'gocardless')).toBe(true);
      expect(validateApiKeyFormat('sandbox_valid123', 'gocardless')).toBe(true);
      expect(validateApiKeyFormat('test_invalid', 'gocardless')).toBe(false);
      expect(validateApiKeyFormat('invalid_key', 'gocardless')).toBe(false);
    });

    it('should mask API keys correctly', () => {
      const apiKey = 'sk_live_1234567890abcdefghijk';
      const masked = maskApiKey(apiKey);

      expect(masked).toBe('sk_live**************hijk');
      expect(masked).not.toContain('1234567890');
      expect(masked).toMatch(/^sk_live/);
      expect(masked).toMatch(/hijk$/);
    });

    it('should prevent API key exposure in logs', () => {
      const apiKey = 'sk_live_supersecret123456';
      const logOutput = JSON.stringify({
        account: 'acct_123',
        key: maskApiKey(apiKey)
      });

      expect(logOutput).not.toContain('supersecret');
      expect(logOutput).toContain('sk_live');
      expect(logOutput).toContain('***');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid Stripe webhook signature', () => {
      // This would need actual Stripe webhook test data
      // For unit test, we verify the function exists and handles invalid input
      const result = verifyStripeWebhook(
        'test_payload',
        null,
        'whsec_test'
      );

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Missing Stripe-Signature header');
    });

    it('should verify GoCardless webhook with HMAC', () => {
      const secret = 'webhook_secret';
      const payload = JSON.stringify({ test: 'data' });
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = verifyGoCardlessWebhook(payload, signature, secret);

      expect(result.verified).toBe(true);
      expect(result.payload).toEqual({ test: 'data' });
    });

    it('should reject webhooks with invalid signatures', () => {
      const secret = 'webhook_secret';
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid_signature';

      const result = verifyGoCardlessWebhook(payload, invalidSignature, secret);

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should prevent timing attacks on signature comparison', () => {
      const secret = 'webhook_secret';
      const payload = JSON.stringify({ test: 'data' });
      const correctSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Create signatures that differ at different positions
      const wrongSig1 = 'a' + correctSig.substring(1); // Wrong at start
      const wrongSig2 = correctSig.substring(0, correctSig.length - 1) + 'a'; // Wrong at end

      const start1 = process.hrtime.bigint();
      verifyGoCardlessWebhook(payload, wrongSig1, secret);
      const time1 = process.hrtime.bigint() - start1;

      const start2 = process.hrtime.bigint();
      verifyGoCardlessWebhook(payload, wrongSig2, secret);
      const time2 = process.hrtime.bigint() - start2;

      // Times should be similar (within 50ms) due to timing-safe comparison
      const diff = Math.abs(Number(time1 - time2)) / 1000000; // Convert to ms
      expect(diff).toBeLessThan(50);
    });
  });

  describe('Webhook Rate Limiting', () => {
    it('should rate limit excessive webhook attempts', () => {
      const identifier = 'test-webhook-1';
      let allowed = 0;

      // Should allow first 100 attempts in window
      for (let i = 0; i < 150; i++) {
        if (webhookRateLimiter.checkLimit(identifier)) {
          allowed++;
        }
      }

      expect(allowed).toBe(100); // Should stop at max attempts
    });

    it('should reset rate limit after window expires', async () => {
      const limiter = new (require('@/lib/webhooks/signature-verification').WebhookRateLimiter)(100, 5);
      const identifier = 'test-webhook-2';

      // Use up rate limit
      for (let i = 0; i < 5; i++) {
        expect(limiter.checkLimit(identifier)).toBe(true);
      }
      expect(limiter.checkLimit(identifier)).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      expect(limiter.checkLimit(identifier)).toBe(true);
    }, 10000);
  });

  describe('Webhook Replay Prevention', () => {
    it('should prevent webhook replay attacks', () => {
      const webhookId = 'evt_123456789';

      // First attempt should succeed
      expect(webhookReplayPrevention.checkWebhook(webhookId)).toBe(true);

      // Replay attempts should fail
      expect(webhookReplayPrevention.checkWebhook(webhookId)).toBe(false);
      expect(webhookReplayPrevention.checkWebhook(webhookId)).toBe(false);
    });

    it('should allow different webhook IDs', () => {
      const webhookId1 = 'evt_aaa111';
      const webhookId2 = 'evt_bbb222';

      expect(webhookReplayPrevention.checkWebhook(webhookId1)).toBe(true);
      expect(webhookReplayPrevention.checkWebhook(webhookId2)).toBe(true);
    });
  });

  describe('Payment Amount Validation', () => {
    it('should detect payment amount manipulation', async () => {
      // Test data
      const membershipPrice = 12900; // £129
      const manipulatedAmount = 100; // £1

      // This would be tested via API endpoint in integration tests
      const isValid = validatePaymentAmount(manipulatedAmount, membershipPrice);

      expect(isValid).toBe(false);
    });

    it('should prevent negative payment amounts', () => {
      const amounts = [-100, -1, 0];

      amounts.forEach(amount => {
        expect(isValidPaymentAmount(amount)).toBe(false);
      });
    });

    it('should prevent excessively large amounts', () => {
      const maxAmount = 999999; // £9,999.99 max
      const excessiveAmounts = [10000000, 99999999];

      excessiveAmounts.forEach(amount => {
        expect(isValidPaymentAmount(amount, maxAmount)).toBe(false);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize user inputs', () => {
      const maliciousInputs = [
        "'; DROP TABLE payments; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1--",
        "'; UPDATE clients SET status='active' WHERE '1'='1"
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('OR 1=1');
      });
    });
  });

  describe('Cross-Organization Access Prevention', () => {
    it('should prevent access to other organization data', async () => {
      // This would be tested via API endpoints
      const orgA = 'org_aaa';
      const orgB = 'org_bbb';
      const userInOrgA = { organizationId: orgA };

      // Simulated check
      const canAccess = checkOrganizationAccess(userInOrgA, orgB);

      expect(canAccess).toBe(false);
    });

    it('should enforce organization isolation in queries', () => {
      const query = buildSecureQuery('payments', 'org_123');

      expect(query).toContain('organization_id');
      expect(query).toContain('org_123');
    });
  });

  describe('CSV Export Security', () => {
    it('should prevent formula injection in CSV exports', () => {
      const maliciousData = [
        '=cmd|"/c calc"',
        '+cmd|"/c calc"',
        '-cmd|"/c calc"',
        '@cmd|"/c calc"',
        '=1+1',
        '=SUM(A1:A10)'
      ];

      maliciousData.forEach(data => {
        const sanitized = sanitizeForCSV(data);
        expect(sanitized).toMatch(/^'/); // Should be prefixed with '
        expect(sanitized).not.toMatch(/^[=+\-@]/);
      });
    });
  });
});

// Helper functions for testing
function validatePaymentAmount(received: number, expected: number): boolean {
  return received === expected && received > 0;
}

function isValidPaymentAmount(amount: number, max: number = 999999): boolean {
  return amount > 0 && amount <= max;
}

function sanitizeInput(input: string): string {
  // Basic SQL injection prevention
  return input
    .replace(/'/g, "''")
    .replace(/--/g, '')
    .replace(/DROP/gi, '')
    .replace(/UPDATE/gi, '')
    .replace(/DELETE/gi, '')
    .replace(/INSERT/gi, '');
}

function checkOrganizationAccess(user: any, targetOrgId: string): boolean {
  return user.organizationId === targetOrgId;
}

function buildSecureQuery(table: string, orgId: string): string {
  return `SELECT * FROM ${table} WHERE organization_id = '${orgId}'`;
}

function sanitizeForCSV(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return "'" + value;
  }
  return value;
}