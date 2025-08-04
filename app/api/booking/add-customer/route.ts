import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { classSessionId, customerId, clientId } = await request.json();
    
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
    
    // Try to insert the booking
    let result;
    if (customerId) {
      result = await supabase
        .from('bookings')
        .insert({
          class_session_id: classSessionId,
          customer_id: customerId
        })
        .select()
        .single();
    } else {
      result = await supabase
        .from('bookings')
        .insert({
          class_session_id: classSessionId,
          client_id: clientId
        })
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Booking insert error:', result.error);
      
      // If customer_id failed, try with client_id
      if (result.error.message?.includes('customer_id') && !clientId) {
        const clientResult = await supabase
          .from('bookings')
          .insert({
            class_session_id: classSessionId,
            client_id: customerId // Use the customerId as clientId
          })
          .select()
          .single();
          
        if (clientResult.error) {
          return NextResponse.json(
            { error: clientResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ success: true, data: clientResult.data });
      }
      
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}