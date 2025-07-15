import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Schema for client_activities table is in supabase-client-management-schema.sql

// GET /api/clients/[id]/activities - Get client activities
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');

    let query = supabaseAdmin
      .from('client_activities')
      .select(`
        *,
        user:user_profiles(full_name, avatar_url)
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply type filter
    if (type) {
      query = query.eq('type', type);
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching client activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error in GET /api/clients/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients/[id]/activities - Create new activity
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      user_id,
      type,
      subject,
      content,
      outcome,
      metadata = {}
    } = body;

    // Validate required fields
    if (!user_id || !type || !content) {
      return NextResponse.json({ 
        error: 'User ID, type, and content are required' 
      }, { status: 400 });
    }

    // Validate activity type
    const validTypes = [
      'check_in', 'check_out', 'membership_created', 'membership_updated', 
      'payment', 'status_change', 'assignment', 'note', 'goal_update', 
      'measurement', 'workout_completed'
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid activity type' 
      }, { status: 400 });
    }

    // Create the activity
    const activityData = {
      client_id: id,
      user_id,
      type,
      subject,
      content,
      outcome,
      metadata
    };

    const { data: activity, error: insertError } = await supabaseAdmin
      .from('client_activities')
      .insert([activityData])
      .select(`
        *,
        user:user_profiles(full_name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating activity:', insertError);
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in POST /api/clients/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}