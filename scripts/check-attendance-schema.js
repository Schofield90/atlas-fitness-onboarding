const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function checkAttendanceSchema() {
  console.log('🔍 Checking attendance and booking-related tables...\n');

  try {
    // 1. Check class_bookings table
    console.log('1. class_bookings table:');
    const { data: bookings, error: bookingError } = await supabase
      .from('class_bookings')
      .select('*')
      .limit(1);

    if (bookingError) {
      console.log('Error:', bookingError.message);
    } else if (bookings && bookings.length > 0) {
      console.log('Columns:', Object.keys(bookings[0]));
      console.log('Sample data:', JSON.stringify(bookings[0], null, 2));
    } else {
      console.log('Table exists but no data');
    }

    // 2. Check class_schedules table
    console.log('\n2. class_schedules table:');
    const { data: schedules } = await supabase
      .from('class_schedules')
      .select('*')
      .limit(1);

    if (schedules && schedules.length > 0) {
      console.log('Columns:', Object.keys(schedules[0]));
    } else {
      console.log('No schedules found');
    }

    // 3. Check class_types table
    console.log('\n3. class_types table:');
    const { data: types } = await supabase
      .from('class_types')
      .select('*')
      .limit(1);

    if (types && types.length > 0) {
      console.log('Columns:', Object.keys(types[0]));
    } else {
      console.log('No class types found');
    }

    // 4. Check for attendance_history or similar tables
    console.log('\n4. Looking for attendance-specific tables:');
    const tables = [
      'attendance_history',
      'class_attendance',
      'client_attendance',
      'attendance_records'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`  ✓ ${table} exists`);
        if (data && data.length > 0) {
          console.log(`    Columns: ${Object.keys(data[0]).join(', ')}`);
        }
      } else if (!error.message.includes('does not exist')) {
        console.log(`  ? ${table}: ${error.message}`);
      }
    }

    // 5. Check what attendance data we can derive from class_bookings
    console.log('\n5. Attendance data from class_bookings:');
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('class_bookings')
      .select('id, client_id, customer_id, class_schedule_id, booking_status, checked_in, checked_in_at, created_at')
      .eq('organization_id', organizationId)
      .in('booking_status', ['confirmed', 'completed'])
      .limit(5);

    if (attendanceData && attendanceData.length > 0) {
      console.log(`Found ${attendanceData.length} booking records that could represent attendance`);
      console.log('Sample booking statuses:');
      attendanceData.forEach(booking => {
        console.log(`  - Status: ${booking.booking_status}, Checked In: ${booking.checked_in || 'false'}, Date: ${booking.created_at}`);
      });
    } else {
      console.log('No attendance data found in class_bookings');
    }

    // 6. Count total bookings by client
    console.log('\n6. Client attendance summary:');
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', organizationId)
      .limit(3);

    for (const client of clients || []) {
      const { count } = await supabase
        .from('class_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .or(`client_id.eq.${client.id},customer_id.eq.${client.id}`);

      console.log(`  ${client.name}: ${count || 0} total bookings`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAttendanceSchema();