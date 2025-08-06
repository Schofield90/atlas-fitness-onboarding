import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { getOpenAIClient } from '@/gym-coach-platform/lib/ai/openai-client'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    
    const { leadId, conversations, forceRefresh = false } = body
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Get recent conversations if not provided
    let conversationData = conversations
    if (!conversationData) {
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .eq('lead_id', leadId)
        .eq('organization_id', userWithOrg.organizationId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      conversationData = interactions || []
    }
    
    // Check if we have recent AI analysis (less than 24 hours old) and not forcing refresh
    if (!forceRefresh) {
      const { data: existingInsight } = await supabase
        .from('lead_ai_insights')
        .select('*')
        .eq('lead_id', leadId)
        .eq('insight_type', 'buying_signals')
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (existingInsight) {
        return NextResponse.json({
          success: true,
          leadId,
          analysis: existingInsight.insight_data,
          cached: true,
          analysisDate: existingInsight.created_at
        })
      }
    }
    
    // Perform AI analysis using OpenAI
    const aiAnalysis = await analyzeLeadWithAI(lead, conversationData)
    
    // Save AI insights to database
    const insights = [
      {
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        insight_type: 'buying_signals',
        confidence_score: aiAnalysis.buyingSignals.confidence,
        insight_data: aiAnalysis.buyingSignals
      },
      {
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        insight_type: 'sentiment_analysis',
        confidence_score: aiAnalysis.sentiment.confidence,
        insight_data: aiAnalysis.sentiment
      },
      {
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        insight_type: 'conversion_likelihood',
        confidence_score: aiAnalysis.conversionLikelihood.confidence,
        insight_data: aiAnalysis.conversionLikelihood
      }
    ]
    
    // Insert AI insights
    const { error: insightError } = await supabase
      .from('lead_ai_insights')
      .insert(insights)
    
    if (insightError) {
      console.error('Error saving AI insights:', insightError)
    }
    
    // Calculate and update AI analysis score
    const aiScore = calculateAIScore(aiAnalysis)
    
    // Update lead scoring factors with AI analysis
    const { error: scoringError } = await supabase
      .from('lead_scoring_factors')
      .upsert({
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        ai_analysis_score: aiScore,
        scoring_metadata: {
          ai_analysis: aiAnalysis,
          last_ai_update: new Date().toISOString()
        }
      }, {
        onConflict: 'organization_id,lead_id'
      })
    
    if (scoringError) {
      console.error('Error updating scoring factors:', scoringError)
    }
    
    // Trigger lead score recalculation
    await supabase.rpc('update_lead_score_with_history', {
      lead_id: leadId,
      triggered_by: 'ai_analysis',
      change_reason: 'AI analysis completed'
    })
    
    return NextResponse.json({
      success: true,
      leadId,
      analysis: aiAnalysis,
      aiScore,
      cached: false
    })
    
  } catch (error) {
    console.error('Error in AI lead scoring:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const insightType = searchParams.get('type')
    
    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    // Build query for AI insights
    let query = supabase
      .from('lead_ai_insights')
      .select('*')
      .eq('lead_id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .order('created_at', { ascending: false })
    
    if (insightType) {
      query = query.eq('insight_type', insightType)
    }
    
    const { data: insights, error } = await query
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }
    
    // Get lead scoring factors
    const { data: scoringFactors } = await supabase
      .from('lead_scoring_factors')
      .select('*')
      .eq('lead_id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    // Get scoring breakdown
    const { data: breakdown } = await supabase
      .rpc('get_lead_scoring_breakdown', { lead_id: leadId })
    
    return NextResponse.json({
      success: true,
      leadId,
      insights: insights || [],
      scoringFactors: scoringFactors || null,
      breakdown: breakdown || []
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

async function analyzeLeadWithAI(lead: any, conversations: any[]) {
  const openai = getOpenAIClient()
  
  // Prepare conversation context
  const conversationContext = conversations
    .map(conv => `${conv.direction === 'inbound' ? 'Lead' : 'Staff'}: ${conv.content}`)
    .join('\n')
  
  const leadContext = `
Lead Information:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source}
- Current Status: ${lead.status}
- Created: ${new Date(lead.created_at).toLocaleDateString()}

Recent Conversations:
${conversationContext || 'No conversations yet'}

Additional Data:
${JSON.stringify(lead.metadata || {}, null, 2)}
  `
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales AI analyzing leads for a fitness business. Analyze the lead's information and conversations to provide insights about their buying intent, sentiment, and conversion likelihood. 

Return your analysis as a JSON object with the following structure:
{
  "buyingSignals": {
    "signals": ["specific signals found"],
    "strength": "low|medium|high",
    "confidence": 0.0-1.0,
    "explanation": "detailed explanation"
  },
  "sentiment": {
    "overall": "positive|neutral|negative",
    "confidence": 0.0-1.0,
    "indicators": ["specific sentiment indicators"]
  },
  "conversionLikelihood": {
    "percentage": 0-100,
    "confidence": 0.0-1.0,
    "reasoning": "detailed reasoning",
    "timeline": "immediate|short_term|long_term|unlikely"
  },
  "recommendations": [
    "specific action recommendations"
  ],
  "interests": ["identified interests"],
  "objections": ["potential objections or concerns"],
  "bestContactTime": "morning|afternoon|evening|any",
  "communicationStyle": "formal|casual|direct|relationship_focused"
}`
        },
        {
          role: 'user',
          content: leadContext
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })
    
    const analysis = JSON.parse(completion.choices[0].message.content || '{}')
    return analysis
    
  } catch (error) {
    console.error('Error in AI analysis:', error)
    
    // Return fallback analysis
    return {
      buyingSignals: {
        signals: [],
        strength: 'low',
        confidence: 0.1,
        explanation: 'AI analysis failed, using fallback scoring'
      },
      sentiment: {
        overall: 'neutral',
        confidence: 0.1,
        indicators: []
      },
      conversionLikelihood: {
        percentage: 25,
        confidence: 0.1,
        reasoning: 'No AI analysis available',
        timeline: 'unknown'
      },
      recommendations: ['Contact the lead to gather more information'],
      interests: [],
      objections: [],
      bestContactTime: 'any',
      communicationStyle: 'professional'
    }
  }
}

function calculateAIScore(analysis: any): number {
  let score = 0
  
  // Buying signals contribution (0-8 points)
  switch (analysis.buyingSignals.strength) {
    case 'high': 
      score += 8
      break
    case 'medium': 
      score += 5
      break
    case 'low': 
      score += 2
      break
  }
  
  // Sentiment contribution (0-6 points)
  switch (analysis.sentiment.overall) {
    case 'positive': 
      score += 6
      break
    case 'neutral': 
      score += 3
      break
    case 'negative': 
      score += 0
      break
  }
  
  // Conversion likelihood contribution (0-6 points)
  const conversionScore = Math.round((analysis.conversionLikelihood.percentage / 100) * 6)
  score += conversionScore
  
  // Confidence modifier
  const avgConfidence = (
    analysis.buyingSignals.confidence + 
    analysis.sentiment.confidence + 
    analysis.conversionLikelihood.confidence
  ) / 3
  
  score = Math.round(score * avgConfidence)
  
  return Math.min(20, Math.max(0, score))
}