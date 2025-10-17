import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createAdminClient();
    const membershipId = '8ec0ba9e-d936-422e-9111-8473da51217c'; // From the booking
    
    // Check if this membership exists
    const { data: membership, error } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .eq('id', membershipId)
      .single();
    
    // Check Sam's customer ID
    const { data: sam } = await supabase
      .from('leads')
      .select('*')
      .eq('id', '65bca601-ae69-41da-88dd-fe2c08ac6859') // From the booking
      .single();
    
    // Check all memberships for Sam
    const { data: samMemberships } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .eq('customer_id', '65bca601-ae69-41da-88dd-fe2c08ac6859');
    
    return NextResponse.json({
      bookingMembershipId: membershipId,
      membershipExists: !!membership,
      membership,
      sam,
      samMemberships,
      error
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}