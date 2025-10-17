import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/saas-admin/lead-bots/conversations/[id]/toggle-ai
 * Enable or disable AI for a specific conversation (manual override)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    const supabaseAdmin = createAdminClient();

    // Update conversation metadata to track AI status
    const { error } = await supabaseAdmin
      .from('ai_agent_conversations')
      .update({
        metadata: {
          ai_enabled: enabled,
          manual_override: !enabled,
          manual_override_at: !enabled ? new Date().toISOString() : null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `AI ${enabled ? 'enabled' : 'disabled'} for conversation`,
    });
  } catch (error: any) {
    console.error('[Toggle AI API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle AI', details: error.message },
      { status: 500 }
    );
  }
}
