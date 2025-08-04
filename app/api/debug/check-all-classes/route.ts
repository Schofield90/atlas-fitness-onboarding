import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Get all class sessions regardless of organization or time
    const { data: allClasses, error: classError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        organization_id,
        start_time,
        capacity,
        instructor_name,
        program:programs(name),
        bookings(*)
      `)
      .order('start_time', { ascending: false })
      .limit(10);
    
    // Get all organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name');
    
    // Get the specific class we know has a booking
    const { data: specificClass } = await supabase
      .from('class_sessions')
      .select(`
        *,
        bookings(*),
        program:programs(name)
      `)
      .eq('id', '06923cb5-fc5d-4482-8a23-d1866012e079')
      .single();
    
    // Get current time for comparison
    const now = new Date();
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      organizations: orgs,
      specificClass: specificClass ? {
        id: specificClass.id,
        organization_id: specificClass.organization_id,
        start_time: specificClass.start_time,
        isInFuture: new Date(specificClass.start_time) > now,
        bookingsCount: specificClass.bookings?.length || 0,
        program: specificClass.program?.name
      } : null,
      allClasses: allClasses?.map(c => ({
        id: c.id,
        organization_id: c.organization_id,
        start_time: c.start_time,
        isInFuture: new Date(c.start_time) > now,
        instructor: c.instructor_name,
        capacity: c.capacity,
        bookingsCount: c.bookings?.length || 0,
        program: c.program?.name
      })),
      errors: {
        classError,
        orgError
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}