import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * PATCH /api/saas-admin/lead-bots/bookings/[id]
 * Update booking status (complete, no-show, cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, outcome } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (outcome) {
      updateData.outcome = outcome;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('sales_call_bookings')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
    });
  } catch (error: any) {
    console.error('[Update Booking API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking', details: error.message },
      { status: 500 }
    );
  }
}
