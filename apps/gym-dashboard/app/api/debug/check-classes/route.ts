import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Get all class sessions for Atlas Fitness
    const { data: allClasses, error: classError } = await supabase
      .from('class_sessions')
      .select('id, name, organization_id, created_at')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b740e')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Count total classes
    const { count: totalCount } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b740e')
    
    // Get unique class names
    const { data: uniqueNames } = await supabase
      .from('class_sessions')
      .select('name')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b740e')
      .limit(20)
    
    // Check different organization IDs
    const { data: orgCheck } = await supabase
      .from('class_sessions')
      .select('organization_id')
      .limit(5)
    
    return NextResponse.json({
      totalClassesForAtlas: totalCount,
      sampleClasses: allClasses,
      uniqueClassNames: [...new Set(uniqueNames?.map(c => c.name) || [])],
      organizationIds: [...new Set(orgCheck?.map(c => c.organization_id) || [])],
      error: classError
    })
  } catch (error: any) {
    console.error('Error checking classes:', error)
    return NextResponse.json(
      { error: 'Failed to check classes', details: error.message },
      { status: 500 }
    )
  }
}