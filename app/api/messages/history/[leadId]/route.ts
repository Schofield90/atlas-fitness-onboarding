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

    // Normalize phone number for queries - ensure it has + prefix
    let normalizedPhone = lead.phone || ''
    if (normalizedPhone && !normalizedPhone.startsWith('+')) {
      // If it starts with 0, assume UK number
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = `+44${normalizedPhone.substring(1)}`
      } else if (normalizedPhone.match(/^44\d+$/)) {
        // If it starts with 44, add +
        normalizedPhone = `+${normalizedPhone}`
      }
    }
    
    // Create phone variations to catch all formats
    const phoneVariations = [normalizedPhone]
    if (lead.phone) {
      phoneVariations.push(lead.phone)
      if (lead.phone.startsWith('0')) {
        phoneVariations.push(`+44${lead.phone.substring(1)}`)
      }
    }
    const uniquePhones = [...new Set(phoneVariations)].filter(Boolean)
    
    // Fetch SMS messages using admin client (both sent and received)
    console.log('Fetching SMS for phone variations:', uniquePhones)
    const phoneConditions = uniquePhones.map(p => `to.eq.${p},from_number.eq.${p}`).join(',')
    const { data: smsMessages = [], error: smsError } = await adminSupabase
      .from('sms_logs')
      .select('*')
      .or(phoneConditions)
      .order('created_at', { ascending: false })
    
    console.log('SMS query result:', { 
      count: smsMessages?.length, 
      error: smsError,
      phoneUsed: normalizedPhone 
    })

    // Fetch WhatsApp messages using admin client (both sent and received)
    const { data: whatsappMessages = [], error: whatsappError } = await adminSupabase
      .from('whatsapp_logs')
      .select('*')
      .or(phoneConditions)
      .order('created_at', { ascending: false })

    // Fetch from main messages table (includes all types)
    const { data: mainMessages = [], error: mainError } = await adminSupabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
    
    console.log('Main messages found:', mainMessages.length)

    // Fetch email messages using admin client
    console.log('Fetching emails for:', lead.email)
    console.log('Lead data:', { id: lead.id, phone: lead.phone, email: lead.email })
    
    const { data: emailMessages = [], error: emailError } = await adminSupabase
      .from('email_logs')
      .select('*')
      .eq('to_email', lead.email || '')
      .order('created_at', { ascending: false })

    if (smsError) console.error('SMS fetch error:', smsError)
    if (whatsappError) console.error('WhatsApp fetch error:', whatsappError)
    if (emailError) {
      console.error('Email fetch error:', emailError)
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code,
        details: emailError.details,
        hint: emailError.hint
      })
    }
    
    console.log('Email messages found:', emailMessages.length)
    console.log('SMS messages found:', smsMessages.length)
    console.log('WhatsApp messages found:', whatsappMessages.length)
    console.log('Total messages to return:', smsMessages.length + whatsappMessages.length + emailMessages.length)

    // Combine and format messages
    const allMessages = [
      ...smsMessages.map(msg => ({
        id: msg.id,
        type: 'sms' as const,
        direction: msg.from_number === normalizedPhone ? ('inbound' as const) : ('outbound' as const),
        status: msg.status,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      })),
      ...whatsappMessages.map(msg => ({
        id: msg.id,
        type: 'whatsapp' as const,
        direction: msg.from_number === normalizedPhone ? ('inbound' as const) : ('outbound' as const),
        status: msg.status,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      })),
      ...emailMessages.map(msg => ({
        id: msg.id,
        type: 'email' as const,
        direction: 'outbound' as const, // Email is always outbound for now
        status: msg.status,
        subject: msg.subject,
        body: msg.message,
        created_at: msg.created_at,
        sent_at: msg.created_at
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Merge messages from all sources and deduplicate
    const allMessagesMap = new Map()
    
    // Add main messages (has all types including AI responses)
    mainMessages.forEach(msg => {
      const key = `${msg.type}-${msg.twilio_sid || msg.id}`
      if (!allMessagesMap.has(key)) {
        allMessagesMap.set(key, {
          id: msg.id,
          type: msg.type || 'sms',
          direction: msg.direction,
          status: msg.status,
          body: msg.body,
          subject: msg.subject,
          created_at: msg.created_at || msg.sent_at,
          from_number: msg.from_number,
          to_number: msg.to_number,
          metadata: msg.metadata
        })
      }
    })
    
    // Add messages from specific tables (might have some not in main table)
    const allSpecificMessages = [...smsMessages, ...whatsappMessages, ...emailMessages]
    allSpecificMessages.forEach(msg => {
      const type = msg.message_id?.includes('whatsapp') ? 'whatsapp' : 
                   msg.message_id?.includes('SM') ? 'sms' : 'email'
      const key = `${type}-${msg.message_id || msg.id}`
      
      if (!allMessagesMap.has(key)) {
        const direction = (msg.from_number === normalizedPhone || msg.from_number === lead.phone) ? 
                         'inbound' : 'outbound'
        
        allMessagesMap.set(key, {
          id: msg.id,
          type: type as any,
          direction,
          status: msg.status,
          body: msg.message || msg.body,
          subject: msg.subject,
          created_at: msg.created_at || msg.sent_at,
          from_number: msg.from_number,
          to_number: msg.to || msg.to_email
        })
      }
    })
    
    // Convert to array and sort by time
    const mergedMessages = Array.from(allMessagesMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    console.log('Merged messages:', {
      total: mergedMessages.length,
      fromMain: mainMessages.length,
      fromSMS: smsMessages.length,
      fromWhatsApp: whatsappMessages.length,
      fromEmail: emailMessages.length
    })

    return NextResponse.json({ 
      messages: {
        emails: mergedMessages.filter(m => m.type === 'email'),
        sms: mergedMessages.filter(m => m.type === 'sms'),
        whatsapp: mergedMessages.filter(m => m.type === 'whatsapp'),
        calls: mergedMessages.filter(m => m.type === 'call' || (m.body && m.body.includes('Phone call')))
      },
      leadId 
    })

  } catch (error) {
    return createErrorResponse(error)
  }
}