import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'
import { generateLeadInsights } from '@/lib/ai/lead-qualification'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    // Get leads from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('organization_id', user.organization_id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      throw new Error('Failed to fetch leads for insights')
    }

    // Generate AI insights
    const insights = await generateLeadInsights(leads || [])

    // Get additional metrics
    const totalLeads = leads?.length || 0
    const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0
    const highScoreLeads = leads?.filter(l => l.lead_score >= 70).length || 0
    const recentLeads = leads?.filter(l => {
      const daysSince = Math.floor((Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24))
      return daysSince <= 7
    }).length || 0

    // Calculate source performance
    const sourcePerformance = leads?.reduce((acc, lead) => {
      if (!acc[lead.source]) {
        acc[lead.source] = { total: 0, converted: 0, avg_score: 0, total_score: 0 }
      }
      acc[lead.source].total++
      acc[lead.source].total_score += lead.lead_score
      if (lead.status === 'converted') {
        acc[lead.source].converted++
      }
      return acc
    }, {} as Record<string, any>) || {}

    // Calculate average scores and conversion rates
    Object.keys(sourcePerformance).forEach(source => {
      const data = sourcePerformance[source]
      data.avg_score = Math.round(data.total_score / data.total)
      data.conversion_rate = Math.round((data.converted / data.total) * 100)
      delete data.total_score
    })

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'ai',
      event_name: 'insights_generated',
      properties: {
        total_leads_analyzed: totalLeads,
        insights_count: insights.trends.length + insights.recommendations.length + insights.optimization_tips.length,
        analyzed_by: user.id
      },
      user_id: user.id
    })

    return {
      insights,
      metrics: {
        total_leads: totalLeads,
        converted_leads: convertedLeads,
        conversion_rate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
        high_score_leads: highScoreLeads,
        recent_leads: recentLeads,
        avg_lead_score: totalLeads > 0 ? Math.round(leads.reduce((sum, l) => sum + l.lead_score, 0) / totalLeads) : 0
      },
      source_performance: sourcePerformance,
      period: '30_days'
    }
  })
}