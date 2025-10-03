import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Direct SQL query to check email_logs
    const { data: directQuery, error: queryError } = await adminSupabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs') as table_exists,
            (SELECT COUNT(*) FROM email_logs) as record_count,
            (SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 5) t) as recent_logs
        `
      })
    
    // If the above fails, try a simpler approach
    if (queryError) {
      // Try direct table query
      const { data: logs, error: logsError, count } = await adminSupabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10)
      
      return NextResponse.json({
        method: 'direct_query',
        success: !logsError,
        count: count,
        logs: logs,
        error: logsError ? {
          message: logsError.message,
          code: logsError.code,
          details: logsError.details
        } : null,
        
        // Try to manually insert a record to test
        testInsert: await testInsert(adminSupabase)
      })
    }
    
    return NextResponse.json({
      method: 'rpc_query',
      data: directQuery,
      error: queryError
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Direct query failed',
      details: error.message
    }, { status: 500 })
  }
}

async function testInsert(adminSupabase: any) {
  const testRecord = {
    message_id: 'direct-test-' + Date.now(),
    to_email: 'direct-test@example.com',
    from_email: 'sam@atlas-gyms.co.uk',
    subject: 'Direct Test',
    message: 'Testing direct insert',
    status: 'sent'
  }
  
  const { data, error } = await adminSupabase
    .from('email_logs')
    .insert(testRecord)
    .select()
  
  return {
    attempted: testRecord,
    success: !error,
    data: data,
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details
    } : null
  }
}