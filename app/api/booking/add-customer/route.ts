import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { classSessionId, customerId, clientId, registrationType, membershipId } = await request.json();
    
    if (!classSessionId || (!customerId && !clientId)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Try admin client first, fall back to regular client
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log('Using admin client for booking');
    } catch (adminError) {
      console.log('Admin client not available, using regular server client');
      supabase = await createClient();
    }
    
    console.log('Booking request:', { classSessionId, customerId, clientId, registrationType, membershipId });
    
    // First verify the customer exists in leads table
    const customerIdToUse = customerId || clientId;
    console.log('Looking for customer with ID:', customerIdToUse);
    
    const { data: customerExists, error: customerCheckError } = await supabase
      .from('leads')
      .select('id, name, email')
      .eq('id', customerIdToUse)
      .single();
    
    console.log('Customer lookup result:', { customerExists, customerCheckError });
    
    if (customerCheckError || !customerExists) {
      console.error('Customer lookup failed:', {
        customerIdToUse,
        error: customerCheckError?.message,
        errorCode: customerCheckError?.code,
        customerExists: !!customerExists
      });
      return NextResponse.json(
        { error: `Customer not found with ID: ${customerIdToUse}. Error: ${customerCheckError?.message || 'Customer does not exist'}` },
        { status: 400 }
      );
    }
    
    console.log('Customer found:', customerExists);
    
    // Unified approach: All customers are in the leads table
    // The bookings table should reference customer_id -> leads(id)
    
    // Prepare booking data
    const bookingData: any = {
      class_session_id: classSessionId,
      customer_id: customerId || clientId, // Both should be lead IDs now
      status: 'registered',
      registration_type: registrationType || 'direct',
      created_at: new Date().toISOString()
    };

    // Add membership information if provided
    if (membershipId && registrationType === 'membership') {
      bookingData.membership_id = membershipId;
    }

    // Special handling for free registrations
    if (registrationType === 'free') {
      bookingData.payment_status = 'comp';
    }

    // Insert the booking
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (error) {
      console.error('Booking insert error:', error);
      
      // Check if it's a foreign key constraint error
      if (error.message?.includes('violates foreign key constraint')) {
        return NextResponse.json(
          { error: 'Customer not found. Please ensure the customer exists in the system.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    // Update lead status to client if they made a booking
    if (registrationType === 'membership' || registrationType === 'drop-in') {
      await supabase
        .from('leads')
        .update({ status: 'client' })
        .eq('id', customerId || clientId)
        .neq('status', 'client'); // Only update if not already a client
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}