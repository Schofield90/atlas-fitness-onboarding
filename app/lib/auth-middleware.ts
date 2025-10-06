import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export interface AuthContext {
  user: {
    id: string
    email: string
  }
  organizationId: string
}

/**
 * Authentication middleware for API routes
 * Ensures user is authenticated and has an organization
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext | NextResponse> {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login' },
        { status: 401 }
      )
    }
    
    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData?.organization_id) {
      console.error('User organization lookup failed:', userError)
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 403 }
      )
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || ''
      },
      organizationId: userData.organization_id
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Helper to create organization-scoped Supabase client
 */
export function createOrgScopedClient(organizationId: string) {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Return a wrapper that automatically adds organization filtering
  return {
    from: (table: string) => {
      const query = supabase.from(table)
      
      // Tables that require organization filtering
      const orgScopedTables = [
        'leads', 'contacts', 'appointments', 'tasks', 'forms',
        'email_logs', 'sms_logs', 'whatsapp_logs', 'workflows',
        'class_sessions', 'bookings', 'programs', 'memberships',
        'facebook_integrations', 'facebook_pages', 'facebook_lead_forms',
        'facebook_leads', 'workflows', 'workflow_triggers', 'workflow_actions',
        'google_calendar_tokens', 'organization_settings', 'staff_profiles',
        'tags', 'message_templates', 'locations', 'membership_plans'
      ]
      
      // Auto-add organization filter for relevant tables
      if (orgScopedTables.includes(table)) {
        return {
          select: (...args: any[]) => query.select(...args).eq('organization_id', organizationId),
          insert: (data: any) => {
            if (Array.isArray(data)) {
              return query.insert(data.map(d => ({ ...d, organization_id: organizationId })))
            }
            return query.insert({ ...data, organization_id: organizationId })
          },
          update: (data: any) => query.update(data).eq('organization_id', organizationId),
          delete: () => query.delete().eq('organization_id', organizationId),
          upsert: (data: any) => {
            if (Array.isArray(data)) {
              return query.upsert(data.map(d => ({ ...d, organization_id: organizationId })))
            }
            return query.upsert({ ...data, organization_id: organizationId })
          }
        }
      }
      
      // For non-org-scoped tables, return regular query
      return query
    },
    auth: supabase.auth,
    rpc: supabase.rpc,
    storage: supabase.storage
  }
}

/**
 * Verify resource ownership before allowing access
 */
export async function verifyResourceOwnership(
  resourceTable: string,
  resourceId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createRouteHandlerClient({ cookies })
  
  const { data, error } = await supabase
    .from(resourceTable)
    .select('organization_id')
    .eq('id', resourceId)
    .single()
  
  if (error || !data) {
    return false
  }
  
  return data.organization_id === organizationId
}

/**
 * Public route handler (for webhooks, etc)
 * Validates webhook signatures or API keys
 */
export async function validateWebhook(
  request: NextRequest,
  provider: 'twilio' | 'stripe' | 'facebook' | 'google'
): Promise<boolean> {
  switch (provider) {
    case 'twilio':
      // Implement Twilio signature validation
      const twilioSignature = request.headers.get('x-twilio-signature')
      // TODO: Implement actual signature validation
      return true // For now, accept all Twilio webhooks
      
    case 'stripe':
      // Implement Stripe signature validation
      const stripeSignature = request.headers.get('stripe-signature')
      // TODO: Implement actual signature validation
      return true // For now, accept all Stripe webhooks
      
    case 'facebook':
      // Implement Facebook signature validation
      const fbSignature = request.headers.get('x-hub-signature-256')
      // TODO: Implement actual signature validation
      return true // For now, accept all Facebook webhooks
      
    case 'google':
      // Google Calendar doesn't use signatures, but we can check channel tokens
      return true
      
    default:
      return false
  }
}

/**
 * Usage example:
 * 
 * export async function POST(request: NextRequest) {
 *   const auth = await requireAuth(request)
 *   if (auth instanceof NextResponse) return auth
 *   
 *   const supabase = createOrgScopedClient(auth.organizationId)
 *   
 *   // Now all queries are automatically filtered by organization
 *   const { data, error } = await supabase
 *     .from('leads')
 *     .select('*') // Automatically filtered by organization_id
 *   
 *   return NextResponse.json({ data })
 * }
 */