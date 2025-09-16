const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const davidId = 'd067bd15-0d73-4b3c-8d74-98cd9e049d13';
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function createTestAttendance() {
  console.log('🏋️ Creating test class booking/attendance for David Wrightson...\n');

  try {
    // First, check what columns the class_bookings table has
    console.log('1️⃣ Checking class_bookings table structure...');

    const { data: sampleBooking } = await supabase
      .from('class_bookings')
      .select('*')
      .limit(1)
      .single();

    if (sampleBooking) {
      console.log('Sample booking columns:', Object.keys(sampleBooking).join(', '));
    }

    // Create a test class booking with attendance
    const today = new Date();
    const bookingData = {
      organization_id: organizationId,
      customer_id: davidId,
      client_id: davidId,
      booking_date: today.toISOString().split('T')[0],
      booking_time: '09:00',
      booking_status: 'completed',
      payment_status: 'succeeded',
      booking_type: 'class',
      amount: 0, // Free test class
      notes: 'Test class booking for David - CrossFit Session',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      booked_at: today.toISOString(),
      attended_at: today.toISOString(), // Mark as attended
      class_name: 'CrossFit',
      instructor_name: 'Test Instructor'
    };

    console.log('\n2️⃣ Creating test class booking...');

    const { data: newBooking, error: bookingError } = await supabase
      .from('class_bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.log('Error creating booking:', bookingError.message);

      // Try with minimal fields
      console.log('\n3️⃣ Trying with minimal required fields...');
      const minimalBooking = {
        organization_id: organizationId,
        customer_id: davidId,
        booking_status: 'completed',
        created_at: new Date().toISOString()
      };

      const { data: minimal, error: minError } = await supabase
        .from('class_bookings')
        .insert(minimalBooking)
        .select()
        .single();

      if (minError) {
        console.log('Error with minimal:', minError.message);

        // Try without customer_id, use client_id
        console.log('\n4️⃣ Trying with client_id instead...');
        const clientBooking = {
          organization_id: organizationId,
          client_id: davidId,
          booking_status: 'completed',
          created_at: new Date().toISOString()
        };

        const { data: clientResult, error: clientError } = await supabase
          .from('class_bookings')
          .insert(clientBooking)
          .select()
          .single();

        if (!clientError) {
          console.log('✅ Created booking with client_id!');
          console.log('Booking ID:', clientResult.id);
        } else {
          console.log('Error with client_id:', clientError.message);
        }
      } else {
        console.log('✅ Created minimal booking!');
        console.log('Booking ID:', minimal.id);
      }
    } else {
      console.log('✅ Successfully created test class booking!');
      console.log('Booking ID:', newBooking.id);
      console.log('Date:', newBooking.booking_date);
      console.log('Status:', newBooking.booking_status);
    }

    // Check all bookings for David
    console.log('\n5️⃣ Checking all class bookings for David...');

    // Try both customer_id and client_id
    const { data: customerBookings } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('customer_id', davidId)
      .order('created_at', { ascending: false });

    const { data: clientBookings } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('client_id', davidId)
      .order('created_at', { ascending: false });

    console.log('Bookings with customer_id:', customerBookings?.length || 0);
    console.log('Bookings with client_id:', clientBookings?.length || 0);

    const allBookings = [...(customerBookings || []), ...(clientBookings || [])];
    const uniqueBookings = Array.from(new Map(allBookings.map(b => [b.id, b])).values());

    if (uniqueBookings.length > 0) {
      console.log('\nDavid\'s class bookings:');
      uniqueBookings.slice(0, 5).forEach(booking => {
        const date = booking.booking_date || booking.created_at;
        const status = booking.booking_status || 'unknown';
        const attended = booking.attended_at ? '✅ Attended' : '❌ Not attended';
        console.log(`  - ${new Date(date).toLocaleDateString()} - ${status} - ${attended}`);
      });
    }

    console.log('\n✅ Test attendance/booking created!');
    console.log('Check the Class Bookings tab in David\'s profile');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestAttendance();