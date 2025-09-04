import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createAdminClient();
    
    // The correct Sam ID that has the membership
    const correctSamId = '65bca601-ae69-41da-88dd-fe2c08ac6859';
    
    // Update Sam's status to 'converted' so he appears in searches
    const { error: statusError } = await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', correctSamId);
    
    if (statusError) {
      return NextResponse.json({ error: 'Failed to update Sam status', details: statusError });
    }
    
    // Clean up the old client records that are no longer needed
    const { error: deleteError } = await supabase
      .from('clients')
      .delete()
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    // Verify the fix
    const { data: samLead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', correctSamId)
      .single();
    
    const { data: samMembership } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*)
      `)
      .eq('customer_id', correctSamId)
      .single();
    
    return NextResponse.json({
      success: true,
      message: 'Sam has been fixed!',
      sam: samLead,
      membership: samMembership
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}