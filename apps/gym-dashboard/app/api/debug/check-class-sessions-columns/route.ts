import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Get table structure
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'class_sessions' })

    if (error) {
      // Try alternative approach
      const { data: testInsert, error: insertError } = await supabase
        .from('class_sessions')
        .select('*')
        .limit(0)

      return NextResponse.json({
        method: 'select_columns',
        columns: testInsert ? Object.keys(testInsert[0] || {}) : [],
        error: insertError?.message,
        requiredFields: ['organization_id', 'program_id', 'name', 'instructor_name', 'start_time', 'duration_minutes', 'capacity', 'location']
      })
    }

    return NextResponse.json({
      columns: columns || [],
      requiredFields: ['organization_id', 'program_id', 'name', 'instructor_name', 'start_time', 'duration_minutes', 'capacity', 'location']
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to check columns', 
      details: error.message 
    }, { status: 500 })
  }
}