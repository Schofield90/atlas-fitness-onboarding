import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/src/services';
import { z } from 'zod';
import { getOrganizationAndUser } from '@/app/lib/auth-utils';

// Schema for creating booking
const createBookingSchema = z.object({
  sessionId: z.string().uuid(),
  clientId: z.string().uuid(),
  notes: z.string().optional()
});

// GET /api/v2/bookings - Get bookings with filters
export async function GET(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const filter = {
      status: searchParams.get('status')?.split(','),
      clientId: searchParams.get('clientId') || undefined,
      instructorId: searchParams.get('instructorId') || undefined,
      classId: searchParams.get('classId') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    };

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await bookingService.getBookings(organization.id, filter, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/v2/bookings - Create a booking
export async function POST(request: NextRequest) {
  try {
    const { organization, user } = await getOrganizationAndUser();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = createBookingSchema.parse(body);

    const bookingId = await bookingService.createBooking(organization.id, {
      ...validated,
      source: 'web'
    });

    return NextResponse.json({ 
      id: bookingId,
      message: 'Booking created successfully' 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message === 'Session is fully booked') {
      return NextResponse.json(
        { error: 'Session is fully booked' },
        { status: 409 }
      );
    }
    
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}