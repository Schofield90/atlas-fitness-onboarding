import { createClient } from '@/app/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Tables we want to check
    const tablesToCheck = [
      'memberships',
      'notifications', 
      'tasks',
      'workflow_events',
      'client_activities',
      'lead_stage_history',
      'membership_plans',
      'bookings',
      'class_sessions',
      'programs',
      'waitlist',
      'profiles',
      'users',
      'organization_members'
    ]
    
    // Query information_schema to see which tables exist
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', tablesToCheck)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const existingTables = data?.map(row => row.table_name) || []
    const missingTables = tablesToCheck.filter(table => !existingTables.includes(table))
    
    // Also check if we can query some of these tables
    const tableChecks: Record<string, any> = {}
    
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        tableChecks[table] = {
          exists: !error,
          error: error?.message,
          count: count || 0
        }
      } catch (e) {
        tableChecks[table] = {
          exists: false,
          error: 'Table does not exist'
        }
      }
    }
    
    return NextResponse.json({
      summary: {
        total_checked: tablesToCheck.length,
        existing: existingTables.length,
        missing: missingTables.length
      },
      existing_tables: existingTables.sort(),
      missing_tables: missingTables.sort(),
      detailed_checks: tableChecks
    }, { status: 200 })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}