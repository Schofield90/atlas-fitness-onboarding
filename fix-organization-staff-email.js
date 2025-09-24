const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixOrganizationStaff() {
  console.log('🔧 Fixing organization_staff with email field');

  const userId = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  try {
    // Delete any existing record first
    await supabase
      .from('organization_staff')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    // Insert with email and phone fields
    const { error } = await supabase
      .from('organization_staff')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        email: 'sam@atlas-gyms.co.uk', // Include email field
        phone_number: '+447777777777', // Include phone field
        role: 'owner',
        is_active: true
      });

    if (!error) {
      console.log('✅ Successfully added to organization_staff with email');
    } else {
      console.error('❌ Error:', error.message);
    }

    // Verify
    const { data } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      console.log('✅ Verified - Role:', data.role, 'Email:', data.email);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixOrganizationStaff().then(() => process.exit(0));