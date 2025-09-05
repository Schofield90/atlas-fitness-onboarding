import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        organization_id,
        client_id,
        coach_id
      `)
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user has access to this organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('organization_id', conversation.organization_id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        sender_type,
        message_type,
        read_at,
        created_at,
        users!messages_sender_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Mark messages as read if they're from the client and current user is coach
    if (conversation.coach_id === session.user.id) {
      const unreadClientMessages = messages?.filter(m => 
        m.sender_type === 'client' && !m.read_at
      ).map(m => m.id) || [];

      if (unreadClientMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadClientMessages);
      }
    }

    return NextResponse.json({
      messages: messages || [],
      conversation_id: conversationId
    });

  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { content, message_type = 'text' } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        organization_id,
        client_id,
        coach_id
      `)
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check if user has access to this organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('organization_id', conversation.organization_id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Determine sender type based on user's role in the conversation
    const senderType = conversation.coach_id === session.user.id ? 'coach' : 'client';

    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        sender_type: senderType,
        content: content.trim(),
        message_type
      })
      .select(`
        id,
        content,
        sender_id,
        sender_type,
        message_type,
        read_at,
        created_at,
        users!messages_sender_id_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}