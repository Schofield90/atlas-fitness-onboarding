import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin } from '@/lib/api/middleware'
import { generatePersonalizedFollowUp } from '@/lib/ai/lead-qualification'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    // Get high-priority leads that need attention
    const { data: leads, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        interactions(
          id,
          type,
          created_at
        )
      `)
      .eq('organization_id', user.organization_id)
      .in('status', ['hot', 'warm'])
      .order('lead_score', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error('Failed to fetch leads for recommendations')
    }

    const recommendations = []

    for (const lead of leads || []) {
      // Determine recommendation type based on lead data
      const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
      const lastInteraction = lead.interactions?.[0]
      const daysSinceLastInteraction = lastInteraction 
        ? Math.floor((Date.now() - new Date(lastInteraction.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceCreated

      let priority = 'medium'
      let action = 'follow_up'
      let reason = 'Regular follow-up needed'

      if (lead.lead_score >= 80) {
        priority = 'high'
        action = 'call_immediately'
        reason = 'High-score lead with strong conversion potential'
      } else if (daysSinceLastInteraction >= 3 && lead.status === 'hot') {
        priority = 'high'
        action = 'urgent_follow_up'
        reason = 'Hot lead without recent contact'
      } else if (daysSinceCreated <= 1) {
        priority = 'high'
        action = 'welcome_contact'
        reason = 'New lead requires immediate attention'
      } else if (!lead.interactions || lead.interactions.length === 0) {
        priority = 'medium'
        action = 'initial_contact'
        reason = 'Lead has not been contacted yet'
      }

      recommendations.push({
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        lead_score: lead.lead_score,
        status: lead.status,
        priority,
        action,
        reason,
        days_since_created: daysSinceCreated,
        days_since_last_interaction: daysSinceLastInteraction,
        interaction_count: lead.interactions?.length || 0,
        created_at: lead.created_at
      })
    }

    // Sort by priority and score
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
      }
      return b.lead_score - a.lead_score
    })

    // Get leads that need re-qualification (old AI analysis)
    const { data: staleLeads } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, lead_score, ai_analysis, updated_at')
      .eq('organization_id', user.organization_id)
      .not('ai_analysis', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(5)

    const requalificationNeeded = staleLeads?.filter(lead => {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceUpdate >= 7 // Re-analyze if not updated in 7 days
    }) || []

    // Get today's action items
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const { data: todaysTasks } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        priority,
        lead_id,
        leads(name, email)
      `)
      .eq('organization_id', user.organization_id)
      .eq('status', 'pending')
      .gte('due_date', todayStart.toISOString())
      .order('priority', { ascending: false })
      .limit(5)

    return {
      priority_leads: recommendations.slice(0, 5),
      action_items: recommendations,
      requalification_needed: requalificationNeeded,
      todays_tasks: todaysTasks || [],
      summary: {
        total_recommendations: recommendations.length,
        high_priority: recommendations.filter(r => r.priority === 'high').length,
        leads_needing_requalification: requalificationNeeded.length,
        pending_tasks: todaysTasks?.length || 0
      }
    }
  })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { lead_id, action_type } = body

    if (!lead_id || !action_type) {
      throw new Error('lead_id and action_type are required')
    }

    // Get lead details
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .eq('organization_id', user.organization_id)
      .single()

    if (error || !lead) {
      throw new Error('Lead not found')
    }

    if (!lead.ai_analysis) {
      throw new Error('Lead has not been analyzed yet')
    }

    // Generate personalized follow-up content
    const followUpContent = await generatePersonalizedFollowUp(lead, lead.ai_analysis)

    // Create a task based on the action type
    const taskTitleMap: Record<string, string> = {
      call_immediately: `Call ${lead.name} - High Priority`,
      urgent_follow_up: `Urgent follow-up with ${lead.name}`,
      welcome_contact: `Welcome call for new lead ${lead.name}`,
      initial_contact: `Initial contact with ${lead.name}`,
      follow_up: `Follow up with ${lead.name}`
    }
    const taskTitle = taskTitleMap[action_type] || `Contact ${lead.name}`

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert({
        organization_id: user.organization_id,
        title: taskTitle,
        description: `AI Recommendation: ${lead.ai_analysis.next_best_action}\n\nSuggested approach: ${followUpContent.call_script}`,
        priority: action_type === 'call_immediately' || action_type === 'urgent_follow_up' ? 'high' : 'medium',
        status: 'pending',
        assigned_to: user.id,
        created_by: user.id,
        lead_id: lead_id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
        metadata: {
          ai_generated: true,
          action_type,
          follow_up_content: followUpContent
        }
      })
      .select()
      .single()

    if (taskError) {
      throw new Error('Failed to create task')
    }

    // Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'ai',
      event_name: 'recommendation_acted',
      properties: {
        lead_id,
        action_type,
        task_id: task.id,
        ai_score: lead.lead_score,
        acted_by: user.id
      },
      user_id: user.id,
      lead_id
    })

    return {
      task,
      follow_up_content: followUpContent,
      message: 'Task created successfully'
    }
  })
}