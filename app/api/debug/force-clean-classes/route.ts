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
    
    // First count how many we're going to delete
    const { count: beforeCount } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    
    // Delete ALL classes for the current organization
    const { error: deleteError } = await supabase
      .from('class_sessions')
      .delete()
      .eq('organization_id', organizationId)
    
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
      deletedCount: beforeCount || 0,
      remainingCount: remainingCount || 0,
      organizationId,
      message: `Deleted ${beforeCount || 0} classes. ${remainingCount || 0} classes remaining.`
    })
  } catch (error: any) {
    console.error('Error in force clean:', error)
    return NextResponse.json(
      { error: 'Failed to clean classes', details: error.message },
      { status: 500 }
    )
  }
}