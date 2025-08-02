import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Try to get column information by selecting from clients
    const { data: sampleClient, error: selectError } = await supabase
      .from('clients')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    // Get table structure using raw SQL
    const { data: columns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'clients' })
      .select('*')
    
    // Try different column names
    const columnTests = {
      name: null as any,
      first_name: null as any,
      full_name: null as any,
      client_name: null as any
    }
    
    for (const col of Object.keys(columnTests)) {
      const { data, error } = await supabase
        .from('clients')
        .select(col)
        .limit(1)
        .maybeSingle()
      
      columnTests[col] = { exists: !error, error: error?.message }
    }
    
    return NextResponse.json({
      sampleClient,
      selectError: selectError?.message,
      availableColumns: sampleClient ? Object.keys(sampleClient) : [],
      columnTests,
      schemaInfo: {
        columns,
        error: schemaError?.message
      },
      suggestion: "The clients table might use 'first_name' and 'last_name' instead of 'name'"
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check schema',
      details: error.message
    }, { status: 500 })
  }
}