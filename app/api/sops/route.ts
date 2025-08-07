import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOPInsert, SOPFilters, SOPWithDetails } from '@/app/lib/types/sop'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const category = url.searchParams.get('category')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const tags = url.searchParams.get('tags')?.split(',').filter(Boolean)
    const training_required = url.searchParams.get('training_required')

    const offset = (page - 1) * limit

    // Build query with filters
    let query = supabase
      .from('sops')
      .select(`
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email),
        approver:users!sops_approved_by_fkey(id, name, email),
        training_stats:sop_training_records(count)
      `)
      .eq('organization_id', organization.id)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (training_required !== null) {
      query = query.eq('training_required', training_required === 'true')
    }
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // Execute query with pagination
    const { data: sops, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching SOPs:', error)
      return NextResponse.json({ error: 'Failed to fetch SOPs' }, { status: 500 })
    }

    // Get categories for filter options
    const { data: categories } = await supabase
      .from('sop_categories')
      .select('*')
      .eq('organization_id', organization.id)
      .order('sort_order')

    return NextResponse.json({
      sops: sops || [],
      categories: categories || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error in SOPs GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const {
      title,
      content,
      description,
      category,
      tags = [],
      content_type = 'markdown',
      training_required = false,
      effective_date,
      review_date
    }: SOPInsert = body

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, content, category' 
      }, { status: 400 })
    }

    // Check if category exists, create if not
    const { data: existingCategory } = await supabase
      .from('sop_categories')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('name', category)
      .single()

    if (!existingCategory) {
      await supabase
        .from('sop_categories')
        .insert({
          organization_id: organization.id,
          name: category,
          sort_order: 0
        })
    }

    // Insert new SOP
    const { data: sop, error } = await supabase
      .from('sops')
      .insert({
        organization_id: organization.id,
        title,
        content,
        description,
        category,
        tags,
        version: 1,
        status: 'draft',
        created_by: user.id,
        content_type,
        training_required,
        effective_date,
        review_date
      })
      .select(`
        *,
        category_info:sop_categories(name, color, icon),
        creator:users!sops_created_by_fkey(id, name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating SOP:', error)
      return NextResponse.json({ error: 'Failed to create SOP' }, { status: 500 })
    }

    // Create initial version record
    await supabase
      .from('sop_versions')
      .insert({
        sop_id: sop.id,
        version: 1,
        title,
        content,
        created_by: user.id,
        changes_summary: 'Initial version'
      })

    return NextResponse.json({ sop }, { status: 201 })
  } catch (error) {
    console.error('Error in SOPs POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}