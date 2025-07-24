import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bookingService } from '@/app/lib/services/booking';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  const params = await context.params;
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
    const { attended } = body;

    if (typeof attended !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid "attended" field' },
        { status: 400 }
      );
    }

    await bookingService.markAttendance(params.bookingId, attended);

    return NextResponse.json({ message: 'Attendance updated' });
  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update attendance' },
      { status: 400 }
    );
  }
}