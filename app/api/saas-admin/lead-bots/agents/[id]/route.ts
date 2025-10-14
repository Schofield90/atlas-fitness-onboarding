import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * PATCH /api/saas-admin/lead-bots/agents/[id]
 * Update an AI agent configuration
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
    if (body.system_prompt !== undefined) updateData.system_prompt = body.system_prompt;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.max_tokens !== undefined) updateData.max_tokens = body.max_tokens;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const { error } = await supabaseAdmin
      .from('ai_agents')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Agent updated successfully',
    });
  } catch (error: any) {
    console.error('[Update Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent', details: error.message },
      { status: 500 }
    );
  }
}
