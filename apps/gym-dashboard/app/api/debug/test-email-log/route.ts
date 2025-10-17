import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Test inserting a dummy email log
    const testLog = {
      message_id: 'test-' + Date.now(),
      to_email: 'test@example.com',
      from_email: 'sam@atlas-gyms.co.uk',
      subject: 'Test Email',
      message: 'This is a test email log',
      status: 'sent'
    }
    
    console.log('Attempting to insert test log:', testLog)
    
    const { data, error } = await adminSupabase
      .from('email_logs')
      .insert(testLog)
      .select()
    
    // Also fetch recent logs
    const { data: recentLogs, error: fetchError } = await adminSupabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    return NextResponse.json({
      testInsert: {
        success: !error,
        data,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      },
      recentLogs: {
        count: recentLogs?.length || 0,
        logs: recentLogs,
        error: fetchError
      },
      testData: testLog
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}