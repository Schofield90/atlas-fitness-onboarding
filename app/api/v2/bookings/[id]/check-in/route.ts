import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/src/services';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// POST /api/v2/bookings/[id]/check-in - Check in client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await bookingService.checkInBooking(params.id);

    return NextResponse.json({ 
      message: 'Client checked in successfully' 
    });
  } catch (error) {
    console.error('Error checking in booking:', error);
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    );
  }
}

// DELETE /api/v2/bookings/[id]/check-in - Mark as no-show
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await bookingService.markNoShow(params.id);

    return NextResponse.json({ 
      message: 'Marked as no-show' 
    });
  } catch (error) {
    console.error('Error marking no-show:', error);
    return NextResponse.json(
      { error: 'Failed to mark no-show' },
      { status: 500 }
    );
  }
}