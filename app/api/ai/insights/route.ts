import { NextRequest, NextResponse } from 'next/server'
import { superAI } from '@/app/lib/ai/consciousness'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user's organization
    const { organizationId: userOrgId, error: authError } = await getCurrentUserOrganization()
    if (authError || !userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { organizationId } = await request.json()
    
    // Verify user has access to this organization
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get proactive insights from the AI
    const insights = await superAI.getProactiveInsights(organizationId)
    
    return NextResponse.json({ insights })
  } catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI insights' },
      { status: 500 }
    )
  }
}