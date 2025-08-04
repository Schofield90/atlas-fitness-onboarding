import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const organizationId = searchParams.get('organizationId');
    
    // Get class session with bookings
    const { data: session, error: sessionError } = await supabase
      .from('class_sessions')
      .select(`
        *,
        bookings(*)
      `)
      .eq('id', sessionId || '00000000-0000-0000-0000-000000000000')
      .single();
    
    // Get all bookings for this session
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('class_session_id', sessionId || '00000000-0000-0000-0000-000000000000');
    
    // Get all classes for the organization
    const { data: allClasses, error: classesError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        start_time,
        bookings(id)
      `)
      .eq('organization_id', organizationId || '00000000-0000-0000-0000-000000000000')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });
    
    return NextResponse.json({
      sessionId,
      organizationId,
      session: session ? {
        id: session.id,
        start_time: session.start_time,
        bookingsCount: session.bookings?.length || 0,
        bookings: session.bookings
      } : null,
      directBookings: {
        count: bookings?.length || 0,
        bookings
      },
      allClasses: allClasses?.map(cls => ({
        id: cls.id,
        start_time: cls.start_time,
        bookingsCount: cls.bookings?.length || 0
      })),
      errors: {
        sessionError,
        bookingsError,
        classesError
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}