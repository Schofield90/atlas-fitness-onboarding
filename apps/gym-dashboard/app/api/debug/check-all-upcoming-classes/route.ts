import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const now = new Date();
    
    // Get ALL upcoming classes from ALL organizations
    const { data: allClasses, error } = await supabase
      .from('class_sessions')
      .select(`
        *,
        program:programs(name),
        bookings(id)
      `)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(20);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Group by organization
    const classesByOrg: any = {};
    allClasses?.forEach(cls => {
      if (!classesByOrg[cls.organization_id]) {
        classesByOrg[cls.organization_id] = [];
      }
      classesByOrg[cls.organization_id].push({
        id: cls.id,
        programName: cls.program?.name || 'No program',
        startTime: cls.start_time,
        instructor: cls.instructor_name,
        location: cls.location,
        capacity: cls.capacity,
        bookings: cls.bookings?.length || 0,
        organizationId: cls.organization_id
      });
    });
    
    // Also get the organizations
    const orgIds = Object.keys(classesByOrg);
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);
    
    const orgMap: any = {};
    orgs?.forEach(org => {
      orgMap[org.id] = org.name;
    });
    
    return NextResponse.json({
      currentTime: now.toISOString(),
      totalUpcomingClasses: allClasses?.length || 0,
      organizations: orgIds.map(id => ({
        id,
        name: orgMap[id] || 'Unknown',
        classCount: classesByOrg[id].length,
        classes: classesByOrg[id]
      })),
      allClassesRaw: allClasses
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}