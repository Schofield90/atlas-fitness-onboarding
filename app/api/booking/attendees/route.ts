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
    
    // Try to fetch bookings with leads join (since we unified to leads table)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:leads(
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
      
      // Get customer details separately from leads table
      const customerIds = bookingsSimple.map(b => b.customer_id).filter(Boolean);
      const { data: customers } = await supabase
        .from('leads')
        .select('id, name, email')
        .in('id', customerIds);
      
      // Get membership data
      let membershipData = {};
      if (customerIds.length > 0) {
        const { data: memberships } = await supabase
          .from('customer_memberships')
          .select(`
            customer_id,
            membership_plan:membership_plans(name)
          `)
          .in('customer_id', customerIds)
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
        const customer = customers?.find(c => c.id === booking.customer_id);
        let membershipDisplay = membershipData[booking.customer_id] || 'No Membership';
        
        // Override with registration type if it's free or drop-in
        if (booking.registration_type === 'free') {
          membershipDisplay = 'Complimentary (Free)';
        } else if (booking.registration_type === 'drop-in') {
          membershipDisplay = 'Drop-in';
        } else if (booking.registration_type === 'membership') {
          // Get the actual membership name from the membership data
          membershipDisplay = membershipData[booking.customer_id] || 'Monthly Membership';
        }
        
        return {
          id: booking.id,
          clientId: booking.customer_id,
          name: customer?.name || 'Unknown',
          email: customer?.email || '',
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
      const customerId = booking.customer?.id || booking.customer_id;
      let membershipDisplay = membershipData[customerId] || 'No Membership';
      
      // Override with registration type if it's free or drop-in
      if (booking.registration_type === 'free') {
        membershipDisplay = 'Complimentary (Free)';
      } else if (booking.registration_type === 'drop-in') {
        membershipDisplay = 'Drop-in';
      } else if (booking.registration_type === 'membership') {
        // Get the actual membership name from the membership data
        membershipDisplay = membershipData[customerId] || 'Monthly Membership';
      }
      
      return {
        id: booking.id,
        clientId: customerId,
        name: booking.customer?.name || 'Unknown',
        email: booking.customer?.email || '',
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