import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Get organization from headers (set by middleware)
  const organizationSlug = request.headers.get('x-organization-slug');
  
  if (!organizationSlug) {
    return NextResponse.json({ error: 'Organization not specified' }, { status: 400 });
  }

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
    // First get the organization ID from slug
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, features, client_portal_settings')
      .eq('slug', organizationSlug)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if booking feature is enabled
    if (!organization.features?.booking) {
      return NextResponse.json({ error: 'Booking feature not enabled' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sessionType = searchParams.get('sessionType');

    // Build query
    let query = supabase
      .from('available_slots')
      .select(`
        *,
        trainer:trainer_id(id, name, avatar_url),
        coach:coach_id(id, name, avatar_url)
      `)
      .eq('organization_id', organization.id)
      .eq('is_available', true)
      .order('start_time', { ascending: true });

    // Apply filters
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    if (sessionType && sessionType !== 'all') {
      query = query.eq('slot_type', sessionType);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error fetching slots:', error);
      return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 });
    }

    // Apply organization-specific rules
    const settings = organization.client_portal_settings || {};
    const filteredSlots = slots?.filter(slot => {
      // Check advance booking hours
      if (settings.booking_advance_hours) {
        const hoursUntilSession = (new Date(slot.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilSession < settings.booking_advance_hours) {
          return false;
        }
      }
      return true;
    });

    return NextResponse.json({ 
      slots: filteredSlots || [],
      settings: {
        cancellation_hours: settings.cancellation_hours || 24,
        max_bookings_per_day: settings.max_bookings_per_day || null,
        timezone: settings.timezone || 'Europe/London'
      }
    });

  } catch (error) {
    console.error('Error in available-slots API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}