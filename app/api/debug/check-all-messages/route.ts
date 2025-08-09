import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const adminSupabase = createAdminClient()
    
    // Check all message tables
    const results: any = {}
    
    // Check messages table
    const { data: messages, error: messagesError } = await adminSupabase
      .from('messages')
      .select('id, type, lead_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    results.messages = {
      count: messages?.length || 0,
      sample: messages?.slice(0, 3),
      error: messagesError?.message
    }
    
    // Check sms_logs
    const { data: smsLogs, error: smsError } = await adminSupabase
      .from('sms_logs')
      .select('id, from_number, to, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    results.sms_logs = {
      count: smsLogs?.length || 0,
      sample: smsLogs?.slice(0, 3),
      error: smsError?.message
    }
    
    // Check whatsapp_logs
    const { data: whatsappLogs, error: whatsappError } = await adminSupabase
      .from('whatsapp_logs')
      .select('id, from_number, to, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    results.whatsapp_logs = {
      count: whatsappLogs?.length || 0,
      sample: whatsappLogs?.slice(0, 3),
      error: whatsappError?.message
    }
    
    // Check email_logs
    const { data: emailLogs, error: emailError } = await adminSupabase
      .from('email_logs')
      .select('id, to_email, subject, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    results.email_logs = {
      count: emailLogs?.length || 0,
      sample: emailLogs?.slice(0, 3),
      error: emailError?.message
    }
    
    // Check a specific lead's messages
    const testLeadId = 'your-lead-id-here' // Replace with actual lead ID
    const { data: leadMessages } = await adminSupabase
      .from('messages')
      .select('*')
      .eq('lead_id', testLeadId)
    
    results.specific_lead = {
      lead_id: testLeadId,
      message_count: leadMessages?.length || 0
    }
    
    return NextResponse.json({
      success: true,
      tables: results,
      summary: {
        total_messages: (messages?.length || 0) + (smsLogs?.length || 0) + 
                       (whatsappLogs?.length || 0) + (emailLogs?.length || 0),
        has_data: Object.values(results).some((r: any) => r.count > 0)
      }
    })
    
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug check failed', 
      details: error.message 
    }, { status: 500 })
  }
}