import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import crypto from 'crypto'

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs'

/**
 * GoHighLevel Webhook Receiver
 *
 * Receives new lead notifications from GoHighLevel CRM and:
 * 1. Validates webhook signature
 * 2. Creates lead in Atlas Fitness database
 * 3. Finds or creates AI agent for the organization
 * 4. Initiates AI conversation for lead qualification
 *
 * Webhook URL: https://your-domain.com/api/webhooks/gohighlevel
 *
 * GoHighLevel sends webhooks with this structure:
 * {
 *   "type": "Opportunity",
 *   "contact": {
 *     "id": "...",
 *     "firstName": "...",
 *     "lastName": "...",
 *     "email": "...",
 *     "phone": "...",
 *     "source": "..."
 *   },
 *   "opportunity": {
 *     "name": "...",
 *     "monetaryValue": 0,
 *     "pipelineStageId": "..."
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Get raw body for signature verification
    const body = await request.text()
    const payload = body ? JSON.parse(body) : {}

    console.log('[GoHighLevel Webhook] Received:', {
      type: payload.type,
      contact: payload.contact?.email,
      timestamp: new Date().toISOString()
    })

    // 2. Verify webhook signature (HMAC-SHA256)
    const webhookSecret = process.env.GOHIGHLEVEL_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('x-ghl-signature')
      if (!signature) {
        console.error('[GoHighLevel Webhook] Missing signature header')
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        )
      }

      // Verify HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('[GoHighLevel Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else {
      console.warn('[GoHighLevel Webhook] No webhook secret configured - skipping signature verification')
    }

    // 3. Extract lead data from GoHighLevel payload
    const contact = payload.contact || {}
    const opportunity = payload.opportunity || {}

    if (!contact.email && !contact.phone) {
      console.error('[GoHighLevel Webhook] Missing both email and phone')
      return NextResponse.json(
        { error: 'Contact must have email or phone' },
        { status: 400 }
      )
    }

    // 4. Determine which organization this lead belongs to
    // Option A: GoHighLevel location ID maps to organization
    // Option B: Use API key to identify organization
    // For now, we'll use a location_id → organization_id mapping from metadata

    const locationId = payload.location_id || payload.locationId
    if (!locationId) {
      console.error('[GoHighLevel Webhook] Missing location_id')
      return NextResponse.json(
        { error: 'Missing location_id in webhook payload' },
        { status: 400 }
      )
    }

    // 5. Find organization by GoHighLevel location ID
    const supabaseAdmin = createAdminClient()

    // Look up organization by location_id in metadata
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .contains('metadata', { gohighlevel_location_id: locationId })
      .single()

    if (orgError || !org) {
      console.error('[GoHighLevel Webhook] Organization not found:', {
        locationId,
        error: orgError?.message
      })

      // Log webhook but don't fail - allows debugging
      await logWebhook(supabaseAdmin, {
        provider: 'gohighlevel',
        event_type: payload.type || 'unknown',
        payload,
        status: 'failed',
        error_message: `Organization not found for location_id: ${locationId}`
      })

      return NextResponse.json(
        { error: 'Organization not configured for this GoHighLevel location' },
        { status: 404 }
      )
    }

    console.log('[GoHighLevel Webhook] Matched organization:', org.name)

    // 6. Check if lead already exists
    const email = contact.email?.toLowerCase()
    const phone = contact.phone

    let query = supabaseAdmin
      .from('leads')
      .select('id, name, status')
      .eq('organization_id', org.id)

    if (email && phone) {
      query = query.or(`email.eq.${email},phone.ilike.%${phone.replace(/[^0-9]/g, '')}%`)
    } else if (email) {
      query = query.eq('email', email)
    } else if (phone) {
      query = query.ilike('phone', `%${phone.replace(/[^0-9]/g, '')}%`)
    }

    const { data: existingLead } = await query.maybeSingle()

    let leadId: string
    let isNewLead = false

    if (existingLead) {
      // Update existing lead
      console.log('[GoHighLevel Webhook] Updating existing lead:', existingLead.id)

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('leads')
        .update({
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || existingLead.name,
          email: email || existingLead.email,
          phone: phone || existingLead.phone,
          source: contact.source || 'gohighlevel',
          status: existingLead.status || 'new',
          metadata: {
            ...existingLead.metadata,
            gohighlevel_contact_id: contact.id,
            gohighlevel_opportunity: opportunity,
            last_webhook_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('[GoHighLevel Webhook] Failed to update lead:', updateError)
        throw updateError
      }

      leadId = updated.id
    } else {
      // Create new lead
      isNewLead = true
      const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()

      console.log('[GoHighLevel Webhook] Creating new lead')

      const { data: newLead, error: createError } = await supabaseAdmin
        .from('leads')
        .insert({
          organization_id: org.id,
          name: fullName || 'New Lead',
          email: email,
          phone: phone,
          source: contact.source || 'gohighlevel',
          status: 'new',
          form_name: opportunity.name,
          metadata: {
            gohighlevel_contact_id: contact.id,
            gohighlevel_opportunity: opportunity,
            first_webhook_at: new Date().toISOString()
          }
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[GoHighLevel Webhook] Failed to create lead:', createError)
        throw createError
      }

      leadId = newLead.id
      console.log('[GoHighLevel Webhook] Created lead:', leadId)
    }

    // 7. Find or create AI qualification agent for this organization
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('ai_agents')
      .select('id, name, system_prompt')
      .eq('organization_id', org.id)
      .eq('role', 'lead_qualification')
      .eq('enabled', true)
      .maybeSingle()

    if (agentError) {
      console.error('[GoHighLevel Webhook] Failed to query agent:', agentError)
    }

    let agentId: string | null = agent?.id || null

    // If no agent exists, create default one
    if (!agentId) {
      console.log('[GoHighLevel Webhook] Creating default lead qualification agent')

      const { data: newAgent, error: createAgentError } = await supabaseAdmin
        .from('ai_agents')
        .insert({
          organization_id: org.id,
          name: 'Lead Qualification Bot',
          description: 'AI agent for qualifying and nurturing leads from GoHighLevel',
          role: 'lead_qualification',
          system_prompt: getDefaultQualificationPrompt(org.name),
          model: 'gpt-5',
          temperature: 0.7,
          max_tokens: 500,
          enabled: true,
          allowed_tools: [
            'send_message_to_lead',
            'update_lead_status',
            'schedule_follow_up'
          ],
          metadata: {
            auto_created: true,
            created_from: 'gohighlevel_webhook'
          }
        })
        .select('id')
        .single()

      if (createAgentError) {
        console.error('[GoHighLevel Webhook] Failed to create agent:', createAgentError)
      } else {
        agentId = newAgent.id
        console.log('[GoHighLevel Webhook] Created agent:', agentId)
      }
    }

    // 8. Create AI conversation if agent exists and this is a new lead
    if (agentId && isNewLead) {
      console.log('[GoHighLevel Webhook] Creating AI conversation')

      const { data: conversation, error: convError } = await supabaseAdmin
        .from('ai_agent_conversations')
        .insert({
          agent_id: agentId,
          organization_id: org.id,
          title: `Lead Qualification: ${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          status: 'active',
          metadata: {
            lead_id: leadId,
            source: 'gohighlevel_webhook',
            contact_email: email,
            contact_phone: phone
          }
        })
        .select('id')
        .single()

      if (convError) {
        console.error('[GoHighLevel Webhook] Failed to create conversation:', convError)
      } else {
        console.log('[GoHighLevel Webhook] Created conversation:', conversation.id)

        // 9. Send initial qualification message via AI agent
        // This will be handled by the agent orchestrator via a background task
        const { error: taskError } = await supabaseAdmin
          .from('ai_agent_tasks')
          .insert({
            agent_id: agentId,
            organization_id: org.id,
            title: `Qualify lead: ${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            description: 'Send initial qualification message to new lead',
            task_type: 'adhoc',
            status: 'pending',
            priority: 8,
            context: {
              conversation_id: conversation.id,
              lead_id: leadId,
              action: 'send_initial_message'
            },
            next_run_at: new Date().toISOString()
          })

        if (taskError) {
          console.error('[GoHighLevel Webhook] Failed to create task:', taskError)
        } else {
          console.log('[GoHighLevel Webhook] Created qualification task')
        }
      }
    }

    // 10. Log webhook success
    await logWebhook(supabaseAdmin, {
      provider: 'gohighlevel',
      event_type: payload.type || 'contact_created',
      payload,
      status: 'success',
      organization_id: org.id,
      lead_id: leadId,
      processing_time_ms: Date.now() - startTime
    })

    return NextResponse.json({
      success: true,
      leadId,
      agentId,
      isNewLead,
      organizationId: org.id,
      processingTimeMs: Date.now() - startTime
    })

  } catch (error: any) {
    console.error('[GoHighLevel Webhook] Error:', error)

    // Log error webhook
    try {
      const supabaseAdmin = createAdminClient()
      await logWebhook(supabaseAdmin, {
        provider: 'gohighlevel',
        event_type: 'error',
        payload: {},
        status: 'failed',
        error_message: error.message,
        processing_time_ms: Date.now() - startTime
      })
    } catch (logError) {
      console.error('[GoHighLevel Webhook] Failed to log error:', logError)
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Log webhook event to database for debugging and monitoring
 */
async function logWebhook(supabase: any, data: {
  provider: string
  event_type: string
  payload: any
  status: string
  organization_id?: string
  lead_id?: string
  error_message?: string
  processing_time_ms?: number
}) {
  try {
    await supabase
      .from('webhook_logs')
      .insert({
        provider: data.provider,
        event_type: data.event_type,
        payload: data.payload,
        status: data.status,
        organization_id: data.organization_id,
        lead_id: data.lead_id,
        error_message: data.error_message,
        processing_time_ms: data.processing_time_ms,
        received_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('[GoHighLevel Webhook] Failed to log webhook:', error)
    // Don't throw - logging failure shouldn't break webhook
  }
}

/**
 * Generate default lead qualification system prompt
 */
function getDefaultQualificationPrompt(gymName: string): string {
  return `You are a friendly AI assistant for ${gymName}, a fitness facility.

Your role is to qualify leads and book them for discovery calls. You should:

1. **Greet warmly** - Welcome them and thank them for their interest
2. **Ask about their goals** - What are they hoping to achieve? (weight loss, strength, fitness, etc.)
3. **Understand their experience** - Have they worked out before? Any injuries or limitations?
4. **Discover their budget** - What investment level are they comfortable with for their health?
5. **Check availability** - When would be the best time for a quick 15-minute discovery call?
6. **Book the call** - If qualified, schedule them for a call with our team

**Qualification Criteria:**
- Budget: Should be willing to invest £50-200/month
- Commitment: Looking to join within next 2-4 weeks
- Goals: Clear fitness goals that align with our programs

**Tone:** Friendly, helpful, enthusiastic but not pushy
**Response Length:** Keep messages short (2-3 sentences max)
**Speed:** Respond promptly when leads message

If they're qualified, use the booking tool to schedule a discovery call.
If they're not ready yet, schedule a follow-up for 7 days later.`
}
