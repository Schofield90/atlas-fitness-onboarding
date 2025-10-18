import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: bookingLink, error } = await supabase
  .from('booking_links')
  .select('*')
  .eq('slug', 'te')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Booking Link:', JSON.stringify(bookingLink, null, 2));
}

// Also check the organization
const { data: org } = await supabase
  .from('organizations')
  .select('id, name')
  .eq('id', bookingLink.organization_id)
  .single();

console.log('\nOrganization:', org);

// Check if there are any users in this organization
const { data: users } = await supabase
  .from('organization_staff')
  .select('user_id, users(id, full_name, email)')
  .eq('organization_id', bookingLink.organization_id);

console.log('\nOrganization Staff:', JSON.stringify(users, null, 2));
