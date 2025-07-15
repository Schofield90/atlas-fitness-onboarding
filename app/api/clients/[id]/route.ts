import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/clients/[id] - Get a specific client with full details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        assigned_trainer_info:user_profiles!assigned_trainer(full_name, email, avatar_url),
        memberships(
          id,
          status,
          start_date,
          end_date,
          monthly_price,
          billing_date,
          last_payment_date,
          next_payment_date,
          classes_used,
          guest_passes_used,
          notes,
          created_at,
          updated_at,
          plan:membership_plans(
            id,
            name,
            description,
            price,
            billing_cycle,
            features,
            access_level,
            class_limit,
            guest_passes
          )
        ),
        lead:leads(
          id,
          source,
          qualification_score,
          created_at as lead_created_at,
          utm_source,
          utm_medium,
          utm_campaign
        ),
        visits:client_visits(
          id,
          visit_date,
          check_in_time,
          check_out_time,
          duration_minutes,
          notes,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching client:', error);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error in GET /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id] - Update client information
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
      date_of_birth,
      gender,
      address,
      city,
      postcode,
      country,
      emergency_name,
      emergency_phone,
      emergency_relationship,
      medical_conditions,
      medications,
      fitness_level,
      goals,
      status,
      assigned_trainer,
      notes,
      tags,
      user_id, // For activity tracking
    } = body;

    // Get the current client data
    const { data: currentClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Update the client
    const updateData = {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      postcode,
      country,
      emergency_name,
      emergency_phone,
      emergency_relationship,
      medical_conditions,
      medications,
      fitness_level,
      goals,
      status,
      assigned_trainer,
      notes,
      tags,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    );

    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update(cleanUpdateData)
      .eq('id', id)
      .select(`
        *,
        assigned_trainer_info:user_profiles!assigned_trainer(full_name, email, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Error updating client:', updateError);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    // Create activity records for significant changes
    const activities = [];

    if (status && status !== currentClient.status) {
      activities.push({
        client_id: id,
        user_id,
        type: 'status_change',
        subject: 'Client Status Changed',
        content: `Status changed from ${currentClient.status} to ${status}`,
        metadata: {
          previous_status: currentClient.status,
          new_status: status,
        },
      });
    }

    if (assigned_trainer && assigned_trainer !== currentClient.assigned_trainer) {
      activities.push({
        client_id: id,
        user_id,
        type: 'assignment',
        subject: 'Trainer Assignment Changed',
        content: `Trainer assignment updated`,
        metadata: {
          previous_trainer: currentClient.assigned_trainer,
          new_trainer: assigned_trainer,
        },
      });
    }

    if (activities.length > 0) {
      await supabaseAdmin
        .from('client_activities')
        .insert(activities);
    }

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    console.error('Error in PUT /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Delete a client (soft delete by setting status to cancelled)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const hard_delete = searchParams.get('hard_delete') === 'true';

    if (hard_delete) {
      // Hard delete - completely remove from database
      const { error } = await supabaseAdmin
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting client:', error);
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
      }
    } else {
      // Soft delete - set status to cancelled
      const { error } = await supabaseAdmin
        .from('clients')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error cancelling client:', error);
        return NextResponse.json({ error: 'Failed to cancel client' }, { status: 500 });
      }

      // Also cancel active memberships
      await supabaseAdmin
        .from('memberships')
        .update({
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', id)
        .eq('status', 'active');
    }

    return NextResponse.json({ 
      message: hard_delete ? 'Client deleted successfully' : 'Client cancelled successfully' 
    });
  } catch (error) {
    console.error('Error in DELETE /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}