import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * GET /api/saas-admin/lead-bots/bookings
 * List all sales call bookings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgFilter = searchParams.get('org');
    const statusFilter = searchParams.get('status');

    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin
      .from('sales_call_bookings')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        call_type,
        status,
        outcome,
        notes,
        phone_number,
        lead_id,
        organization_id,
        staff_member_id,
        leads!inner(name, email, phone),
        organizations!inner(name),
        users(email)
      `)
      .order('scheduled_at', { ascending: false });

    if (orgFilter) {
      query = query.eq('organization_id', orgFilter);
    }

    // Status filter logic
    if (statusFilter === 'upcoming') {
      query = query
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_at', new Date().toISOString());
    } else if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    // Transform to frontend format
    const transformedBookings = (bookings || []).map((booking: any) => ({
      id: booking.id,
      leadName: booking.leads?.name || 'Unknown Lead',
      leadEmail: booking.leads?.email || '',
      leadPhone: booking.leads?.phone || booking.phone_number || '',
      organizationName: booking.organizations?.name || 'Unknown',
      scheduledAt: booking.scheduled_at,
      duration: booking.duration_minutes,
      callType: booking.call_type,
      status: booking.status,
      outcome: booking.outcome,
      notes: booking.notes,
      staffMember: booking.users?.email || null,
    }));

    return NextResponse.json({
      success: true,
      bookings: transformedBookings,
      total: transformedBookings.length,
    });
  } catch (error: any) {
    console.error('[Bookings API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
