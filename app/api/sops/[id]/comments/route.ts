import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOPCommentInsert } from '@/app/lib/types/sop'

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

    // Verify SOP exists and belongs to organization
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (sopError || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    // Get comments with user info and replies
    const { data: comments, error } = await supabase
      .from('sop_comments')
      .select(`
        *,
        user:users(id, name, email),
        replies:sop_comments!parent_comment_id(
          *,
          user:users(id, name, email)
        )
      `)
      .eq('sop_id', params.id)
      .is('parent_comment_id', null) // Only get top-level comments
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({
      comments: comments || []
    })
  } catch (error) {
    console.error('Error in comments GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { content, parent_comment_id } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Verify SOP exists and belongs to organization
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (sopError || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    // If this is a reply, verify parent comment exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('sop_comments')
        .select('id')
        .eq('id', parent_comment_id)
        .eq('sop_id', params.id)
        .single()

      if (parentError || !parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    // Create comment
    const commentData: SOPCommentInsert = {
      sop_id: params.id,
      user_id: user.id,
      content: content.trim(),
      parent_comment_id: parent_comment_id || null
    }

    const { data: comment, error } = await supabase
      .from('sop_comments')
      .insert(commentData)
      .select(`
        *,
        user:users(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    return NextResponse.json({ 
      comment 
    }, { status: 201 })
  } catch (error) {
    console.error('Error in comments POST:', error)
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const commentId = url.searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    // Verify comment exists and user owns it or is admin
    const { data: comment, error: fetchError } = await supabase
      .from('sop_comments')
      .select('id, user_id, sop_id')
      .eq('id', commentId)
      .eq('sop_id', params.id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check permission (user owns comment or is admin)
    if (comment.user_id !== user.id) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userData || userData.role !== 'admin') {
        return NextResponse.json({ 
          error: 'You can only delete your own comments' 
        }, { status: 403 })
      }
    }

    // Delete comment and its replies
    const { error } = await supabase
      .from('sop_comments')
      .delete()
      .or(`id.eq.${commentId},parent_comment_id.eq.${commentId}`)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error in comments DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}