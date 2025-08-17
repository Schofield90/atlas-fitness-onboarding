import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

interface RecurringClassRequest {
  classSessionId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0=Sunday, 6=Saturday
  endDate?: string;
  maxOccurrences?: number;
}

// Simple recurrence generator without external dependencies
function generateRecurrences(
  startDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number,
  endDate: Date,
  maxOccurrences: number,
  daysOfWeek?: number[]
): Date[] {
  const occurrences: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  while (currentDate <= endDate && count < maxOccurrences) {
    if (frequency === 'daily') {
      occurrences.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + interval);
      count++;
    } else if (frequency === 'weekly') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // Generate for specific days of week
        for (let i = 0; i < 7 * interval; i++) {
          if (daysOfWeek.includes(currentDate.getDay())) {
            occurrences.push(new Date(currentDate));
            count++;
            if (count >= maxOccurrences) break;
          }
          currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate > endDate) break;
        }
      } else {
        // Simple weekly recurrence
        occurrences.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        count++;
      }
    } else if (frequency === 'monthly') {
      occurrences.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + interval);
      count++;
    }
  }

  return occurrences;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get recurring sessions
    let query = supabase
      .from('class_sessions')
      .select('*')
      .eq('is_recurring', true);

    if (sessionId) {
      query = query.eq('parent_session_id', sessionId);
    }

    if (startDate && endDate) {
      query = query
        .gte('start_time', startDate)
        .lte('start_time', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: data });
  } catch (error: any) {
    console.error('Error fetching recurring classes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body: RecurringClassRequest = await request.json();
    
    const {
      classSessionId,
      frequency,
      interval = 1,
      daysOfWeek,
      endDate,
      maxOccurrences = 52
    } = body;

    // Get the original session
    const { data: originalSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', classSessionId)
      .single();

    if (sessionError || !originalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate occurrences
    const startDate = new Date(originalSession.start_time);
    const endDateTime = endDate ? new Date(endDate) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default
    
    const occurrences = generateRecurrences(
      startDate,
      frequency,
      interval,
      endDateTime,
      maxOccurrences,
      daysOfWeek
    );

    // Calculate duration
    const duration = new Date(originalSession.end_time).getTime() - new Date(originalSession.start_time).getTime();

    // Create recurring sessions
    const sessions = occurrences.slice(1).map(date => ({ // Skip first as it's the original
      ...originalSession,
      id: undefined, // Let DB generate new ID
      parent_session_id: classSessionId,
      is_recurring: true,
      start_time: date.toISOString(),
      end_time: new Date(date.getTime() + duration).toISOString(),
      occurrence_date: date.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert all sessions
    const { data: createdSessions, error: insertError } = await supabase
      .from('class_sessions')
      .insert(sessions)
      .select();

    if (insertError) throw insertError;

    // Update original session
    await supabase
      .from('class_sessions')
      .update({
        is_recurring: true,
        recurrence_rule: `${frequency.toUpperCase()};INTERVAL=${interval}`,
        recurrence_end_date: endDateTime.toISOString()
      })
      .eq('id', classSessionId);

    return NextResponse.json({
      message: 'Recurring classes created successfully',
      count: createdSessions?.length || 0,
      sessions: createdSessions
    });
  } catch (error: any) {
    console.error('Error creating recurring classes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { sessionId, updates, updateSeries } = await request.json();

    if (updateSeries) {
      // Update all sessions in the series
      const { error } = await supabase
        .from('class_sessions')
        .update(updates)
        .or(`id.eq.${sessionId},parent_session_id.eq.${sessionId}`);

      if (error) throw error;

      return NextResponse.json({ message: 'Series updated successfully' });
    } else {
      // Update single occurrence
      const { error } = await supabase
        .from('class_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;

      return NextResponse.json({ message: 'Session updated successfully' });
    }
  } catch (error: any) {
    console.error('Error updating recurring class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { sessionId, deleteSeries } = await request.json();

    if (deleteSeries) {
      // Delete all sessions in the series
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .or(`id.eq.${sessionId},parent_session_id.eq.${sessionId}`);

      if (error) throw error;

      return NextResponse.json({ message: 'Series deleted successfully' });
    } else {
      // Delete single occurrence
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      return NextResponse.json({ message: 'Session deleted successfully' });
    }
  } catch (error: any) {
    console.error('Error deleting recurring class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}