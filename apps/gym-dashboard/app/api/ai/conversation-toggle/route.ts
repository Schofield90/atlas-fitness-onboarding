import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

// Toggle AI for a specific conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, phoneNumber, channel, ai_enabled, handoff_reason } = body

    if (!organizationId || !phoneNumber || !channel || typeof ai_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    
    // Use the database function to toggle AI state
    const { data, error } = await adminSupabase.rpc('toggle_conversation_ai', {
      p_organization_id: organizationId,
      p_phone_number: phoneNumber,
      p_channel: channel,
      p_ai_enabled: ai_enabled,
      p_handoff_reason: handoff_reason
    })

    if (error) {
      console.error('Error toggling conversation AI:', error)
      return NextResponse.json({ error: 'Failed to toggle AI state' }, { status: 500 })
    }

    // Log the toggle action
    await adminSupabase.from('ai_chatbot_logs').insert({
      organization_id: organizationId,
      action_type: ai_enabled ? 'enabled' : 'disabled',
      triggered_by: 'user',
      trigger_reason: handoff_reason || (ai_enabled ? 'AI re-enabled for conversation' : 'AI disabled for conversation'),
      phone_number: phoneNumber
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Conversation toggle API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}