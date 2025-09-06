import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const IV_LENGTH = 16
const ITERATIONS = 100000

/**
 * Derives an encryption key from a password
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256')
}

/**
 * Encrypts sensitive data like access tokens
 */
export function encrypt(text: string): string {
  const password = process.env.ENCRYPTION_KEY || process.env.SUPABASE_JWT_SECRET
  if (!password) {
    throw new Error('Encryption key not configured')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Derive key from password
  const key = deriveKey(password, salt)
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt the text
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ])
  
  // Get the auth tag
  const tag = cipher.getAuthTag()
  
  // Combine salt, iv, tag, and encrypted content
  const combined = Buffer.concat([salt, iv, tag, encrypted])
  
  // Return base64 encoded
  return combined.toString('base64')
}

/**
 * Decrypts sensitive data
 */
export function decrypt(encryptedText: string): string {
  const password = process.env.ENCRYPTION_KEY || process.env.SUPABASE_JWT_SECRET
  if (!password) {
    throw new Error('Encryption key not configured')
  }

  // Decode from base64
  const combined = Buffer.from(encryptedText, 'base64')
  
  // Extract components
  const salt = combined.slice(0, SALT_LENGTH)
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  
  // Derive key from password
  const key = deriveKey(password, salt)
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])
  
  return decrypted.toString('utf8')
}

/**
 * Hash a value for comparison (e.g., webhook verification tokens)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Verify a webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    // Remove any prefix like 'sha256='
    const cleanSignature = signature.replace(/^sha256=/, '')
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}