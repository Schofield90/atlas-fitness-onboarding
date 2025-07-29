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

    // Fetch SMS messages
    const { data: smsMessages = [], error: smsError } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('to', lead.phone || '')
      .order('created_at', { ascending: false })

    // Fetch WhatsApp messages
    const { data: whatsappMessages = [], error: whatsappError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('to', lead.phone || '')
      .order('created_at', { ascending: false })

    // Fetch email messages
    const { data: emailMessages = [], error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('"to"', lead.email || '')
      .order('created_at', { ascending: false })

    if (smsError) console.error('SMS fetch error:', smsError)
    if (whatsappError) console.error('WhatsApp fetch error:', whatsappError)
    if (emailError) console.error('Email fetch error:', emailError)

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