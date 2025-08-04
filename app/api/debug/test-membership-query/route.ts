import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    const supabase = await createClient();
    
    const results: any = {};
    
    // 1. Direct query to customer_memberships
    const { data: direct, error: directError } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', customerId || '9433c71d-2c3f-4d99-b254-68ae5b56978a'); // Sam's ID from earlier
    
    results.directQuery = {
      data: direct,
      error: directError?.message,
      count: direct?.length || 0
    };
    
    // 2. Query with joins (same as modal)
    const { data: withJoins, error: joinError } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .eq('customer_id', customerId || '9433c71d-2c3f-4d99-b254-68ae5b56978a')
      .in('status', ['active', 'paused']);
    
    results.withJoins = {
      data: withJoins,
      error: joinError?.message,
      count: withJoins?.length || 0
    };
    
    // 3. Check if this ID exists in leads
    const { data: leadCheck } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('id', customerId || '9433c71d-2c3f-4d99-b254-68ae5b56978a');
    
    results.leadExists = {
      exists: leadCheck && leadCheck.length > 0,
      data: leadCheck
    };
    
    // 4. Check all memberships (no filter)
    const { data: allMemberships, count } = await supabase
      .from('customer_memberships')
      .select('customer_id, status', { count: 'exact' })
      .limit(20);
    
    results.allMembershipsPreview = {
      totalCount: count,
      sample: allMemberships
    };
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}