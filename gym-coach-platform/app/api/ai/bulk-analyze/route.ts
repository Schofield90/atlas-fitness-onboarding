import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'
import { qualifyLead } from '@/lib/ai/lead-qualification'

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { lead_ids, force_reanalyze = false } = body

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      throw new Error('lead_ids array is required')
    }

    if (lead_ids.length > 50) {
      throw new Error('Maximum 50 leads can be analyzed at once')
    }

    // Get leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('organization_id', user.organization_id)
      .in('id', lead_ids)

    if (leadsError) {
      throw new Error('Failed to fetch leads')
    }

    // Get organization context
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', user.organization_id)
      .single()

    const results = []
    const errors = []

    for (const lead of leads) {
      try {
        // Skip if already analyzed and not forcing reanalysis
        if (!force_reanalyze && lead.ai_analysis && lead.ai_analysis.score > 0) {
          results.push({
            lead_id: lead.id,
            status: 'skipped',
            reason: 'Already analyzed'
          })
          continue
        }

        // Get lead interactions
        const { data: interactions } = await supabaseAdmin
          .from('interactions')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })

        // Perform AI analysis
        const analysis = await qualifyLead({
          lead,
          interactions: interactions || [],
          organizationContext: organization?.settings?.business_profile || {}
        })

        // Update lead with AI analysis
        const { error: updateError } = await supabaseAdmin
          .from('leads')
          .update({
            ai_analysis: analysis,
            lead_score: analysis.score,
            status: analysis.qualification === 'high' ? 'hot' : 
                   analysis.qualification === 'medium' ? 'warm' : 'cold'
          })
          .eq('id', lead.id)

        if (updateError) {
          errors.push({
            lead_id: lead.id,
            error: 'Failed to update lead'
          })
          continue
        }

        results.push({
          lead_id: lead.id,
          status: 'analyzed',
          score: analysis.score,
          qualification: analysis.qualification,
          confidence: analysis.confidence
        })

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error analyzing lead ${lead.id}:`, error)
        errors.push({
          lead_id: lead.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'ai',
      event_name: 'bulk_analysis_completed',
      properties: {
        total_leads: lead_ids.length,
        successful: results.filter(r => r.status === 'analyzed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: errors.length,
        force_reanalyze,
        analyzed_by: user.id
      },
      user_id: user.id
    })

    return {
      summary: {
        total: lead_ids.length,
        analyzed: results.filter(r => r.status === 'analyzed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        errors: errors.length
      },
      results,
      errors
    }
  })
}