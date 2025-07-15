import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'
import { qualifyLead } from '@/lib/ai/lead-qualification'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: leadId } = await params

    // Verify lead belongs to user's organization
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', user.organization_id)
      .single()

    if (leadError || !lead) {
      throw new Error('Lead not found')
    }

    // Get lead interactions
    const { data: interactions } = await supabaseAdmin
      .from('interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })

    // Get organization context
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', user.organization_id)
      .single()

    // Perform AI analysis
    const analysis = await qualifyLead({
      lead,
      interactions: interactions || [],
      organizationContext: organization?.settings?.business_profile || {}
    })

    // Update lead with AI analysis
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        ai_analysis: analysis,
        lead_score: analysis.score,
        status: analysis.qualification === 'high' ? 'hot' : 
               analysis.qualification === 'medium' ? 'warm' : 'cold'
      })
      .eq('id', leadId)
      .select('*')
      .single()

    if (updateError) {
      throw new Error('Failed to update lead with AI analysis')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'ai',
      event_name: 'lead_analyzed',
      properties: {
        lead_id: leadId,
        ai_score: analysis.score,
        ai_qualification: analysis.qualification,
        confidence: analysis.confidence,
        analyzed_by: user.id
      },
      user_id: user.id,
      lead_id: leadId
    })

    return {
      lead: updatedLead,
      analysis,
      interactions: interactions || []
    }
  })
}