const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixOrganizationStaff() {
  console.log('🔧 Fixing organization_staff for sam@atlas-gyms.co.uk');
  console.log('========================================\n');

  const userId = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1';
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

  try {
    // Add to organization_staff table
    console.log('Adding to organization_staff table...');
    const { error: staffError } = await supabase
      .from('organization_staff')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        role: 'owner',
        is_active: true
      }, {
        onConflict: 'user_id,organization_id'
      });

    if (!staffError) {
      console.log('✅ Added to organization_staff');
    } else {
      console.error('⚠️ Error adding to organization_staff:', staffError.message);
    }

    // Also add to organization_members for backwards compatibility
    console.log('\nAdding to organization_members table...');
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        user_id: userId,
        org_id: organizationId,
        organization_id: organizationId,
        role: 'owner',
        is_active: true
      }, {
        onConflict: 'user_id,org_id'
      });

    if (!memberError) {
      console.log('✅ Added to organization_members');
    } else {
      console.error('⚠️ Error adding to organization_members:', memberError.message);
    }

    // Verify the entries
    console.log('\nVerifying entries...');

    const { data: staffData } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (staffData) {
      console.log('✅ Verified in organization_staff - Role:', staffData.role);
    }

    const { data: memberData } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', organizationId)
      .single();

    if (memberData) {
      console.log('✅ Verified in organization_members - Role:', memberData.role);
    }

    console.log('\n========================================');
    console.log('✅ ORGANIZATION SETUP COMPLETE!');
    console.log('========================================');
    console.log('\n🚀 The middleware should now recognize sam@atlas-gyms.co.uk');
    console.log('   Try logging in again at: http://localhost:3001/owner-login');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

fixOrganizationStaff().then(() => process.exit(0));