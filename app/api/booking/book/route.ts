import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bookingService } from '@/app/lib/services/booking';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, classSessionId, paymentMethodId } = body;

    if (!customerId || !classSessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    try {
      const booking = await bookingService.createBooking(
        customerId,
        classSessionId,
        paymentMethodId
      );

      return NextResponse.json(booking);
    } catch (error) {
      if (error instanceof Error && error.message === 'Class is full') {
        // Automatically add to waitlist
        const waitlistEntry = await bookingService.addToWaitlist(
          customerId,
          classSessionId
        );

        return NextResponse.json({
          message: 'Added to waitlist',
          waitlistPosition: waitlistEntry.position,
          autoBook: waitlistEntry.auto_book,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 400 }
    );
  }
}