import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * PATCH /api/saas-admin/lead-bots/templates/[id]
 * Update a task template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabaseAdmin = createAdminClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.task_title_template !== undefined) updateData.task_title_template = body.task_title_template;
    if (body.task_instructions_template !== undefined) updateData.task_instructions_template = body.task_instructions_template;
    if (body.schedule_delay_minutes !== undefined) updateData.schedule_delay_minutes = body.schedule_delay_minutes;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const { error } = await supabaseAdmin
      .from('ai_agent_task_templates')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
    });
  } catch (error: any) {
    console.error('[Update Template API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update template', details: error.message },
      { status: 500 }
    );
  }
}
