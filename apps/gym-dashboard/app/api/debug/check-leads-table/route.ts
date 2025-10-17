import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    
    // Get sample leads to see structure
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .limit(1)
    
    // Get columns info
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('get_table_columns', { schema_name: 'public', table_name: 'leads' })
    
    return NextResponse.json({
      sampleLead: leads?.[0] || 'No leads found',
      leadColumns: leads?.[0] ? Object.keys(leads[0]) : [],
      columnsFromRPC: columns,
      errors: {
        leads: leadsError?.message,
        columns: columnsError?.message
      }
    })
  } catch (error) {
    // Fallback if RPC doesn't exist
    const supabaseAdmin = createAdminClient()
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('*')
      .limit(1)
    
    return NextResponse.json({
      sampleLead: leads?.[0] || 'No leads found',
      leadColumns: leads?.[0] ? Object.keys(leads[0]) : [],
      message: 'Check which columns exist in the leads table'
    })
  }
}