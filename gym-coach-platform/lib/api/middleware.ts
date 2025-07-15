import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create service role client for server-side operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header', status: 401 }
    }

    const token = authHeader.split(' ')[1]
    
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

  return Response.json(response, { status })
}

export async function handleApiRoute<T>(
  request: NextRequest,
  handler: (request: AuthenticatedRequest) => Promise<T>,
  options: { requireAuth?: boolean; allowedRoles?: string[] } = {}
) {
  try {
    const { requireAuth = true, allowedRoles = [] } = options

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
    
    if (error instanceof Error) {
      return createApiResponse(null, error.message, 500)
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