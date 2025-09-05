import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let query = supabase
      .from('conversations')
      .select(`
        id,
        title,
        status,
        last_message_at,
        created_at,
        client_id,
        coach_id,
        clients!conversations_client_id_fkey (
          id,
          name,
          email
        ),
        users!conversations_coach_id_fkey (
          id,
          name,
          email
        ),
        messages!messages_conversation_id_fkey (
          id,
          content,
          sender_type,
          created_at,
          read_at
        )
      `)
      .eq('organization_id', userOrg.organization_id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Transform data to include last message and unread count
    const conversationsWithDetails = conversations?.map(conv => {
      const lastMessage = conv.messages?.[0];
      const unreadCount = conv.messages?.filter(m => !m.read_at && m.sender_type === 'client').length || 0;
      
      return {
        ...conv,
        last_message: lastMessage?.content || '',
        last_message_at: lastMessage?.created_at || conv.last_message_at,
        unread_count: unreadCount,
        messages: undefined // Remove messages from response to reduce payload
      };
    }) || [];

    return NextResponse.json({
      conversations: conversationsWithDetails,
      total: conversationsWithDetails.length
    });

  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, title } = await request.json();

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify client belongs to the organization
    const { data: client } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Use the stored function to get or create conversation
    const { data: conversationResult, error: conversationError } = await supabase
      .rpc('get_or_create_conversation', {
        p_organization_id: userOrg.organization_id,
        p_client_id: client_id,
        p_coach_id: session.user.id
      });

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Fetch the complete conversation data
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        status,
        last_message_at,
        created_at,
        clients!conversations_client_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', conversationResult)
      .single();

    return NextResponse.json({ conversation }, { status: 201 });

  } catch (error) {
    console.error('Error in conversations POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}