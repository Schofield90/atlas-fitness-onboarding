import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leads/[id]/activities - Get lead activities
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: activities, error } = await supabaseAdmin
      .from('lead_activities')
      .select(`
        *,
        user:user_profiles(full_name, avatar_url)
      `)
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching lead activities:', error);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error in GET /api/leads/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/leads/[id]/activities - Create new activity
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
    const validTypes = ['call', 'email', 'sms', 'whatsapp', 'meeting', 'note', 'status_change', 'assignment', 'ai_qualification'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid activity type' 
      }, { status: 400 });
    }

    // Create the activity
    const activityData = {
      lead_id: id,
      user_id,
      type,
      subject,
      content,
      outcome,
      metadata
    };

    const { data: activity, error: insertError } = await supabaseAdmin
      .from('lead_activities')
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

    // Update lead's last_contacted timestamp for contact activities
    const contactTypes = ['call', 'email', 'sms', 'whatsapp', 'meeting'];
    if (contactTypes.includes(type)) {
      await supabaseAdmin
        .from('leads')
        .update({
          last_contacted: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in POST /api/leads/[id]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}