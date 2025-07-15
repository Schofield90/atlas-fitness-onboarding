import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    // Get full user details with organization info
    const { data: userWithOrg, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        organizations (
          id,
          name,
          email,
          subscription_plan,
          subscription_status
        )
      `)
      .eq('id', user.id)
      .single()

    if (error) {
      throw new Error('Failed to fetch user details')
    }

    return userWithOrg
  })
}