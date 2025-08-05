import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' });
    }
    
    // Check both tables
    const { data: userOrgs } = await adminSupabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id);
      
    const { data: orgUsers } = await adminSupabase
      .from('organization_users')
      .select('*')
      .eq('user_id', user.id);
    
    // Get organizations owned by user
    const { data: ownedOrgs } = await adminSupabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id);
    
    // Now check for classes in these organizations
    const orgIds = [
      ...(userOrgs?.map(o => o.organization_id) || []),
      ...(orgUsers?.map(o => o.organization_id) || []),
      ...(ownedOrgs?.map(o => o.id) || [])
    ];
    
    const uniqueOrgIds = [...new Set(orgIds)];
    
    // Get classes for each org
    const classesPerOrg: any = {};
    for (const orgId of uniqueOrgIds) {
      const { data: classes, count } = await adminSupabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: false })
        .eq('organization_id', orgId)
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(5);
        
      classesPerOrg[orgId] = {
        count: count,
        upcomingClasses: classes
      };
    }
    
    return NextResponse.json({
      userId: user.id,
      userOrganizations: userOrgs,
      organizationUsers: orgUsers,
      ownedOrganizations: ownedOrgs,
      uniqueOrgIds,
      classesPerOrg,
      atlasOrgId: '63589490-8f55-4157-bd3a-e141594b748e'
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}