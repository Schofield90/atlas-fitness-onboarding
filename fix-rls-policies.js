const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for Atlas Fitness tables');
  console.log('==============================================\n');

  try {
    // First, let's check if RLS is enabled on programs
    const { data: rpcResult, error: rpcError } = await supabase.rpc('check_table_rls', {
      table_name: 'programs'
    }).single();

    if (rpcError) {
      console.log('Note: Could not check RLS status (this is normal)');
    }

    // Create SQL to add RLS policies that allow organization members to see their data
    const sql = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Programs visible to organization members" ON programs;
      DROP POLICY IF EXISTS "Programs visible to authenticated users" ON programs;
      DROP POLICY IF EXISTS "Users can view programs in their organization" ON programs;

      -- Create a more permissive policy for viewing programs
      CREATE POLICY "Programs visible to organization members" ON programs
      FOR SELECT
      USING (
        -- Allow if user is in organization_staff
        EXISTS (
          SELECT 1 FROM organization_staff
          WHERE organization_staff.user_id = auth.uid()
          AND organization_staff.organization_id = programs.organization_id
        )
        OR
        -- Allow if user is in organization_members
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.organization_id = programs.organization_id
        )
        OR
        -- Allow if user is in user_organizations
        EXISTS (
          SELECT 1 FROM user_organizations
          WHERE user_organizations.user_id = auth.uid()
          AND user_organizations.organization_id = programs.organization_id
        )
        OR
        -- Special bypass for sam
        auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
      );

      -- Also fix clients table if needed
      DROP POLICY IF EXISTS "Clients visible to organization members" ON clients;

      CREATE POLICY "Clients visible to organization members" ON clients
      FOR SELECT
      USING (
        -- Allow if user is in organization_staff
        EXISTS (
          SELECT 1 FROM organization_staff
          WHERE organization_staff.user_id = auth.uid()
          AND organization_staff.organization_id = clients.organization_id
        )
        OR
        -- Allow if user is in organization_members
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.organization_id = clients.organization_id
        )
        OR
        -- Allow if user is in user_organizations
        EXISTS (
          SELECT 1 FROM user_organizations
          WHERE user_organizations.user_id = auth.uid()
          AND user_organizations.organization_id = clients.organization_id
        )
        OR
        -- Special bypass for sam
        auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
      );

      -- Fix membership_plans table
      DROP POLICY IF EXISTS "Membership plans visible to organization members" ON membership_plans;

      CREATE POLICY "Membership plans visible to organization members" ON membership_plans
      FOR SELECT
      USING (
        -- Allow if user is in organization_staff
        EXISTS (
          SELECT 1 FROM organization_staff
          WHERE organization_staff.user_id = auth.uid()
          AND organization_staff.organization_id = membership_plans.organization_id
        )
        OR
        -- Allow if user is in organization_members
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.user_id = auth.uid()
          AND organization_members.organization_id = membership_plans.organization_id
        )
        OR
        -- Allow if user is in user_organizations
        EXISTS (
          SELECT 1 FROM user_organizations
          WHERE user_organizations.user_id = auth.uid()
          AND user_organizations.organization_id = membership_plans.organization_id
        )
        OR
        -- Special bypass for sam
        auth.uid() = 'ea1fc8e3-35a2-4c59-80af-5fde557391a1'
      );
    `;

    console.log('Executing SQL to fix RLS policies...\n');

    // Note: We can't execute raw SQL through Supabase client
    // So we'll create a simpler approach
    console.log('⚠️  Note: Direct SQL execution not available through Supabase client.');
    console.log('    Creating a workaround...\n');

    // Test if we can see the data with service role
    const { data: programs } = await supabase
      .from('programs')
      .select('*')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e');

    console.log('✅ Service role can see', programs?.length || 0, 'programs');

    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .limit(5);

    console.log('✅ Service role can see', clients?.length || 0, 'clients (sampled)');

    const { data: plans } = await supabase
      .from('membership_plans')
      .select('id')
      .eq('organization_id', '63589490-8f55-4157-bd3a-e141594b748e')
      .limit(5);

    console.log('✅ Service role can see', plans?.length || 0, 'membership plans (sampled)');

    console.log('\n========================================');
    console.log('📝 RLS POLICY FIX REQUIRED');
    console.log('========================================');
    console.log('\nThe Row Level Security policies need to be updated.');
    console.log('The data exists but authenticated users cannot access it.');
    console.log('\nPlease run the following SQL in Supabase Dashboard SQL editor:');
    console.log('\n' + sql);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

fixRLSPolicies().then(() => process.exit(0));