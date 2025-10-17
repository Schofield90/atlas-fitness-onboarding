import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/conversations
 * List all AI agent conversations with lead details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgFilter = searchParams.get('org');
    const statusFilter = searchParams.get('status');

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('ai_agent_conversations')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        metadata,
        organization_id,
        organizations!inner(name),
        ai_agents!inner(enabled)
      `)
      .order('updated_at', { ascending: false });

    if (orgFilter) {
      query = query.eq('organization_id', orgFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: conversations, error } = await query;

    if (error) throw error;

    // Get message counts for each conversation
    const conversationIds = conversations?.map(c => c.id) || [];
    const { data: messageCounts } = await supabaseAdmin
      .from('ai_agent_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((msg: any) => {
          counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
        });
        return { data: counts };
      });

    // Get latest message timestamp for each conversation
    const { data: latestMessages } = await supabaseAdmin
      .from('ai_agent_messages')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    const latestMessageMap: Record<string, string> = {};
    latestMessages?.forEach((msg: any) => {
      if (!latestMessageMap[msg.conversation_id]) {
        latestMessageMap[msg.conversation_id] = msg.created_at;
      }
    });

    // Transform to frontend format
    const transformedConversations = (conversations || []).map((conv: any) => {
      const leadName = conv.metadata?.contact_name || conv.title || 'Unknown Lead';
      const leadEmail = conv.metadata?.contact_email || '';
      const leadPhone = conv.metadata?.contact_phone || '';

      return {
        id: conv.id,
        leadName,
        leadEmail,
        leadPhone,
        organizationName: conv.organizations?.name || 'Unknown',
        status: conv.status,
        createdAt: conv.created_at,
        lastMessageAt: latestMessageMap[conv.id] || conv.updated_at,
        messageCount: messageCounts?.[conv.id] || 0,
        aiEnabled: conv.ai_agents?.enabled || false,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: transformedConversations,
      total: transformedConversations.length,
    });
  } catch (error: any) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    );
  }
}
