import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getUserAndOrganization } from '@/app/lib/auth-utils';
import { RRule } from 'rrule';

interface RecurringClassRequest {
  classSessionId: string;
  recurrenceRule: string; // RRULE string
  endDate?: string;
  maxOccurrences?: number;
}

interface RecurringClassInstance {
  original_session_id: string;
  start_time: string;
  end_time: string;
  occurrence_date: string;
  program_id: string;
  trainer_id?: string;
  name?: string;
  description?: string;
  max_capacity: number;
  room_location?: string;
  organization_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: RecurringClassRequest = await request.json();
    const { classSessionId, recurrenceRule, endDate, maxOccurrences } = body;

    // Get the original class session
    const { data: originalSession, error: sessionError } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', classSessionId)
      .eq('organization_id', organization.id)
      .single();

    if (sessionError || !originalSession) {
      return NextResponse.json({ error: 'Class session not found' }, { status: 404 });
    }

    // Parse the RRULE
    const rule = RRule.fromString(recurrenceRule);
    const startDate = new Date(originalSession.start_time);
    const sessionDuration = new Date(originalSession.end_time).getTime() - new Date(originalSession.start_time).getTime();

    // Generate occurrences
    const until = endDate ? new Date(endDate) : undefined;
    const occurrences = rule.between(startDate, until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), true);

    // Limit occurrences if specified
    const limitedOccurrences = maxOccurrences 
      ? occurrences.slice(0, maxOccurrences)
      : occurrences;

    // Update original session with recurrence info
    const { error: updateError } = await supabase
      .from('class_sessions')
      .update({
        is_recurring: true,
        recurrence_rule: recurrenceRule,
        recurrence_end_date: endDate || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', classSessionId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update original session' }, { status: 500 });
    }

    // Create recurring instances (skip the first one as it's the original)
    const instances: RecurringClassInstance[] = limitedOccurrences.slice(1).map(occurrence => {
      const newStartTime = new Date(occurrence);
      const newEndTime = new Date(occurrence.getTime() + sessionDuration);

      return {
        original_session_id: classSessionId,
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        occurrence_date: occurrence.toISOString().split('T')[0],
        program_id: originalSession.program_id,
        trainer_id: originalSession.trainer_id,
        name: originalSession.name,
        description: originalSession.description,
        max_capacity: originalSession.max_capacity,
        room_location: originalSession.room_location,
        organization_id: organization.id
      };
    });

    // Insert all instances in a batch
    if (instances.length > 0) {
      const { error: insertError } = await supabase
        .from('class_sessions')
        .insert(instances.map(instance => ({
          ...instance,
          parent_session_id: classSessionId,
          is_recurring: false, // These are instances, not the main recurring session
          session_status: 'scheduled',
          current_bookings: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })));

      if (insertError) {
        console.error('Error creating recurring instances:', insertError);
        return NextResponse.json({ error: 'Failed to create recurring instances' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${instances.length} recurring instances`,
      occurrences: limitedOccurrences.length,
      instances: instances.length
    });

  } catch (error) {
    console.error('Error creating recurring classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const classSessionId = url.searchParams.get('classSessionId');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');

    if (classSessionId) {
      // Get specific recurring class and its instances
      const { data: recurringSession, error: sessionError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('id', classSessionId)
        .eq('organization_id', organization.id)
        .eq('is_recurring', true)
        .single();

      if (sessionError || !recurringSession) {
        return NextResponse.json({ error: 'Recurring class not found' }, { status: 404 });
      }

      const { data: instances, error: instancesError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          programs:program_id (
            name,
            program_type
          ),
          staff:trainer_id (
            name,
            email
          )
        `)
        .eq('parent_session_id', classSessionId)
        .eq('organization_id', organization.id)
        .order('start_time', { ascending: true });

      if (instancesError) {
        return NextResponse.json({ error: 'Failed to fetch instances' }, { status: 500 });
      }

      return NextResponse.json({
        recurringSession,
        instances: instances || [],
        total: (instances || []).length
      });
    } else {
      // Get all recurring classes
      let query = supabase
        .from('class_sessions')
        .select(`
          *,
          programs:program_id (
            name,
            program_type
          ),
          staff:trainer_id (
            name,
            email
          )
        `)
        .eq('organization_id', organization.id)
        .eq('is_recurring', true);

      if (fromDate) {
        query = query.gte('start_time', fromDate);
      }

      if (toDate) {
        query = query.lte('start_time', toDate);
      }

      const { data: recurringClasses, error } = await query.order('start_time', { ascending: true });

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch recurring classes' }, { status: 500 });
      }

      return NextResponse.json({
        recurringClasses: recurringClasses || [],
        total: (recurringClasses || []).length
      });
    }

  } catch (error) {
    console.error('Error fetching recurring classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classSessionId, updateType, ...updates } = body;

    if (updateType === 'single') {
      // Update only this instance
      const { error } = await supabase
        .from('class_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', classSessionId)
        .eq('organization_id', organization.id);

      if (error) {
        return NextResponse.json({ error: 'Failed to update class instance' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Class instance updated' });

    } else if (updateType === 'all') {
      // Update the recurring session and all future instances
      const { data: recurringSession } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('id', classSessionId)
        .single();

      if (!recurringSession) {
        return NextResponse.json({ error: 'Recurring session not found' }, { status: 404 });
      }

      // Update the main recurring session
      const { error: updateRecurringError } = await supabase
        .from('class_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', classSessionId);

      if (updateRecurringError) {
        return NextResponse.json({ error: 'Failed to update recurring session' }, { status: 500 });
      }

      // Update all future instances
      const { error: updateInstancesError } = await supabase
        .from('class_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('parent_session_id', classSessionId)
        .gte('start_time', new Date().toISOString());

      if (updateInstancesError) {
        return NextResponse.json({ error: 'Failed to update future instances' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Recurring series updated' });
    }

    return NextResponse.json({ error: 'Invalid update type' }, { status: 400 });

  } catch (error) {
    console.error('Error updating recurring classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const classSessionId = url.searchParams.get('classSessionId');
    const deleteType = url.searchParams.get('deleteType') || 'single';

    if (!classSessionId) {
      return NextResponse.json({ error: 'Missing classSessionId' }, { status: 400 });
    }

    if (deleteType === 'single') {
      // Delete only this instance
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', classSessionId)
        .eq('organization_id', organization.id);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete class instance' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Class instance deleted' });

    } else if (deleteType === 'all') {
      // Delete the recurring session and all instances
      const { error: deleteInstancesError } = await supabase
        .from('class_sessions')
        .delete()
        .eq('parent_session_id', classSessionId);

      if (deleteInstancesError) {
        return NextResponse.json({ error: 'Failed to delete recurring instances' }, { status: 500 });
      }

      const { error: deleteRecurringError } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', classSessionId)
        .eq('organization_id', organization.id);

      if (deleteRecurringError) {
        return NextResponse.json({ error: 'Failed to delete recurring session' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Recurring series deleted' });
    }

    return NextResponse.json({ error: 'Invalid delete type' }, { status: 400 });

  } catch (error) {
    console.error('Error deleting recurring classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}