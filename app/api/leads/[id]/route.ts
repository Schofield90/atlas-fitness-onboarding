import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/leads/[id] - Get a specific lead
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        assigned_user:user_profiles!assigned_to(full_name, email, avatar_url),
        activities:lead_activities(
          id,
          type,
          subject,
          content,
          outcome,
          created_at,
          user:user_profiles(full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching lead:', error);
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error in GET /api/leads/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/leads/[id] - Update a lead
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      source,
      status,
      interests,
      goals,
      budget_range,
      preferred_contact_method,
      assigned_to,
      next_follow_up,
      notes,
      tags,
      user_id // For activity tracking
    } = body;

    // Get the current lead data
    const { data: currentLead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Update the lead
    const updateData = {
      first_name,
      last_name,
      email,
      phone,
      source,
      status,
      interests,
      goals,
      budget_range,
      preferred_contact_method,
      assigned_to,
      next_follow_up,
      notes,
      tags,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from('leads')
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead:', updateError);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    // Track status changes
    if (status && status !== currentLead.status) {
      await supabaseAdmin
        .from('lead_activities')
        .insert([{
          lead_id: id,
          user_id,
          type: 'status_change',
          subject: 'Status Changed',
          content: `Status changed from ${currentLead.status} to ${status}`,
          metadata: { 
            previous_status: currentLead.status, 
            new_status: status 
          }
        }]);
    }

    // Track assignment changes
    if (assigned_to && assigned_to !== currentLead.assigned_to) {
      await supabaseAdmin
        .from('lead_activities')
        .insert([{
          lead_id: id,
          user_id,
          type: 'assignment',
          subject: 'Lead Assigned',
          content: `Lead assigned to new team member`,
          metadata: { 
            previous_assigned_to: currentLead.assigned_to, 
            new_assigned_to: assigned_to 
          }
        }]);
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error in PUT /api/leads/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/leads/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}