import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Try admin client first, fall back to regular client
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log('Using admin client for fetching attendees');
    } catch (adminError) {
      console.log('Admin client not available, using regular server client');
      supabase = await createClient();
    }
    
    // Try to fetch bookings with clients join
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        client:clients(
          id,
          name,
          email
        )
      `)
      .eq('class_session_id', sessionId)
      .order('created_at');
    
    if (error) {
      console.error('Error fetching bookings with clients:', error);
      
      // Try without join if it fails
      const { data: bookingsSimple, error: simpleError } = await supabase
        .from('bookings')
        .select('*')
        .eq('class_session_id', sessionId)
        .order('created_at');
      
      if (simpleError) {
        return NextResponse.json(
          { error: simpleError.message },
          { status: 400 }
        );
      }
      
      // Get client details separately
      const clientIds = bookingsSimple.map(b => b.client_id).filter(Boolean);
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);
      
      // Get membership data
      let membershipData = {};
      if (clientIds.length > 0) {
        const { data: memberships } = await supabase
          .from('customer_memberships')
          .select(`
            customer_id,
            membership_plan:membership_plans(name)
          `)
          .in('customer_id', clientIds)
          .eq('status', 'active');
        
        if (memberships) {
          membershipData = memberships.reduce((acc, m) => {
            acc[m.customer_id] = m.membership_plan?.name || 'Unknown Membership';
            return acc;
          }, {});
        }
      }
      
      // Merge the data
      const attendees = bookingsSimple.map(booking => {
        const client = clients?.find(c => c.id === booking.client_id);
        let membershipDisplay = membershipData[booking.client_id] || 'No Membership';
        
        // Override with registration type if it's free or drop-in
        if (booking.registration_type === 'free') {
          membershipDisplay = 'Complimentary (Free)';
        } else if (booking.registration_type === 'drop-in') {
          membershipDisplay = 'Drop-in';
        }
        
        return {
          id: booking.id,
          clientId: booking.client_id,
          name: client?.name || 'Unknown',
          email: client?.email || '',
          status: booking.status || 'registered',
          membershipType: membershipDisplay
        };
      });
      
      return NextResponse.json({ attendees });
    }
    
    // Get membership data for all clients
    const clientIds = (bookings || []).map(b => b.client?.id || b.client_id).filter(Boolean);
    let membershipData = {};
    
    if (clientIds.length > 0) {
      // Try to get customer memberships
      const { data: memberships } = await supabase
        .from('customer_memberships')
        .select(`
          customer_id,
          membership_plan:membership_plans(name)
        `)
        .in('customer_id', clientIds)
        .eq('status', 'active');
      
      if (memberships) {
        membershipData = memberships.reduce((acc, m) => {
          acc[m.customer_id] = m.membership_plan?.name || 'Unknown Membership';
          return acc;
        }, {});
      }
    }
    
    // Transform bookings to attendees format
    const attendees = (bookings || []).map(booking => {
      const clientId = booking.client?.id || booking.client_id;
      let membershipDisplay = membershipData[clientId] || 'No Membership';
      
      // Override with registration type if it's free or drop-in
      if (booking.registration_type === 'free') {
        membershipDisplay = 'Complimentary (Free)';
      } else if (booking.registration_type === 'drop-in') {
        membershipDisplay = 'Drop-in';
      }
      
      return {
        id: booking.id,
        clientId,
        name: booking.client?.name || 'Unknown',
        email: booking.client?.email || '',
        status: booking.status || 'registered',
        membershipType: membershipDisplay
      };
    });
    
    return NextResponse.json({ attendees });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}