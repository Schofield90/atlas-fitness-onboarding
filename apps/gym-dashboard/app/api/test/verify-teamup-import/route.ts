/**
 * TEST ENDPOINT: Verify TeamUp Import
 *
 * This endpoint verifies that the TeamUp import fixes are working correctly
 * by querying the database directly using admin client.
 *
 * PUBLIC ENDPOINT - No auth required (for testing only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4'; // Sam's organization

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: any = {
      timestamp: new Date().toISOString(),
      organizationId: ORG_ID,
    };

    // 1. Check class_types
    const { data: classTypes, error: typesError, count: typesCount } = await supabaseAdmin
      .from('class_types')
      .select('id, name, created_at', { count: 'exact' })
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    results.classTypes = {
      total: typesCount,
      sample: classTypes?.map(t => ({ name: t.name, id: t.id })) || [],
      error: typesError?.message,
    };

    // 2. Check class_schedules with day_of_week
    const { data: schedules, error: schedulesError, count: schedulesCount } = await supabaseAdmin
      .from('class_schedules')
      .select('id, class_type_id, day_of_week, start_time, end_time, instructor_name, room_location', { count: 'exact' })
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    results.classSchedules = {
      total: schedulesCount,
      sample: schedules?.map(s => ({
        day: days[s.day_of_week] || `INVALID(${s.day_of_week})`,
        time: `${s.start_time}-${s.end_time}`,
        instructor: s.instructor_name || 'TBD',
        location: s.room_location || 'Unknown',
      })) || [],
      error: schedulesError?.message,
    };

    // 3. Check for NULL day_of_week (CRITICAL BUG CHECK)
    const { data: invalidSchedules, error: validationError } = await supabaseAdmin
      .from('class_schedules')
      .select('id')
      .eq('organization_id', ORG_ID)
      .is('day_of_week', null);

    results.validation = {
      invalidSchedules: invalidSchedules?.length || 0,
      error: validationError?.message,
    };

    // 4. Check class_sessions
    const { data: sessions, error: sessionsError, count: sessionsCount } = await supabaseAdmin
      .from('class_sessions')
      .select('id, name, start_time, instructor_name, location', { count: 'exact' })
      .eq('organization_id', ORG_ID)
      .gte('start_time', new Date().toISOString()) // Future sessions only
      .order('start_time', { ascending: true })
      .limit(10);

    results.classSessions = {
      totalFuture: sessionsCount,
      sample: sessions?.map(s => {
        const date = new Date(s.start_time);
        return {
          name: s.name,
          date: date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
          time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          instructor: s.instructor_name || 'TBD',
        };
      }) || [],
      error: sessionsError?.message,
    };

    // 5. Check session date range
    const { data: dateRange, error: dateError } = await supabaseAdmin
      .from('class_sessions')
      .select('start_time')
      .eq('organization_id', ORG_ID)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (dateRange && dateRange.length > 0) {
      const firstDate = new Date(dateRange[0].start_time);
      const lastDate = new Date(dateRange[dateRange.length - 1].start_time);
      const daysDiff = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

      results.sessionDateRange = {
        firstSession: firstDate.toLocaleDateString('en-GB'),
        lastSession: lastDate.toLocaleDateString('en-GB'),
        spanDays: daysDiff,
        error: dateError?.message,
      };
    }

    // 6. Success criteria validation
    const validation = {
      classTypes: {
        expected: '30+',
        actual: typesCount || 0,
        pass: (typesCount || 0) >= 30,
      },
      schedules: {
        expected: '40+',
        actual: schedulesCount || 0,
        pass: (schedulesCount || 0) >= 40,
      },
      sessions: {
        expected: '120+ (3+ weeks)',
        actual: sessionsCount || 0,
        pass: (sessionsCount || 0) >= 120,
      },
      dayOfWeek: {
        expected: '0 NULL values',
        actual: invalidSchedules?.length || 0,
        pass: (invalidSchedules?.length || 0) === 0,
      },
    };

    const allPassed = Object.values(validation).every(v => v.pass);

    return NextResponse.json({
      success: allPassed,
      timestamp: results.timestamp,
      organizationId: results.organizationId,
      data: results,
      validation,
      summary: {
        classTypesCreated: typesCount || 0,
        schedulesCreated: schedulesCount || 0,
        sessionsCreated: sessionsCount || 0,
        invalidSchedules: invalidSchedules?.length || 0,
      },
      nextSteps: allPassed
        ? [
            'Navigate to: https://login.gymleadhub.co.uk/dashboard/classes',
            'Verify classes appear in calendar',
            'Check random samples for correct day/time/instructor',
          ]
        : [
            'Check the validation section above for failures',
            'Re-run TeamUp PDF import',
            'Check deployment logs for errors',
          ],
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Verification failed',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
