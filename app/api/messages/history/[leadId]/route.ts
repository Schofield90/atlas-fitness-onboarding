import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const { leadId } = await params

    // Verify lead belongs to organization
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch messages for this lead
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        user:users!messages_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('lead_id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ 
      messages: messages || [],
      leadId 
    })

  } catch (error) {
    return createErrorResponse(error)
  }
}