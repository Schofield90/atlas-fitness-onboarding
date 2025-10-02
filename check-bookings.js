const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBookings() {
  const memberId = '126059c3-3970-4db0-bccb-b66e5d948632';
  
  console.log('Checking bookings for member:', memberId);
  
  // Check bookings table
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', memberId);
    
  console.log('\nBookings table:', bookings?.length || 0, 'found');
  if (bookingsError) console.error('Error:', bookingsError);
  
  // Check class_bookings table
  const { data: classBookings, error: classBookingsError } = await supabase
    .from('class_bookings')
    .select('*')
    .or(`client_id.eq.${memberId},customer_id.eq.${memberId}`);
    
  console.log('Class bookings table:', classBookings?.length || 0, 'found');
  if (classBookingsError) console.error('Error:', classBookingsError);
  
  console.log('\nTotal:', (bookings?.length || 0) + (classBookings?.length || 0));
}

checkBookings();
