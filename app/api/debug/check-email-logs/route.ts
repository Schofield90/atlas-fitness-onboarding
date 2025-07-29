import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth } from '@/app/lib/api/auth-check'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const supabase = await createClient()
    
    // Get the lead email from query params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    // Check if email_logs table exists and has data
    const { data: allLogs, error: allError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // If email provided, check specific logs
    let specificLogs = null
    if (email) {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('to_email', email)
        .order('created_at', { ascending: false })
      
      specificLogs = { data, error }
    }
    
    // Check table structure
    const { data: columns } = await supabase
      .rpc('get_table_columns', { table_name: 'email_logs' })
      .select('*')
    
    return NextResponse.json({
      tableCheck: {
        hasData: allLogs && allLogs.length > 0,
        totalLogs: allLogs?.length || 0,
        error: allError?.message
      },
      recentLogs: allLogs || [],
      specificEmailLogs: specificLogs,
      tableColumns: columns || 'Could not fetch columns',
      debugInfo: {
        email,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check email logs',
      details: error.message
    }, { status: 500 })
  }
}