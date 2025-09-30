import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get full user details with organization info
    const { data: userWithOrg, error } = await supabase
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
      console.error('[/api/auth/me] Error fetching user details:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Format the response to include organization_id at root level for compatibility
    const formattedResponse = {
      ...userWithOrg,
      organization_id: userWithOrg?.organization_id || userWithOrg?.organizations?.id || null
    }

    return NextResponse.json(
      formattedResponse,
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[/api/auth/me] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}