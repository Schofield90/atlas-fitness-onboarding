import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get the phone number from query params
    const searchParams = request.nextUrl.searchParams
    const phoneNumber = searchParams.get('phone')
    
    // Get recent SMS logs
    const smsQuery = adminSupabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (phoneNumber) {
      smsQuery.or(`to.eq.${phoneNumber},from_number.eq.${phoneNumber}`)
    }
    
    const { data: smsLogs, error: smsError } = await smsQuery
    
    // Get recent WhatsApp logs
    const whatsappQuery = adminSupabase
      .from('whatsapp_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (phoneNumber) {
      whatsappQuery.or(`to.eq.${phoneNumber},from_number.eq.${phoneNumber}`)
    }
    
    const { data: whatsappLogs, error: whatsappError } = await whatsappQuery
    
    // Analyze the logs
    const analysis = {
      sms: {
        total: smsLogs?.length || 0,
        inbound: smsLogs?.filter(log => log.status === 'received').length || 0,
        outbound: smsLogs?.filter(log => log.status === 'sent').length || 0,
        hasInboundMessages: smsLogs?.some(log => log.status === 'received') || false,
        error: smsError
      },
      whatsapp: {
        total: whatsappLogs?.length || 0,
        inbound: whatsappLogs?.filter(log => log.status === 'received').length || 0,
        outbound: whatsappLogs?.filter(log => log.status === 'sent').length || 0,
        hasInboundMessages: whatsappLogs?.some(log => log.status === 'received') || false,
        error: whatsappError
      }
    }
    
    // Format logs for display
    const formatLog = (log: any, type: string) => ({
      id: log.id,
      type,
      direction: log.status === 'received' ? 'inbound' : 'outbound',
      from: log.from_number || 'N/A',
      to: log.to || log.to_email || 'N/A',
      message: log.message,
      status: log.status,
      created_at: log.created_at
    })
    
    return NextResponse.json({
      phoneNumber: phoneNumber || 'All numbers',
      analysis,
      recentMessages: {
        sms: smsLogs?.map(log => formatLog(log, 'sms')) || [],
        whatsapp: whatsappLogs?.map(log => formatLog(log, 'whatsapp')) || []
      },
      webhookInfo: {
        tip: 'Make sure your Twilio webhook is pointing to:',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/webhooks/twilio`,
        checkWebhook: 'Go to Twilio Console > Phone Numbers > Your Number > Messaging > Webhook'
      },
      troubleshooting: {
        noInboundMessages: !analysis.sms.hasInboundMessages && !analysis.whatsapp.hasInboundMessages,
        possibleIssues: [
          'Webhook URL not configured in Twilio',
          'Webhook pointing to wrong URL',
          'Messages not being sent to the correct number',
          'Database not saving received messages'
        ]
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug check failed',
      details: error.message
    }, { status: 500 })
  }
}