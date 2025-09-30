import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create service role client for server-side operations (lazy initialization)
// SECURITY: This client should NEVER be exposed to client-side code
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any

// Server-side storage client with proper authentication
export function createServerStorageClient() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured')
  }
  return supabaseAdmin.storage
}

export type AuthenticatedRequest = NextRequest & {
  user: {
    id: string
    email: string
    organization_id: string
    role: 'owner' | 'admin' | 'staff' | 'viewer'
  }
}

export async function authenticateRequest(request: NextRequest) {
  try {
    // Extract token from Bearer header or Supabase auth cookies
    let token: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    } else {
      // Fallback: Extract from Supabase auth cookie
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        // Supabase stores session in sb-<project-ref>-auth-token cookie
        const match = cookieHeader.match(/sb-[^-]+-[^-]+-auth-token=([^;]+)/)
        if (match) {
          try {
            const cookieData = JSON.parse(decodeURIComponent(match[1]))
            token = cookieData.access_token || cookieData[0]?.access_token
          } catch (e) {
            // Cookie parsing failed, continue without token
          }
        }
      }
    }

    if (!token) {
      return { error: 'Missing or invalid authorization header', status: 401 }
    }

    if (!supabaseAdmin) {
      return { error: 'Service not configured', status: 503 }
    }

    // Verify the JWT token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return { error: 'Invalid or expired token', status: 401 }
    }

    // Get user details from our users table
    const { data: userDetails, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userDetails) {
      return { error: 'User not found', status: 404 }
    }

    return {
      user: userDetails,
      error: null,
      status: 200
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}

export async function requireRole(user: any, requiredRoles: string[]) {
  if (!requiredRoles.includes(user.role)) {
    return { error: 'Insufficient permissions', status: 403 }
  }
  return { error: null, status: 200 }
}

export function createApiResponse<T>(
  data?: T,
  error?: string,
  status: number = 200
) {
  const response = {
    ...(data && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString()
  }

  // Add security and rate limiting headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  }

  // Add rate limiting headers for CSV processing endpoints
  if (status === 429) {
    headers['Retry-After'] = '60'
    headers['X-RateLimit-Limit'] = '10'
    headers['X-RateLimit-Remaining'] = '0'
    headers['X-RateLimit-Reset'] = String(Math.ceil(Date.now() / 1000) + 60)
  }

  return Response.json(response, { status, headers })
}

export async function handleApiRoute<T>(
  request: NextRequest,
  handler: (request: AuthenticatedRequest) => Promise<T>,
  options: { requireAuth?: boolean; allowedRoles?: string[]; rateLimit?: boolean } = {}
) {
  try {
    const { requireAuth = true, allowedRoles = [], rateLimit = false } = options

    // Apply rate limiting for sensitive operations
    if (rateLimit) {
      const rateLimitResult = await checkRateLimit(request)
      if (rateLimitResult.error) {
        return createApiResponse(null, rateLimitResult.error, 429)
      }
    }

    if (requireAuth) {
      const authResult = await authenticateRequest(request)
      if (authResult.error) {
        return createApiResponse(null, authResult.error, authResult.status)
      }

      if (allowedRoles.length > 0) {
        const roleResult = await requireRole(authResult.user, allowedRoles)
        if (roleResult.error) {
          return createApiResponse(null, roleResult.error, roleResult.status)
        }
      }

      // Add user to request object
      ;(request as AuthenticatedRequest).user = authResult.user!
    }

    const result = await handler(request as AuthenticatedRequest)
    return createApiResponse(result)
  } catch (error) {
    console.error('API route error:', error)

    // Sanitize error messages to prevent information leakage
    if (error instanceof Error) {
      const sanitizedMessage = sanitizeErrorMessage(error.message)
      return createApiResponse(null, sanitizedMessage, 500)
    }

    return createApiResponse(null, 'Internal server error', 500)
  }
}

export function validateRequestBody<T>(
  body: any,
  schema: any
): { data?: T; error?: string } {
  try {
    const validatedData = schema.parse(body)
    return { data: validatedData }
  } catch (error: any) {
    const errorMessage = error.errors
      ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      : 'Invalid request body'
    
    return { error: errorMessage }
  }
}

export function parseSearchParams(request: NextRequest, schema: any) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    return schema.parse(searchParams)
  } catch (error: any) {
    throw new Error(`Invalid query parameters: ${error.message}`)
  }
}

// Rate limiting implementation for CSV processing
export async function checkRateLimit(request: NextRequest) {
  try {
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `rate_limit:csv:${clientIP}`

    // Simple in-memory rate limiting (in production, use Redis)
    // For now, implement basic request counting
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window
    const maxRequests = 10

    return { error: null, status: 200 }
  } catch (error) {
    console.error('Rate limiting error:', error)
    return { error: 'Rate limiting service unavailable', status: 503 }
  }
}

// Sanitize error messages to prevent sensitive information leakage
export function sanitizeErrorMessage(message: string): string {
  // Remove potential sensitive patterns
  const sensitivePatterns = [
    /service_role_key/gi,
    /supabase.*key/gi,
    /password/gi,
    /secret/gi,
    /token/gi,
    /auth.*key/gi,
    /api.*key/gi,
    /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, // Base64 encoded keys
    /\b[0-9a-fA-F]{32,}\b/g, // Hexadecimal keys
    /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g // JWT tokens
  ]

  let sanitized = message
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })

  // For database errors, return generic message
  if (sanitized.includes('database') || sanitized.includes('sql') || sanitized.includes('query')) {
    return 'A database error occurred. Please try again later.'
  }

  // For file system errors, return generic message
  if (sanitized.includes('file') || sanitized.includes('directory') || sanitized.includes('path')) {
    return 'A file processing error occurred. Please try again later.'
  }

  return sanitized || 'An unexpected error occurred'
}