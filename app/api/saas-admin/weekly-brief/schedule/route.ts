import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import cron from 'cron-parser';

const ADMIN_EMAILS = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk'];

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase client is created inside the handlers

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('brief_schedules')
      .select('*')
      .order('created_at', { ascending: false });

    if (schedulesError) {
      throw schedulesError;
    }

    return NextResponse.json({ schedules });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, cronSchedule, recipients, isActive } = await request.json();

    // Validate cron expression
    try {
      const interval = cron.parseExpression(cronSchedule);
      const nextRun = interval.next().toDate();

      // Create schedule
      const { data: schedule, error: createError } = await supabase
        .from('brief_schedules')
        .insert({
          name,
          cron_schedule: cronSchedule,
          recipients,
          is_active: isActive !== false,
          next_run_at: nextRun.toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({ 
        success: true, 
        schedule,
        message: 'Schedule created successfully'
      });

    } catch (cronError) {
      return NextResponse.json(
        { error: 'Invalid cron expression' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, name, cronSchedule, recipients, isActive } = await request.json();

    // Validate cron expression if provided
    let nextRun;
    if (cronSchedule) {
      try {
        const interval = cron.parseExpression(cronSchedule);
        nextRun = interval.next().toDate();
      } catch (cronError) {
        return NextResponse.json(
          { error: 'Invalid cron expression' },
          { status: 400 }
        );
      }
    }

    // Update schedule
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (cronSchedule !== undefined) {
      updateData.cron_schedule = cronSchedule;
      updateData.next_run_at = nextRun!.toISOString();
    }
    if (recipients !== undefined) updateData.recipients = recipients;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data: schedule, error: updateError } = await supabase
      .from('brief_schedules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      schedule,
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization
    if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('brief_schedules')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}