import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { getCurrentUserOrganization } from '@/app/lib/services/membership-service'

export async function DELETE() {
  try {
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const supabase = createAdminClient()
    
    // Delete ALL classes for the current organization
    const { error: deleteError, count } = await supabase
      .from('class_sessions')
      .delete()
      .eq('organization_id', organizationId)
      .select('*', { count: 'exact' })
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete classes', details: deleteError },
        { status: 500 }
      )
    }
    
    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    
    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      remainingCount: remainingCount || 0,
      organizationId,
      message: `Deleted ${count || 0} classes. ${remainingCount || 0} classes remaining.`
    })
  } catch (error: any) {
    console.error('Error in force clean:', error)
    return NextResponse.json(
      { error: 'Failed to clean classes', details: error.message },
      { status: 500 }
    )
  }
}