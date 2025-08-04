import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createAdminClient();
    
    // Use Sam's first client ID
    const samClientId = '1c7255f6-ba26-4258-8693-379ce97732ed';
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    // Check if membership already exists
    const { data: existing } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_id', samClientId)
      .eq('status', 'active');
    
    if (existing && existing.length > 0) {
      return NextResponse.json({
        message: 'Sam already has an active membership',
        membership: existing[0]
      });
    }
    
    // Get the first membership plan
    const { data: plans } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1);
    
    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: 'No active membership plans found' }, { status: 400 });
    }
    
    // Create membership for Sam
    const { data: newMembership, error } = await supabase
      .from('customer_memberships')
      .insert({
        organization_id: organizationId,
        customer_id: samClientId,
        membership_plan_id: plans[0].id,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Membership created for Sam Schofield',
      membership: newMembership
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}