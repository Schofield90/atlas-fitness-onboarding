import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendWaiverNotification } from '@/lib/services/notification-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { waiverId } = await request.json();

    if (!waiverId) {
      return NextResponse.json(
        { error: 'Waiver ID is required' },
        { status: 400 }
      );
    }

    // Get the current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Verify the client belongs to the user's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify the waiver exists and belongs to the organization
    const { data: waiver, error: waiverError } = await supabase
      .from('waivers')
      .select('id, title, content, version')
      .eq('id', waiverId)
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single();

    if (waiverError || !waiver) {
      return NextResponse.json(
        { error: 'Waiver not found or inactive' },
        { status: 404 }
      );
    }

    // Check if the client already has this waiver assigned
    const { data: existingWaiver } = await supabase
      .from('customer_waivers')
      .select('id')
      .eq('customer_id', params.id)
      .eq('waiver_id', waiverId)
      .single();

    if (existingWaiver) {
      return NextResponse.json(
        { error: 'Waiver already assigned to this client' },
        { status: 400 }
      );
    }

    // Create a pending waiver assignment (not signed yet)
    const { data: newWaiverAssignment, error: assignmentError } = await supabase
      .from('pending_waiver_assignments')
      .insert({
        organization_id: profile.organization_id,
        client_id: params.id,
        waiver_id: waiverId,
        assigned_by: user.id,
        status: 'pending',
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating waiver assignment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to assign waiver' },
        { status: 500 }
      );
    }

    // Send push notification to client
    try {
      const notificationSent = await sendWaiverNotification(client, waiver, profile.organization_id);
      console.log(`Notification ${notificationSent ? 'sent successfully' : 'failed to send'} to ${client.name}`);
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      assignment: newWaiverAssignment,
      message: 'Waiver assigned successfully and notification sent'
    });

  } catch (error) {
    console.error('Error assigning waiver:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
