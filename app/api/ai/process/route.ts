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
    
    const { query, organizationId } = await request.json()
    
    // Verify user has access to this organization
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Process query through the AI brain
    const response = await superAI.process(query, organizationId)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('AI processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}