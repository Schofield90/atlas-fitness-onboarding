import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function DELETE() {
  try {
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = createAdminClient()
    
    // Delete all programs except "Group PT" (case insensitive)
    const { data: deleted, error } = await supabase
      .from('programs')
      .delete()
      .eq('organization_id', organizationId)
      .not('name', 'ilike', 'Group PT')
      .select()

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to cleanup class types', 
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      deleted: deleted?.length || 0,
      message: `Deleted ${deleted?.length || 0} class types. Kept "Group PT" only.`
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}