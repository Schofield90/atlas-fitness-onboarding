import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Test direct insert of an inbound message
    const testInboundMessage = {
      message_id: 'test-inbound-' + Date.now(),
      to: '+447450308627',  // Your Twilio number
      from_number: '+447490253471',  // Test sender
      message: 'Test inbound message',
      status: 'received'
    }
    
    const { data: testInsert, error: insertError } = await adminSupabase
      .from('sms_logs')
      .insert(testInboundMessage)
      .select()
      .single()
    
    // Get ALL messages from the database
    const { data: allSmsLogs, error: smsError } = await adminSupabase
      .from('sms_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    const { data: allWhatsappLogs, error: whatsappError } = await adminSupabase
      .from('whatsapp_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    // Count messages by status
    const smsStats = {
      total: allSmsLogs?.length || 0,
      received: allSmsLogs?.filter(m => m.status === 'received').length || 0,
      sent: allSmsLogs?.filter(m => m.status === 'sent').length || 0,
      other: allSmsLogs?.filter(m => m.status !== 'received' && m.status !== 'sent').length || 0
    }
    
    const whatsappStats = {
      total: allWhatsappLogs?.length || 0,
      received: allWhatsappLogs?.filter(m => m.status === 'received').length || 0,
      sent: allWhatsappLogs?.filter(m => m.status === 'sent').length || 0,
      other: allWhatsappLogs?.filter(m => m.status !== 'received' && m.status !== 'sent').length || 0
    }
    
    // Check specific phone number formats
    const phoneFormats = ['+447490253471', '447490253471', '07490253471']
    const formatChecks = {}
    
    for (const format of phoneFormats) {
      const { data: smsCheck } = await adminSupabase
        .from('sms_logs')
        .select('id, from_number, to, status')
        .or(`from_number.eq.${format},to.eq.${format}`)
        .limit(5)
      
      formatChecks[format] = {
        found: smsCheck?.length || 0,
        samples: smsCheck?.slice(0, 2)
      }
    }
    
    return NextResponse.json({
      testInsert: {
        success: !insertError,
        data: testInsert,
        error: insertError
      },
      
      statistics: {
        sms: smsStats,
        whatsapp: whatsappStats
      },
      
      recentMessages: {
        sms: allSmsLogs?.slice(0, 5),
        whatsapp: allWhatsappLogs?.slice(0, 5)
      },
      
      phoneFormatTests: formatChecks,
      
      webhookUrl: 'https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio',
      
      debugging: {
        checkTwilioConsole: 'Go to Twilio Console > Monitor > Logs > Errors to see if webhooks are failing',
        checkWebhookConfig: 'Ensure the webhook URL has no line breaks or spaces',
        verifyPhoneNumber: 'Make sure +447450308627 is configured in Twilio',
        checkVercelLogs: 'Look for "Twilio webhook called" in Vercel logs after sending a message'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Comprehensive check failed',
      details: error.message
    }, { status: 500 })
  }
}