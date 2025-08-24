#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUserOrganizations() {
  console.log('🔧 Fixing user organization memberships...\n');
  
  try {
    // Get the user ID for sam@atlas-gyms.co.uk
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();
    
    if (userError || !users) {
      console.log('❌ Could not find user sam@atlas-gyms.co.uk');
      return;
    }
    
    const userId = users.id;
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';
    
    console.log(`Found user ID: ${userId}`);
    
    // Add to user_organizations
    const { error: uoError } = await supabase
      .from('user_organizations')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        is_active: true
      }, {
        onConflict: 'user_id,organization_id'
      });
    
    if (uoError) {
      console.log('⚠️  user_organizations table might not exist:', uoError.message);
    } else {
      console.log('✅ Added to user_organizations');
    }
    
    // Add to organization_members
    const { error: omError } = await supabase
      .from('organization_members')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true
      }, {
        onConflict: 'user_id,organization_id'
      });
    
    if (omError) {
      console.log('❌ Error adding to organization_members:', omError.message);
    } else {
      console.log('✅ Added to organization_members as owner');
    }
    
    // Verify the setup
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .single();
    
    if (membership) {
      console.log(`\n✅ User is now ${membership.role} in Atlas Fitness organization`);
      console.log(`   Active: ${membership.is_active}`);
    }
    
    console.log('\n🎉 User organization setup complete!');
    console.log('The Facebook integration page should now work properly.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserOrganizations();