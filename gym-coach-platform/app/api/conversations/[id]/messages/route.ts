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

    // Check if user has access (either as coach/owner or as the client)
    let hasAccess = false;
    
    // Check if user is a coach/owner in the organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('organization_id', conversation.organization_id)
      .single();

    if (userOrg) {
      hasAccess = true;
    } else {
      // Check if user is the client in the conversation
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('id', conversation.client_id)
        .single();

      if (client) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
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

    // Check if user is either a coach/owner or a client
    let hasAccess = false;
    let senderType: 'coach' | 'client' = 'coach';
    let senderId = session.user.id;

    // First check if user is a coach/owner in the organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .eq('organization_id', conversation.organization_id)
      .single();

    if (userOrg) {
      hasAccess = true;
      senderType = 'coach';
      senderId = session.user.id;
    } else {
      // Check if user is the client in the conversation
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('id', conversation.client_id)
        .single();

      if (client) {
        hasAccess = true;
        senderType = 'client';
        senderId = client.id; // Use client.id as sender_id for clients
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId, // Use the correct sender_id (client.id for clients, user.id for coaches)
        sender_type: senderType,
        content: content.trim(),
        message_type,
        organization_id: conversation.organization_id,
        client_id: conversation.client_id
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