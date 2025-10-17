/**
 * Canonical Facebook OAuth Configuration
 * Ensures redirect URIs are byte-for-byte identical between authorize and token exchange
 */

export function getFacebookRedirectUri(): string {
  // Use environment variables with fallback
  const baseUrl = process.env.FACEBOOK_REDIRECT_BASE || 
                  process.env.NEXT_PUBLIC_SITE_URL || 
                  'https://atlas-fitness-onboarding.vercel.app'
  
  const callbackPath = process.env.FACEBOOK_CALLBACK_PATH || 
                       '/api/auth/facebook/callback'
  
  // Ensure no trailing slash on base and leading slash on path
  const cleanBase = baseUrl.replace(/\/$/, '')
  const cleanPath = callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`
  
  // Return canonical redirect URI
  return `${cleanBase}${cleanPath}`
}

export function getFacebookAppId(): string {
  return process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
}

export function getFacebookAppSecret(): string {
  const secret = process.env.FACEBOOK_APP_SECRET
  if (!secret) {
    throw new Error('FACEBOOK_APP_SECRET environment variable is required')
  }
  return secret
}

export function validateFacebookConfig(): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!process.env.FACEBOOK_APP_SECRET) {
    errors.push('Missing FACEBOOK_APP_SECRET environment variable')
  }
  
  if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
    errors.push('Missing NEXT_PUBLIC_FACEBOOK_APP_ID environment variable')
  }
  
  const redirectUri = getFacebookRedirectUri()
  if (!redirectUri.startsWith('https://') && process.env.NODE_ENV === 'production') {
    errors.push('Redirect URI must use HTTPS in production')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}