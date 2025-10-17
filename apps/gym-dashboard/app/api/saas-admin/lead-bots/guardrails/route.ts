import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/guardrails
 * List all guardrails across all organizations (saas-admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('guardrails')
      .select(`
        id,
        name,
        description,
        type,
        config,
        enabled,
        organization_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    // Filter by organization if specified
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: guardrails, error } = await query;

    if (error) {
      console.error('[Guardrails API] Error fetching guardrails:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: guardrails || [],
      total: guardrails?.length || 0,
    });
  } catch (error: any) {
    console.error('[Guardrails API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guardrails', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saas-admin/lead-bots/guardrails
 * Create a new guardrail
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, config, enabled, organizationId } = body;

    // Validate required fields
    if (!name || !type || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, organizationId' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Create guardrail
    const { data: guardrail, error } = await supabaseAdmin
      .from('guardrails')
      .insert({
        organization_id: organizationId,
        name,
        description,
        type,
        config: config || {},
        enabled: enabled !== undefined ? enabled : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Create Guardrail] Database error:', error);

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A guardrail with this name already exists in this organization' },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Guardrail created successfully',
      data: guardrail,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Create Guardrail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create guardrail', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/saas-admin/lead-bots/guardrails
 * Update an existing guardrail
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, config, enabled } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (config !== undefined) updateData.config = config;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Update the guardrail
    const { data: guardrail, error } = await supabaseAdmin
      .from('guardrails')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Update Guardrail] Database error:', error);

      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A guardrail with this name already exists in this organization' },
          { status: 409 }
        );
      }

      throw error;
    }

    if (!guardrail) {
      return NextResponse.json(
        { error: 'Guardrail not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Guardrail updated successfully',
      data: guardrail,
    });
  } catch (error: any) {
    console.error('[Update Guardrail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update guardrail', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saas-admin/lead-bots/guardrails
 * Delete a guardrail
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

    // Delete the guardrail (CASCADE will delete agent_guardrails links)
    const { error } = await supabaseAdmin
      .from('guardrails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Guardrail] Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Guardrail deleted successfully',
    });
  } catch (error: any) {
    console.error('[Delete Guardrail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete guardrail', details: error.message },
      { status: 500 }
    );
  }
}
