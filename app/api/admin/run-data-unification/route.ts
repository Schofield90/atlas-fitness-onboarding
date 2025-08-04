import { NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createAdminClient();
    const results: any = {
      steps: []
    };
    
    // Step 1: Check current state
    const { data: samRecords } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    const { data: samClients } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    results.steps.push({
      step: 'Initial state',
      samInLeads: samRecords?.length || 0,
      samInClients: samClients?.length || 0
    });
    
    // Step 2: If Sam doesn't exist in leads, create from clients data
    if ((!samRecords || samRecords.length === 0) && samClients && samClients.length > 0) {
      const samClient = samClients[0]; // Take the first one
      
      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          id: samClient.id,
          organization_id: samClient.organization_id,
          name: samClient.name,
          first_name: samClient.first_name,
          last_name: samClient.last_name,
          email: samClient.email,
          phone: samClient.phone,
          status: 'client',
          tags: samClient.tags || [],
          created_at: samClient.created_at,
          updated_at: samClient.updated_at
        })
        .select()
        .single();
      
      if (leadError) {
        results.steps.push({
          step: 'Create Sam in leads',
          error: leadError.message
        });
      } else {
        results.steps.push({
          step: 'Create Sam in leads',
          success: true,
          leadId: newLead.id
        });
      }
    }
    
    // Step 3: Consolidate duplicate Sam records
    const { data: allSams } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .order('created_at', { ascending: true });
    
    if (allSams && allSams.length > 1) {
      const primarySam = allSams[0];
      const duplicateIds = allSams.slice(1).map(s => s.id);
      
      // Update all memberships to point to primary Sam
      const { error: membershipUpdateError } = await supabase
        .from('customer_memberships')
        .update({ customer_id: primarySam.id })
        .in('customer_id', duplicateIds);
      
      // Update all bookings to point to primary Sam
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update({ customer_id: primarySam.id })
        .in('customer_id', duplicateIds);
      
      // Archive duplicate records
      const { error: archiveError } = await supabase
        .from('leads')
        .update({ 
          status: 'lost',
          notes: `Archived as duplicate of ${primarySam.id} on ${new Date().toISOString()}`
        })
        .in('id', duplicateIds);
      
      results.steps.push({
        step: 'Consolidate duplicates',
        primaryId: primarySam.id,
        duplicatesArchived: duplicateIds.length,
        errors: {
          membership: membershipUpdateError?.message,
          booking: bookingUpdateError?.message,
          archive: archiveError?.message
        }
      });
    }
    
    // Step 4: Create a membership for Sam if none exists
    const { data: finalSam } = await supabase
      .from('leads')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .eq('status', 'client')
      .single();
    
    if (finalSam) {
      // Check if Sam has a membership
      const { data: existingMembership } = await supabase
        .from('customer_memberships')
        .select('*')
        .eq('customer_id', finalSam.id)
        .eq('status', 'active')
        .single();
      
      if (!existingMembership) {
        // Get a membership plan
        const { data: plan } = await supabase
          .from('membership_plans')
          .select('*')
          .eq('organization_id', finalSam.organization_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (plan) {
          const { data: newMembership, error: membershipError } = await supabase
            .from('customer_memberships')
            .insert({
              organization_id: finalSam.organization_id,
              customer_id: finalSam.id,
              membership_plan_id: plan.id,
              status: 'active',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            .select()
            .single();
          
          results.steps.push({
            step: 'Create membership',
            success: !membershipError,
            membership: newMembership,
            error: membershipError?.message
          });
        }
      } else {
        results.steps.push({
          step: 'Membership check',
          message: 'Sam already has an active membership',
          membership: existingMembership
        });
      }
    }
    
    // Final state
    const { data: finalLeads } = await supabase
      .from('leads')
      .select('id, name, email, status')
      .eq('email', 'samschofield90@hotmail.co.uk');
    
    const { data: finalMemberships } = await supabase
      .from('customer_memberships')
      .select(`
        *,
        membership_plan:membership_plans(*),
        customer:leads(*)
      `)
      .eq('customer_id', finalSam?.id);
    
    results.finalState = {
      samRecords: finalLeads,
      activeMemberships: finalMemberships
    };
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      details: error 
    }, { status: 500 });
  }
}