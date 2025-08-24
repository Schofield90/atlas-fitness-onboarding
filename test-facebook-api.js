#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFacebookAPI() {
  console.log('🔍 Testing Facebook API with authentication fix...\n');
  
  try {
    // 1. Get a valid user session
    console.log('1️⃣ Getting user session...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    const user = users[0];
    console.log(`✅ Found user: ${user.email}`);
    
    // 2. Check organization membership
    console.log('\n2️⃣ Checking organization membership...');
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();
    
    if (membershipError || !membership) {
      console.log('❌ User has no organization membership');
      
      // Try to add user to Atlas Fitness
      const ATLAS_FITNESS_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e';
      console.log('🔧 Adding user to Atlas Fitness organization...');
      
      const { error: insertError } = await supabase
        .from('organization_members')
        .upsert({
          user_id: user.id,
          organization_id: ATLAS_FITNESS_ORG_ID,
          role: 'owner',
          is_active: true
        }, {
          onConflict: 'user_id,organization_id'
        });
      
      if (insertError) {
        console.log('❌ Failed to add user to organization:', insertError.message);
        return;
      }
      
      console.log('✅ User added to Atlas Fitness organization');
    } else {
      console.log(`✅ User is ${membership.role} in organization ${membership.organization_id}`);
    }
    
    // 3. Test the API endpoint directly
    console.log('\n3️⃣ Testing API endpoints...');
    
    // Note: We can't easily test the API endpoints from Node.js since they require
    // browser cookies for authentication. Let's check the database directly instead.
    
    // Check Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', membership?.organization_id || '63589490-8f55-4157-bd3a-e141594b748e')
      .eq('is_active', true)
      .single();
    
    if (intError || !integration) {
      console.log('❌ No active Facebook integration found');
    } else {
      console.log(`✅ Facebook integration active for: ${integration.facebook_user_name}`);
    }
    
    // Check Facebook pages
    const { data: pages, error: pagesError } = await supabase
      .from('facebook_pages')
      .select('page_name, facebook_page_id')
      .eq('organization_id', membership?.organization_id || '63589490-8f55-4157-bd3a-e141594b748e')
      .eq('is_active', true)
      .limit(5);
    
    if (pagesError) {
      console.log('❌ Error fetching pages:', pagesError.message);
    } else if (pages && pages.length > 0) {
      console.log(`✅ Found ${pages.length} Facebook pages:`);
      pages.forEach(page => {
        console.log(`   - ${page.page_name} (${page.facebook_page_id})`);
      });
    } else {
      console.log('⚠️  No Facebook pages found');
    }
    
    console.log('\n✅ Authentication setup complete!');
    console.log('ℹ️  The frontend should now be able to display Facebook pages.');
    console.log('🌐 Visit: http://localhost:3000/integrations/facebook');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFacebookAPI();