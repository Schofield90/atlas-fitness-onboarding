import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '../../../lib/supabase/database.types';

// GET /api/team-chat/search - Search messages
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const channelId = searchParams.get('channel_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Build base query - only search in channels the user has access to
    let searchQuery = supabase
      .from('team_messages')
      .select(`
        *,
        user:users(id, full_name, avatar_url, email),
        team_channels!inner(
          id,
          name,
          description,
          is_private,
          team_channel_members!inner(user_id)
        )
      `)
      .eq('organization_id', orgMember.org_id)
      .eq('team_channels.team_channel_members.user_id', user.id)
      .ilike('content', `%${query.trim()}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by specific channel if provided
    if (channelId) {
      searchQuery = searchQuery.eq('channel_id', channelId);
    }

    const { data: messages, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Error searching messages:', searchError);
      return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('team_messages')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgMember.org_id)
      .ilike('content', `%${query.trim()}%`);

    if (channelId) {
      countQuery = countQuery.eq('channel_id', channelId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting search results:', countError);
    }

    // Format results
    const results = messages?.map(message => ({
      ...message,
      channel: {
        id: (message as any).team_channels.id,
        name: (message as any).team_channels.name,
        description: (message as any).team_channels.description,
        is_private: (message as any).team_channels.is_private
      },
      // Remove the nested team_channels object
      team_channels: undefined
    })) || [];

    return NextResponse.json({
      results,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      },
      query: query.trim()
    });

  } catch (error) {
    console.error('Error in GET /api/team-chat/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/team-chat/search - Advanced search with filters
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      query, 
      channel_ids, 
      user_ids, 
      message_types,
      date_from, 
      date_to, 
      has_attachments,
      limit = 20,
      offset = 0
    } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Build advanced search query
    let searchQuery = supabase
      .from('team_messages')
      .select(`
        *,
        user:users(id, full_name, avatar_url, email),
        team_channels!inner(
          id,
          name,
          description,
          is_private,
          team_channel_members!inner(user_id)
        ),
        team_message_attachments(
          id,
          file_name,
          file_type
        )
      `)
      .eq('organization_id', orgMember.org_id)
      .eq('team_channels.team_channel_members.user_id', user.id)
      .ilike('content', `%${query.trim()}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (channel_ids && channel_ids.length > 0) {
      searchQuery = searchQuery.in('channel_id', channel_ids);
    }

    if (user_ids && user_ids.length > 0) {
      searchQuery = searchQuery.in('user_id', user_ids);
    }

    if (message_types && message_types.length > 0) {
      searchQuery = searchQuery.in('message_type', message_types);
    }

    if (date_from) {
      searchQuery = searchQuery.gte('created_at', date_from);
    }

    if (date_to) {
      searchQuery = searchQuery.lte('created_at', date_to);
    }

    const { data: messages, error: searchError } = await searchQuery;

    if (searchError) {
      console.error('Error in advanced search:', searchError);
      return NextResponse.json({ error: 'Failed to search messages' }, { status: 500 });
    }

    // Filter by attachments if specified
    let filteredMessages = messages || [];
    if (has_attachments !== undefined) {
      filteredMessages = filteredMessages.filter(message => {
        const hasAttach = (message as any).team_message_attachments?.length > 0;
        return has_attachments ? hasAttach : !hasAttach;
      });
    }

    // Format results
    const results = filteredMessages.map(message => ({
      ...message,
      channel: {
        id: (message as any).team_channels.id,
        name: (message as any).team_channels.name,
        description: (message as any).team_channels.description,
        is_private: (message as any).team_channels.is_private
      },
      attachments: (message as any).team_message_attachments || [],
      // Remove nested objects
      team_channels: undefined,
      team_message_attachments: undefined
    }));

    // Note: For simplicity, we're not doing an exact count for advanced search
    // In production, you'd want to optimize this with a proper count query
    const estimatedTotal = results.length;

    return NextResponse.json({
      results,
      pagination: {
        total: estimatedTotal,
        limit,
        offset,
        has_more: results.length >= limit
      },
      query: query.trim(),
      filters_applied: {
        channel_ids: channel_ids || [],
        user_ids: user_ids || [],
        message_types: message_types || [],
        date_from,
        date_to,
        has_attachments
      }
    });

  } catch (error) {
    console.error('Error in POST /api/team-chat/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}