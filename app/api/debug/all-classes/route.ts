import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    
    // Get total count
    const { count } = await supabase
      .from('class_sessions')
      .select('*', { count: 'exact', head: true });
    
    // Get a sample of classes
    const { data: classes } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name),
        bookings(id)
      `)
      .order('start_time', { ascending: false })
      .limit(10);
    
    // Get programs
    const { data: programs } = await supabase
      .from('programs')
      .select('*')
      .limit(10);
    
    return NextResponse.json({
      totalClasses: count,
      sampleClasses: classes?.map(c => ({
        id: c.id,
        programName: c.program?.name,
        startTime: c.start_time,
        organizationId: c.organization_id,
        instructor: c.instructor_name,
        bookings: c.bookings?.length || 0
      })),
      totalPrograms: programs?.length || 0,
      programs: programs
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}