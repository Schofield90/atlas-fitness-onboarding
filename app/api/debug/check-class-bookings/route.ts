import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || '63589490-8f55-4157-bd3a-e141594b740e';
    
    const supabase = await createClient();
    
    // Get classes with different query approaches
    console.log('Fetching classes for organization:', organizationId);
    
    // Method 1: Basic query
    const { data: basicClasses, error: basicError } = await supabase
      .from('class_sessions')
      .select('id, start_time, capacity')
      .eq('organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .limit(5);
    
    // Method 2: With bookings count
    const { data: classesWithCount } = await supabase
      .from('class_sessions')
      .select('id, start_time, capacity, bookings(count)')
      .eq('organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .limit(5);
    
    // Method 3: With full bookings
    const { data: classesWithBookings, error: bookingsError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        start_time,
        capacity,
        program:programs(name),
        bookings(*)
      `)
      .eq('organization_id', organizationId)
      .gte('start_time', new Date().toISOString())
      .limit(5);
    
    // Method 4: Manual booking count
    let manualCounts = {};
    if (basicClasses) {
      for (const cls of basicClasses) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('class_session_id', cls.id);
        manualCounts[cls.id] = count || 0;
      }
    }
    
    return NextResponse.json({
      organizationId,
      basicClasses: basicClasses?.map(c => ({
        ...c,
        manualBookingCount: manualCounts[c.id]
      })),
      classesWithCount,
      classesWithBookings: classesWithBookings?.map(c => ({
        id: c.id,
        start_time: c.start_time,
        capacity: c.capacity,
        program: Array.isArray(c.program) ? c.program[0]?.name : c.program?.name,
        bookingsArray: Array.isArray(c.bookings),
        bookingsLength: c.bookings?.length || 0,
        bookings: c.bookings
      })),
      errors: {
        basicError,
        bookingsError
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}