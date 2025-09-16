const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// For now, let's use the existing class_bookings table to store payment data
// We'll add a type field to distinguish payments from attendance

async function storePaymentsInBookings() {
  console.log('💳 Setting up payment storage in class_bookings table...\n');
  
  try {
    // Test if we can store payment data in class_bookings
    const testPayment = {
      organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
      client_id: '25815bb6-91e2-4c17-8386-fde8a7a0722d', // Sam's client ID
      booking_status: 'completed',
      payment_status: 'succeeded',
      booking_type: 'payment_record', // Mark as payment
      amount: 5000, // £50 in pennies
      notes: 'Payment import: Monthly membership',
      booking_date: '2025-01-15',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('class_bookings')
      .insert(testPayment)
      .select()
      .single();

    if (error) {
      console.log('Error storing payment:', error.message);
    } else {
      console.log('✅ Successfully stored payment in class_bookings!');
      console.log('Payment record:', data);
      
      // Clean up test
      await supabase
        .from('class_bookings')
        .delete()
        .eq('id', data.id);
      
      console.log('\n✅ Payment storage is working!');
      console.log('\nYou can now import payments using:');
      console.log('  - booking_type: "payment_record" to mark as payment');
      console.log('  - amount: store amount in pennies');
      console.log('  - notes: payment description');
      console.log('  - booking_date: payment date');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

storePaymentsInBookings();