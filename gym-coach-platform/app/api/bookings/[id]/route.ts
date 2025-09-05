import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:client_id(id, name, email),
        session_slot:session_slot_id(
          id,
          title,
          start_time,
          end_time,
          slot_type,
          location,
          trainer:trainer_id(name),
          coach:coach_id(name)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      console.error('Error fetching booking:', error);
      return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    }

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('Error in booking detail API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, payment_status, notes } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;

    const { data: booking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        client:client_id(id, name, email),
        session_slot:session_slot_id(
          id,
          title,
          start_time,
          end_time,
          slot_type,
          location,
          trainer:trainer_id(name),
          coach:coach_id(name)
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      console.error('Error updating booking:', error);
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Booking updated successfully',
      booking 
    });

  } catch (error) {
    console.error('Error in update booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First check if booking exists and get its details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*, session_slot_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      console.error('Error fetching booking:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    }

    // Check if booking can be cancelled (24 hours before session)
    const sessionTime = new Date(booking.session_start_time);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession < 24 && booking.status !== 'cancelled') {
      return NextResponse.json({ 
        error: 'Bookings can only be cancelled more than 24 hours before the session' 
      }, { status: 400 });
    }

    // Update booking status to cancelled instead of deleting
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error cancelling booking:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    // Update session slot booking count (if applicable)
    if (booking.session_slot_id) {
      const { error: decrementError } = await supabase
        .rpc('decrement_session_bookings', { slot_id: booking.session_slot_id });
      
      if (decrementError) {
        console.error('Error updating session booking count:', decrementError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ 
      message: 'Booking cancelled successfully',
      booking: updatedBooking 
    });

  } catch (error) {
    console.error('Error in cancel booking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}