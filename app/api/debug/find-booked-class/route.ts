import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const targetClassId = '06923cb5-fc5d-4482-8a23-d1866012e079';
    
    // Find the specific class
    const { data: targetClass, error: classError } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name),
        bookings(*)
      `)
      .eq('id', targetClassId)
      .single();
    
    // Get all classes with bookings > 0
    const { data: classesWithBookings } = await supabase
      .from('class_sessions')
      .select(`
        id,
        start_time,
        organization_id,
        bookings(id)
      `)
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');
    
    // Filter to only show classes that have bookings
    const bookedClasses = classesWithBookings?.filter(c => c.bookings && c.bookings.length > 0) || [];
    
    // Get date range of all classes
    const { data: dateRange } = await supabase
      .from('class_sessions')
      .select('start_time')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('start_time', { ascending: true })
      .limit(1);
      
    const { data: latestClass } = await supabase
      .from('class_sessions')
      .select('start_time')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .order('start_time', { ascending: false })
      .limit(1);
    
    return NextResponse.json({
      targetClass: targetClass ? {
        id: targetClass.id,
        start_time: targetClass.start_time,
        organization_id: targetClass.organization_id,
        bookingsCount: targetClass.bookings?.length || 0,
        program: Array.isArray(targetClass.program) ? targetClass.program[0]?.name : targetClass.program?.name
      } : null,
      classesWithBookings: bookedClasses.map(c => ({
        id: c.id,
        start_time: c.start_time,
        bookingsCount: c.bookings?.length || 0
      })),
      totalClassesWithBookings: bookedClasses.length,
      dateRange: {
        earliest: dateRange?.[0]?.start_time,
        latest: latestClass?.[0]?.start_time,
        currentTime: new Date().toISOString()
      },
      error: classError
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}