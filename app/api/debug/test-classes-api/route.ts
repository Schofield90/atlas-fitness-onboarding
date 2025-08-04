import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Same query as the classes API
    const { data: classes, error } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name, description, price_pennies),
        bookings(*)
      `)
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: true });
    
    return NextResponse.json({
      organizationId,
      classCount: classes?.length || 0,
      classes: classes?.map(c => ({
        id: c.id,
        start_time: c.start_time,
        program: Array.isArray(c.program) ? c.program[0]?.name : c.program?.name,
        bookingsArray: Array.isArray(c.bookings),
        bookingsCount: c.bookings?.length || 0,
        bookings: c.bookings,
        rawClass: c
      })),
      error
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}