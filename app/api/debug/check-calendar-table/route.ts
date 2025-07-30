import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Check if table exists by trying to query it
    const { data: tableCheck, error: tableError } = await adminSupabase
      .from('google_calendar_tokens')
      .select('*')
      .limit(0)
    
    if (tableError) {
      return NextResponse.json({
        tableExists: false,
        error: tableError.message,
        hint: 'Run the google-calendar-tokens.sql migration in Supabase'
      })
    }
    
    // Get count of tokens
    const { count, error: countError } = await adminSupabase
      .from('google_calendar_tokens')
      .select('*', { count: 'exact', head: true })
    
    // Get table columns
    const { data: columns, error: columnsError } = await adminSupabase
      .rpc('get_table_columns', { table_name: 'google_calendar_tokens' })
      .catch(() => ({ data: null, error: 'RPC function not available' }))
    
    return NextResponse.json({
      tableExists: true,
      tokenCount: count || 0,
      tableColumns: columns || 'Unable to fetch columns',
      errors: {
        count: countError?.message,
        columns: columnsError
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Server error',
      message: error.message,
      hint: 'Check if google_calendar_tokens table exists in your database'
    }, { status: 500 })
  }
}