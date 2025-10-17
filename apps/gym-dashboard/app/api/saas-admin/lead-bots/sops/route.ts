import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAuthWithOptionalOrg } from '@/app/lib/api/auth-check-admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/sops
 * List all SOPs for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    // Fetch all platform-wide SOPs (global SOPs with NULL organization_id)
    const { data: sops, error } = await supabaseAdmin
      .from('sops')
      .select('id, name, description, content, created_by, created_at, updated_at')
      .is('organization_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SOPs API] Error fetching SOPs:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      sops: sops || [],
      total: sops?.length || 0,
    });
  } catch (error: any) {
    console.error('[SOPs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SOPs', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saas-admin/lead-bots/sops
 * Create a new SOP
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, content } = body;

    // Validate required fields
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: name, content' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Create platform-wide SOP (organization_id is NULL for global SOPs)
    const { data: sop, error } = await supabaseAdmin
      .from('sops')
      .insert({
        organization_id: null, // Global/platform-wide SOP
        name,
        description,
        content,
        created_by: null, // No user tracking for now
      })
      .select('id, name, description, content, created_at, updated_at')
      .single();

    if (error) {
      console.error('[Create SOP] Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'SOP created successfully',
      sop,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Create SOP API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create SOP', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/saas-admin/lead-bots/sops
 * Update an existing SOP
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;

    // Update the platform-wide SOP
    const { data: sop, error } = await supabaseAdmin
      .from('sops')
      .update(updateData)
      .eq('id', id)
      .is('organization_id', null) // Only update global SOPs
      .select('id, name, description, content, created_at, updated_at')
      .single();

    if (error) {
      console.error('[Update SOP] Database error:', error);
      throw error;
    }

    if (!sop) {
      return NextResponse.json(
        { error: 'SOP not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SOP updated successfully',
      sop,
    });
  } catch (error: any) {
    console.error('[Update SOP API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update SOP', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saas-admin/lead-bots/sops
 * Delete an SOP
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Delete the platform-wide SOP (CASCADE will delete agent_sops links)
    const { error } = await supabaseAdmin
      .from('sops')
      .delete()
      .eq('id', id)
      .is('organization_id', null); // Only delete global SOPs

    if (error) {
      console.error('[Delete SOP] Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'SOP deleted successfully',
    });
  } catch (error: any) {
    console.error('[Delete SOP API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete SOP', details: error.message },
      { status: 500 }
    );
  }
}
