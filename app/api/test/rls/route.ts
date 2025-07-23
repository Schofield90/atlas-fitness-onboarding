import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/app/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    
    // Test 1: Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      return NextResponse.json({
        error: 'Failed to get user data',
        details: userError.message
      }, { status: 500 })
    }
    
    const organizationId = userData?.organization_id
    
    // Test 2: Try to fetch leads (should only return organization's leads)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .limit(10)
    
    // Test 3: Try to fetch a lead from another organization (should fail)
    const { data: unauthorizedLead, error: unauthorizedError } = await supabase
      .from('leads')
      .select('*')
      .neq('organization_id', organizationId)
      .limit(1)
    
    // Test 4: Try to fetch Facebook pages (should only return organization's pages)
    const { data: pages, error: pagesError } = await supabase
      .from('facebook_pages')
      .select('*')
    
    return NextResponse.json({
      success: true,
      tests: {
        user: {
          id: user.id,
          email: user.email,
          organizationId: organizationId,
          organizationName: userData?.organizations?.name
        },
        rlsTests: {
          leadsTest: {
            description: 'Should only see organization leads',
            leadCount: leads?.length || 0,
            allBelongToOrg: leads?.every(l => l.organization_id === organizationId) || false,
            error: leadsError?.message
          },
          unauthorizedTest: {
            description: 'Should not see other organization leads',
            foundUnauthorized: unauthorizedLead?.length || 0,
            error: unauthorizedError?.message
          },
          pagesTest: {
            description: 'Should only see organization pages',
            pageCount: pages?.length || 0,
            allBelongToOrg: pages?.every(p => p.organization_id === organizationId) || false,
            error: pagesError?.message
          }
        }
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Authentication required',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 401 })
  }
}