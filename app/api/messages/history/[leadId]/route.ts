import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const adminSupabase = createAdminClient() // Use admin client for reading logs
    const { leadId } = await params

    // Verify lead belongs to organization and get contact info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, phone, email')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch SMS messages using admin client
    const { data: smsMessages = [], error: smsError } = await adminSupabase
      .from('sms_logs')
      .select('*')
      .eq('to', lead.phone || '')
      .order('created_at', { ascending: false })

    // Fetch WhatsApp messages using admin client
    const { data: whatsappMessages = [], error: whatsappError } = await adminSupabase
      .from('whatsapp_logs')
      .select('*')
      .eq('to', lead.phone || '')
      .order('created_at', { ascending: false })

    // Fetch email messages using admin client
    console.log('Fetching emails for:', lead.email)
    const { data: emailMessages = [], error: emailError } = await adminSupabase
      .from('email_logs')
      .select('*')
      .eq('to_email', lead.email || '')
      .order('created_at', { ascending: false })

    if (smsError) console.error('SMS fetch error:', smsError)
    if (whatsappError) console.error('WhatsApp fetch error:', whatsappError)
    if (emailError) console.error('Email fetch error:', emailError)
    
    console.log('Email messages found:', emailMessages.length)
    console.log('SMS messages found:', smsMessages.length)
    console.log('WhatsApp messages found:', whatsappMessages.length)

    // Combine and format messages
    const allMessages = [
      ...smsMessages.map(msg => ({
        id: msg.id,
        type: 'sms' as const,
        direction: 'outbound' as const,
        status: msg.status,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      })),
      ...whatsappMessages.map(msg => ({
        id: msg.id,
        type: 'whatsapp' as const,
        direction: 'outbound' as const,
        status: msg.status,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      })),
      ...emailMessages.map(msg => ({
        id: msg.id,
        type: 'email' as const,
        direction: 'outbound' as const,
        status: msg.status,
        subject: msg.subject,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ 
      messages: allMessages,
      leadId 
    })

  } catch (error) {
    return createErrorResponse(error)
  }
}