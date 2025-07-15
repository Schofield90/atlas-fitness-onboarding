import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Schema for client_visits table is in supabase-client-management-schema.sql

// POST /api/clients/[id]/check-in - Check in a client
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { notes, user_id } = body;

    // Get client information
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        memberships!inner(
          id,
          status,
          class_limit,
          classes_used,
          plan:membership_plans(
            name,
            class_limit
          )
        )
      `)
      .eq('id', id)
      .eq('memberships.status', 'active')
      .single();

    if (clientError) {
      return NextResponse.json({ error: 'Client not found or no active membership' }, { status: 404 });
    }

    // Check if client status is active
    if (client.status !== 'active') {
      return NextResponse.json({ error: 'Client account is not active' }, { status: 400 });
    }

    // Check if client is already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingVisit } = await supabaseAdmin
      .from('client_visits')
      .select('id, check_out_time')
      .eq('client_id', id)
      .eq('visit_date', today)
      .is('check_out_time', null)
      .single();

    if (existingVisit) {
      return NextResponse.json({ error: 'Client is already checked in today' }, { status: 400 });
    }

    // Check class limits if applicable
    const membership = client.memberships[0];
    if (membership.plan.class_limit && membership.classes_used >= membership.plan.class_limit) {
      return NextResponse.json({ 
        error: 'Class limit reached for this membership' 
      }, { status: 400 });
    }

    // Create the check-in visit
    const visitData = {
      client_id: id,
      visit_date: today,
      check_in_time: new Date().toTimeString().split(' ')[0],
      notes,
    };

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('client_visits')
      .insert([visitData])
      .select()
      .single();

    if (visitError) {
      console.error('Error creating visit:', visitError);
      return NextResponse.json({ error: 'Failed to check in client' }, { status: 500 });
    }

    // Update client's last visit
    await supabaseAdmin
      .from('clients')
      .update({
        last_visit: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Increment class usage if applicable
    if (membership.plan.class_limit) {
      await supabaseAdmin
        .from('memberships')
        .update({
          classes_used: membership.classes_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membership.id);
    }

    // Create activity record
    if (user_id) {
      await supabaseAdmin
        .from('client_activities')
        .insert([{
          client_id: id,
          user_id,
          type: 'check_in',
          subject: 'Client Check-in',
          content: `Client checked in at ${visitData.check_in_time}`,
          metadata: {
            visit_id: visit.id,
            visit_date: today,
            check_in_time: visitData.check_in_time,
            classes_used: membership.classes_used + 1,
            class_limit: membership.plan.class_limit,
          },
        }]);
    }

    return NextResponse.json({ 
      visit,
      message: 'Client checked in successfully',
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        membership: membership.plan.name,
        classes_used: membership.classes_used + 1,
        class_limit: membership.plan.class_limit,
      }
    });
  } catch (error) {
    console.error('Error in client check-in:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id]/check-in - Check out a client
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { notes, user_id } = body;

    // Find today's check-in record
    const today = new Date().toISOString().split('T')[0];
    const { data: visit, error: visitError } = await supabaseAdmin
      .from('client_visits')
      .select('*')
      .eq('client_id', id)
      .eq('visit_date', today)
      .is('check_out_time', null)
      .single();

    if (visitError) {
      return NextResponse.json({ error: 'No active check-in found for today' }, { status: 404 });
    }

    // Calculate duration
    const checkInTime = new Date(`${today}T${visit.check_in_time}`);
    const checkOutTime = new Date();
    const durationMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));

    // Update the visit with check-out information
    const { data: updatedVisit, error: updateError } = await supabaseAdmin
      .from('client_visits')
      .update({
        check_out_time: checkOutTime.toTimeString().split(' ')[0],
        duration_minutes: durationMinutes,
        notes: notes || visit.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visit.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating visit:', updateError);
      return NextResponse.json({ error: 'Failed to check out client' }, { status: 500 });
    }

    // Create activity record
    if (user_id) {
      await supabaseAdmin
        .from('client_activities')
        .insert([{
          client_id: id,
          user_id,
          type: 'check_out',
          subject: 'Client Check-out',
          content: `Client checked out after ${durationMinutes} minutes`,
          metadata: {
            visit_id: visit.id,
            visit_date: today,
            check_in_time: visit.check_in_time,
            check_out_time: updatedVisit.check_out_time,
            duration_minutes: durationMinutes,
          },
        }]);
    }

    return NextResponse.json({ 
      visit: updatedVisit,
      message: 'Client checked out successfully',
      duration_minutes: durationMinutes,
    });
  } catch (error) {
    console.error('Error in client check-out:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/clients/[id]/check-in - Get client's visit history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('client_visits')
      .select('*')
      .eq('client_id', id)
      .order('visit_date', { ascending: false })
      .order('check_in_time', { ascending: false });

    // Apply date filters
    if (startDate) {
      query = query.gte('visit_date', startDate);
    }
    if (endDate) {
      query = query.lte('visit_date', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: visits, error } = await query;

    if (error) {
      console.error('Error fetching visit history:', error);
      return NextResponse.json({ error: 'Failed to fetch visit history' }, { status: 500 });
    }

    // Get statistics
    const { data: stats } = await supabaseAdmin
      .from('client_visits')
      .select('id, duration_minutes, visit_date')
      .eq('client_id', id)
      .gte('visit_date', startDate || '2024-01-01')
      .lte('visit_date', endDate || new Date().toISOString().split('T')[0]);

    const totalVisits = stats?.length || 0;
    const totalDuration = stats?.reduce((sum, visit) => sum + (visit.duration_minutes || 0), 0) || 0;
    const averageDuration = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

    return NextResponse.json({
      visits,
      statistics: {
        total_visits: totalVisits,
        total_duration_minutes: totalDuration,
        average_duration_minutes: averageDuration,
      },
      pagination: {
        page,
        limit,
        total: totalVisits,
        totalPages: Math.ceil(totalVisits / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/clients/[id]/check-in:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}