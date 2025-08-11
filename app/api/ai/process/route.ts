import { NextRequest, NextResponse } from 'next/server'
import { superAI } from '@/app/lib/ai/consciousness'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth()
    const organizationId = user.organizationId
    
    const { query } = await request.json()
    
    // Process query through the AI brain
    const response = await superAI.process(query, organizationId)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('AI processing error:', error)
    return createErrorResponse(error)
  }
}