import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Get current week range
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - dayOfWeek); // Start of week (Sunday)
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6); // End of week (Saturday)
    end.setHours(23, 59, 59, 999);
    
    console.log('Checking week:', start.toISOString(), 'to', end.toISOString());
    
    // Get all bookings
    const { data: allBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        class_session:class_sessions(
          id,
          start_time,
          instructor_name,
          program:programs(name)
        )
      `)
      .order('created_at', { ascending: false });
    
    // Get classes for current week
    const { data: weekClasses } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name),
        bookings(*)
      `)
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time');
    
    // Find classes with bookings
    const classesWithBookings = weekClasses?.filter(c => c.bookings && c.bookings.length > 0) || [];
    
    return NextResponse.json({
      currentWeek: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      bookings: {
        total: allBookings?.length || 0,
        recent: allBookings?.slice(0, 5).map(b => ({
          id: b.id,
          classId: b.class_session_id,
          customerId: b.customer_id,
          createdAt: b.created_at,
          classTime: b.class_session?.start_time,
          className: b.class_session?.program ? (Array.isArray(b.class_session.program) ? b.class_session.program[0]?.name : b.class_session.program?.name) : undefined
        }))
      },
      weekClasses: {
        total: weekClasses?.length || 0,
        withBookings: classesWithBookings.length,
        classes: classesWithBookings.map(c => ({
          id: c.id,
          startTime: c.start_time,
          day: new Date(c.start_time).toLocaleDateString('en-US', { weekday: 'short' }),
          time: new Date(c.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          program: Array.isArray(c.program) ? c.program[0]?.name : c.program?.name,
          bookingsCount: c.bookings?.length || 0
        }))
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}