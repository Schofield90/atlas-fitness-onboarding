import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { enhancedLeadProcessor } from '@/app/lib/ai/enhanced-lead-processor'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const body = await request.json()
    
    const { 
      leadId, 
      forceRefresh = false, 
      useClaudeForAnalysis = true,
      includeHistoricalData = true,
      realTimeProcessing = false
    } = body
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    console.log('Processing lead with enhanced AI:', {
      leadId,
      organizationId: userWithOrg.organizationId,
      options: { forceRefresh, useClaudeForAnalysis, includeHistoricalData, realTimeProcessing }
    })

    const startTime = Date.now()

    // Process the lead with enhanced AI
    const analysis = await enhancedLeadProcessor.processLead(leadId, {
      forceRefresh,
      useClaudeForAnalysis,
      includeHistoricalData,
      realTimeProcessing
    })

    const processingTime = Date.now() - startTime

    console.log('Enhanced lead processing completed:', {
      leadId,
      processingTimeMs: processingTime,
      conversionLikelihood: analysis.conversionLikelihood.percentage,
      sentiment: analysis.sentiment.overall,
      urgency: analysis.conversionLikelihood.urgencyLevel
    })

    // Return comprehensive analysis
    return NextResponse.json({
      success: true,
      leadId,
      analysis,
      processingTime,
      aiModelsUsed: useClaudeForAnalysis ? ['claude-3-sonnet', 'gpt-4'] : ['gpt-4'],
      cached: !forceRefresh && processingTime < 1000, // Assume cached if very fast
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in enhanced lead processing:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    // Get existing analysis without reprocessing
    const analysis = await enhancedLeadProcessor.processLead(leadId, {
      forceRefresh: false,
      realTimeProcessing: false
    })

    return NextResponse.json({
      success: true,
      leadId,
      analysis,
      fromCache: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting lead analysis:', error)
    return createErrorResponse(error)
  }
}