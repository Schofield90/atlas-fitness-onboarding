import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Find Wednesday August 6, 2025 classes
    const startOfDay = new Date('2025-08-06T00:00:00Z');
    const endOfDay = new Date('2025-08-06T23:59:59Z');
    
    // Get all classes for that day
    const { data: wednesdayClasses, error: classError } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name),
        bookings(*)
      `)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time');
    
    // Get all bookings for those class IDs
    const classIds = wednesdayClasses?.map(c => c.id) || [];
    const { data: directBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('class_session_id', classIds);
    
    // Get the most recent booking
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select(`
        *,
        class_session:class_sessions(
          start_time,
          program:programs(name)
        ),
        customer:leads(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      targetDate: 'Wednesday, August 6, 2025',
      wednesdayClasses: wednesdayClasses?.map(c => ({
        id: c.id,
        time: new Date(c.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        program: c.program?.name,
        bookingsFromRelation: c.bookings?.length || 0,
        bookingsData: c.bookings
      })),
      directBookingsCount: directBookings?.length || 0,
      directBookings: directBookings?.map(b => ({
        id: b.id,
        classId: b.class_session_id,
        customerId: b.customer_id,
        createdAt: b.created_at
      })),
      recentBookings: recentBookings?.map(b => ({
        id: b.id,
        customerName: b.customer?.name,
        className: b.class_session?.program?.name,
        classTime: b.class_session?.start_time,
        createdAt: b.created_at
      })),
      error: classError
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}