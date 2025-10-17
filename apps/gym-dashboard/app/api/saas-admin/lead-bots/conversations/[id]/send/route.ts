import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/saas-admin/lead-bots/conversations/[id]/send
 * Send a manual message to a lead (staff override)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Get conversation details
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('ai_agent_conversations')
      .select('organization_id, metadata')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // Insert message as assistant (staff response)
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('ai_agent_messages')
      .insert({
        conversation_id: id,
        role: 'assistant',
        content: message.trim(),
        metadata: {
          sent_by: 'staff_manual',
          manual_override: true,
        },
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Update conversation updated_at
    await supabaseAdmin
      .from('ai_agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    // TODO: Send actual message to lead via Twilio/GoHighLevel
    // For now, just log it
    console.log('[Manual Message] Sent to conversation:', id, 'Message:', message);

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error: any) {
    console.error('[Send Message API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
