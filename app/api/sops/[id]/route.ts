import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOPUpdate } from '@/app/lib/types/sop'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const { data: sop, error } = await supabase
      .from('sops')
      .select(`
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email),
        approver:users!sops_approved_by_fkey(id, name, email),
        versions:sop_versions(
          id, version, title, changes_summary, created_by, created_at,
          creator:users(name, email)
        ),
        comments:sop_comments(
          id, content, created_at, updated_at,
          user:users(name, email),
          replies:sop_comments(
            id, content, created_at, updated_at,
            user:users(name, email)
          )
        ),
        training_records:sop_training_records(
          id, user_id, status, assigned_at, completed_at, quiz_score, quiz_passed,
          user:users(name, email)
        )
      `)
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (error || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    // Calculate training statistics
    const trainingStats = {
      total_assigned: sop.training_records?.length || 0,
      completed: sop.training_records?.filter(r => r.status === 'completed').length || 0,
      in_progress: sop.training_records?.filter(r => r.status === 'in_progress').length || 0,
      overdue: sop.training_records?.filter(r => r.status === 'overdue').length || 0,
    }

    return NextResponse.json({ 
      sop: {
        ...sop,
        training_stats: trainingStats
      }
    })
  } catch (error) {
    console.error('Error fetching SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const updates: SOPUpdate = body

    // Get current SOP to track changes
    const { data: currentSop, error: fetchError } = await supabase
      .from('sops')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !currentSop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    // Check if content has changed significantly to create a new version
    const contentChanged = updates.content && updates.content !== currentSop.content
    const titleChanged = updates.title && updates.title !== currentSop.title

    let newVersion = currentSop.version
    if (contentChanged || titleChanged) {
      newVersion = currentSop.version + 1
      updates.version = newVersion
    }

    // Update SOP
    const { data: sop, error } = await supabase
      .from('sops')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .select(`
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email),
        approver:users!sops_approved_by_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating SOP:', error)
      return NextResponse.json({ error: 'Failed to update SOP' }, { status: 500 })
    }

    // Create version record if content changed
    if (contentChanged || titleChanged) {
      await supabase
        .from('sop_versions')
        .insert({
          sop_id: params.id,
          version: newVersion,
          title: updates.title || currentSop.title,
          content: updates.content || currentSop.content,
          created_by: user.id,
          changes_summary: body.changes_summary || 'Updated content'
        })
    }

    return NextResponse.json({ sop })
  } catch (error) {
    console.error('Error updating SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Check if SOP exists and user has permission
    const { data: sop, error: fetchError } = await supabase
      .from('sops')
      .select('id, created_by, status')
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    // Only allow deletion if user is creator and SOP is draft, or user is admin
    const canDelete = sop.created_by === user.id && sop.status === 'draft'
    if (!canDelete) {
      // Check if user is admin (you may want to adjust this logic based on your role system)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userData || userData.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Only creators can delete draft SOPs or admins can delete any SOP' 
        }, { status: 403 })
      }
    }

    // Delete related records first (cascade would handle this in production)
    await supabase.from('sop_comments').delete().eq('sop_id', params.id)
    await supabase.from('sop_training_records').delete().eq('sop_id', params.id)
    await supabase.from('sop_versions').delete().eq('sop_id', params.id)

    // Delete SOP
    const { error } = await supabase
      .from('sops')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', organization.id)

    if (error) {
      console.error('Error deleting SOP:', error)
      return NextResponse.json({ error: 'Failed to delete SOP' }, { status: 500 })
    }

    return NextResponse.json({ message: 'SOP deleted successfully' })
  } catch (error) {
    console.error('Error deleting SOP:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}