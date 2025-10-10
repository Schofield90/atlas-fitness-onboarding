import openai from './openai-client'
import { Lead, AIAnalysis } from '@/types/database'

export interface LeadQualificationData {
  lead: Lead
  interactions?: any[]
  organizationContext?: {
    business_type: string
    target_audience: string
    pricing_model: string
    location: string
  }
}

export async function qualifyLead(data: LeadQualificationData): Promise<AIAnalysis> {
  const { lead, interactions = [], organizationContext } = data

  const prompt = `
You are an AI assistant specialized in lead qualification for fitness and gym businesses. 
Analyze the following lead data and provide a comprehensive qualification assessment.

LEAD INFORMATION:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Source: ${lead.source}
- Current Status: ${lead.status}
- Current Score: ${lead.lead_score}
- Qualification Notes: ${lead.qualification_notes || 'None'}
- Created: ${new Date(lead.created_at).toLocaleDateString()}

INTERACTION HISTORY:
${interactions.length > 0 ? interactions.map(i => `- ${i.type}: ${i.content} (${new Date(i.created_at).toLocaleDateString()})`).join('\n') : 'No interactions yet'}

BUSINESS CONTEXT:
${organizationContext ? `
- Business Type: ${organizationContext.business_type}
- Target Audience: ${organizationContext.target_audience}
- Pricing Model: ${organizationContext.pricing_model}
- Location: ${organizationContext.location}
` : 'Standard gym/fitness business'}

ANALYSIS REQUIREMENTS:
1. Calculate a lead score (0-100) based on:
   - Lead source quality and conversion potential
   - Engagement level and interaction history
   - Demographic fit with target audience
   - Urgency indicators and buying signals
   - Contact information completeness

2. Determine qualification level:
   - "high": Strong buying signals, good fit, likely to convert
   - "medium": Some interest, needs nurturing
   - "low": Poor fit or minimal engagement

3. Provide actionable insights including:
   - Key strengths and weaknesses
   - Conversion probability factors
   - Recommended next steps
   - Potential objections or concerns

4. Suggest the next best action from:
   - "call_immediately": High-value lead needing immediate contact
   - "schedule_consultation": Warm lead ready for appointment
   - "send_information": Needs more nurturing content
   - "follow_up_later": Not ready, follow up in X days
   - "qualify_further": Need more information

5. Provide confidence level (0-100) in your assessment.

Respond in JSON format with the following structure:
{
  "score": number,
  "qualification": "high" | "medium" | "low",
  "insights": ["insight1", "insight2", ...],
  "recommended_actions": ["action1", "action2", ...],
  "next_best_action": "action_type",
  "confidence": number,
  "reasoning": "Brief explanation of scoring rationale",
  "conversion_probability": number,
  "estimated_value": number,
  "urgency": "high" | "medium" | "low",
  "objections": ["potential_objection1", ...],
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "recommended_timeline": "timeframe_for_next_action"
}

Be specific, actionable, and focus on practical sales and conversion strategies for gym/fitness businesses.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert lead qualification AI for fitness and gym businesses. Provide accurate, actionable insights based on lead data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })

    const analysis = JSON.parse(response.choices[0].message.content || '{}')
    
    return {
      score: Math.min(100, Math.max(0, analysis.score || 0)),
      qualification: analysis.qualification || 'medium',
      insights: analysis.insights || [],
      recommended_actions: analysis.recommended_actions || [],
      next_best_action: analysis.next_best_action || 'follow_up_later',
      confidence: Math.min(100, Math.max(0, analysis.confidence || 70)),
      reasoning: analysis.reasoning || 'Analysis completed with available data',
      conversion_probability: Math.min(100, Math.max(0, analysis.conversion_probability || 0)),
      estimated_value: Math.max(0, analysis.estimated_value || 0),
      urgency: analysis.urgency || 'medium',
      objections: analysis.objections || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommended_timeline: analysis.recommended_timeline || '1-2 days'
    } as any
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Fallback scoring based on available data
    const fallbackScore = calculateFallbackScore(lead, interactions)
    
    return {
      score: fallbackScore,
      qualification: fallbackScore >= 70 ? 'high' : fallbackScore >= 40 ? 'medium' : 'low',
      insights: ['AI analysis temporarily unavailable - using fallback scoring'],
      recommended_actions: ['Review lead manually', 'Contact within 24 hours'],
      next_best_action: 'follow_up_later',
      confidence: 60,
      reasoning: 'Fallback scoring used due to AI service unavailability',
      conversion_probability: fallbackScore * 0.8,
      estimated_value: 150,
      urgency: 'medium',
      objections: [],
      strengths: [],
      weaknesses: [],
      recommended_timeline: '1-2 days'
    } as any
  }
}

function calculateFallbackScore(lead: Lead, interactions: any[]): number {
  let score = 0
  
  // Source scoring
  const sourceScores: Record<string, number> = {
    'referral': 30,
    'website': 25,
    'google': 20,
    'facebook': 15,
    'instagram': 15,
    'walk-in': 25,
    'other': 10
  }
  score += sourceScores[lead.source] || 10
  
  // Contact information completeness
  if (lead.email) score += 20
  if (lead.phone) score += 15
  
  // Interaction engagement
  score += Math.min(25, interactions.length * 5)
  
  // Recency
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceCreated <= 1) score += 10
  else if (daysSinceCreated <= 7) score += 5
  
  return Math.min(100, Math.max(0, score))
}

export async function generateLeadInsights(leads: Lead[]): Promise<{
  trends: string[]
  recommendations: string[]
  optimization_tips: string[]
}> {
  const prompt = `
Analyze the following gym/fitness business lead data and provide strategic insights:

LEAD SUMMARY:
- Total leads: ${leads.length}
- Sources: ${Object.entries(leads.reduce((acc, lead) => {
  acc[lead.source] = (acc[lead.source] || 0) + 1
  return acc
}, {} as Record<string, number>)).map(([source, count]) => `${source}: ${count}`).join(', ')}
- Status distribution: ${Object.entries(leads.reduce((acc, lead) => {
  acc[lead.status] = (acc[lead.status] || 0) + 1
  return acc
}, {} as Record<string, number>)).map(([status, count]) => `${status}: ${count}`).join(', ')}
- Average score: ${leads.reduce((sum, lead) => sum + lead.lead_score, 0) / leads.length}

Provide insights in JSON format:
{
  "trends": ["trend1", "trend2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "optimization_tips": ["tip1", "tip2", ...]
}

Focus on actionable insights for improving lead quality and conversion rates.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fitness business analytics expert. Provide strategic insights for lead optimization.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    console.error('OpenAI insights error:', error)
    return {
      trends: ['Lead data analysis temporarily unavailable'],
      recommendations: ['Review lead sources and conversion rates manually'],
      optimization_tips: ['Focus on high-performing lead sources']
    }
  }
}

export async function generatePersonalizedFollowUp(lead: Lead, analysis: AIAnalysis): Promise<{
  email_subject: string
  email_content: string
  sms_content: string
  call_script: string
}> {
  const prompt = `
Create personalized follow-up content for this fitness/gym lead:

LEAD: ${lead.name}
EMAIL: ${lead.email}
SOURCE: ${lead.source}
QUALIFICATION: ${analysis.qualification}
SCORE: ${analysis.score}
NEXT ACTION: ${analysis.next_best_action}
INSIGHTS: ${analysis.insights.join(', ')}

Generate follow-up content in JSON format:
{
  "email_subject": "personalized subject line",
  "email_content": "personalized email content",
  "sms_content": "short SMS message",
  "call_script": "phone call talking points"
}

Make it friendly, professional, and focused on fitness/gym membership benefits.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fitness business marketing expert. Create engaging, personalized follow-up content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    console.error('OpenAI follow-up error:', error)
    return {
      email_subject: `Hi ${lead.name}, let's get you started!`,
      email_content: `Hi ${lead.name},\n\nThanks for your interest in our gym! I'd love to help you achieve your fitness goals.\n\nBest regards,\nThe Team`,
      sms_content: `Hi ${lead.name}! Thanks for your interest. Can we schedule a quick chat about your fitness goals?`,
      call_script: `Hi ${lead.name}, I'm calling about your interest in our gym. I'd love to learn about your fitness goals and see how we can help.`
    }
  }
}