/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32;

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @param password - The encryption password (should be from env var)
 * @returns Encrypted string in format: salt:iv:tag:encrypted
 */
export function encrypt(text: string, password: string): string {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  if (!password || password.length < 32) {
    throw new Error('Encryption password must be at least 32 characters');
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the text
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  // Get the authentication tag
  const tag = cipher.getAuthTag();

  // Combine salt, iv, tag, and encrypted data
  const combined = Buffer.concat([salt, iv, tag, encrypted]);

  // Return as base64 string
  return combined.toString('base64');
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedText - The encrypted string
 * @param password - The decryption password
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string, password: string): string {
  if (!encryptedText) {
    throw new Error('Encrypted text cannot be empty');
  }

  if (!password || password.length < 32) {
    throw new Error('Decryption password must be at least 32 characters');
  }

  // Decode from base64
  const combined = Buffer.from(encryptedText, 'base64');

  // Extract components
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key from password
  const key = deriveKey(password, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Generates a secure random encryption key
 * @returns A 64-character hex string suitable for use as an encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes sensitive data for comparison without storing plaintext
 * @param text - The text to hash
 * @param salt - Optional salt (will generate if not provided)
 * @returns Hash in format: salt:hash
 */
export function hashSensitiveData(text: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(text, actualSalt, 10000, 64, 'sha512')
    .toString('hex');

  return `${actualSalt}:${hash}`;
}

/**
 * Verifies a text against a hash
 * @param text - The plaintext to verify
 * @param hashWithSalt - The hash in format: salt:hash
 * @returns True if the text matches the hash
 */
export function verifySensitiveData(text: string, hashWithSalt: string): boolean {
  const [salt, originalHash] = hashWithSalt.split(':');
  const hash = crypto
    .pbkdf2Sync(text, salt, 10000, 64, 'sha512')
    .toString('hex');

  return hash === originalHash;
}

/**
 * Masks an API key for display purposes
 * @param apiKey - The API key to mask
 * @returns Masked key showing only first 7 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 20) {
    return '***INVALID***';
  }

  const prefix = apiKey.substring(0, 7);
  const suffix = apiKey.substring(apiKey.length - 4);
  const masked = '*'.repeat(Math.max(8, apiKey.length - 11));

  return `${prefix}${masked}${suffix}`;
}

/**
 * Validates API key format before encryption
 * @param apiKey - The API key to validate
 * @param provider - The payment provider (stripe or gocardless)
 * @returns True if the API key format is valid
 */
export function validateApiKeyFormat(apiKey: string, provider: 'stripe' | 'gocardless'): boolean {
  if (!apiKey) return false;

  if (provider === 'stripe') {
    // Stripe keys start with sk_live_ or sk_test_
    return /^sk_(live|test)_[A-Za-z0-9]+$/.test(apiKey);
  }

  if (provider === 'gocardless') {
    // GoCardless keys start with live_ or sandbox_
    return /^(live|sandbox)_[A-Za-z0-9_-]+$/.test(apiKey);
  }

  return false;
}