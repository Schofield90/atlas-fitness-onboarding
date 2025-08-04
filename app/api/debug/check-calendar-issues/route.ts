import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = await createAdminClient();
    
    // Get classes in date range
    const { data: classes, error: classError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        start_time,
        instructor_name,
        capacity,
        program:programs(name)
      `)
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .gte('start_time', startDate || new Date().toISOString())
      .lte('start_time', endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time');
    
    // Check Sam's data
    const { data: sam } = await supabase
      .from('leads')
      .select('*')
      .ilike('name', '%sam%schofield%')
      .single();
    
    let samMemberships = null;
    if (sam) {
      const { data: memberships } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership_plan:membership_plans(*)
        `)
        .eq('customer_id', sam.id);
      samMemberships = memberships;
    }
    
    // Group classes by day
    const classesByDay = classes?.reduce((acc, cls) => {
      const date = new Date(cls.start_time);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (!acc[day]) acc[day] = [];
      acc[day].push({
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        program: cls.program?.name,
        instructor: cls.instructor_name
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    return NextResponse.json({
      dateRange: {
        start: startDate,
        end: endDate,
        classCount: classes?.length || 0
      },
      classesByDay,
      sam: sam ? {
        id: sam.id,
        name: sam.name,
        memberships: samMemberships,
        membershipCount: samMemberships?.length || 0,
        activeMemberships: samMemberships?.filter((m: any) => m.status === 'active').length || 0
      } : null,
      rawClasses: classes
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}