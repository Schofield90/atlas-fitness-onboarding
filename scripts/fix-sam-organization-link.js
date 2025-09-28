#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function fixSamOrganizationLink() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔧 Fixing Sam\'s organization links...\n');

  try {
    // Get Sam's user ID
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const samAuthUser = authUsers.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samAuthUser) {
      console.log('❌ Sam not found in auth.users');
      return;
    }
    
    const samUserId = samAuthUser.id;
    console.log(`✅ Sam's user ID: ${samUserId}`);

    // Get organizations where Sam should be owner
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', samUserId);

    if (orgsError) {
      console.error('❌ Error getting organizations:', orgsError);
      return;
    }

    console.log(`📋 Found ${orgs.length} organizations where Sam is owner:`);
    orgs.forEach(org => {
      console.log(`- ${org.name} (${org.id})`);
    });

    if (orgs.length === 0) {
      console.log('🔍 No organizations found with Sam as owner. Checking all organizations...');
      
      const { data: allOrgs, error: allOrgsError } = await supabase
        .from('organizations')
        .select('*');

      if (allOrgsError) {
        console.error('❌ Error getting all organizations:', allOrgsError);
        return;
      }

      console.log('Available organizations:');
      allOrgs.forEach(org => {
        console.log(`- ${org.name} (${org.id}) - Owner: ${org.owner_id}`);
      });

      // Set Sam as owner of Atlas Fitness if it exists
      const atlasOrg = allOrgs.find(org => org.name.includes('Atlas'));
      if (atlasOrg) {
        console.log(`🎯 Setting Sam as owner of ${atlasOrg.name}...`);
        
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ owner_id: samUserId, updated_at: new Date().toISOString() })
          .eq('id', atlasOrg.id);

        if (updateError) {
          console.error('❌ Error updating organization owner:', updateError);
        } else {
          console.log('✅ Successfully set Sam as owner');
          orgs.push({ ...atlasOrg, owner_id: samUserId });
        }
      }
    }

    // Check user_organizations table structure first
    console.log('\n🔍 Checking user_organizations table structure...');
    const { data: sampleUserOrg, error: structError } = await supabase
      .from('user_organizations')
      .select('*')
      .limit(1);

    if (structError) {
      console.error('❌ Error checking user_organizations structure:', structError);
      return;
    }

    console.log('📋 Table accessible, checking if we can insert...');

    // For each organization Sam should be linked to, create user_organizations entry
    for (const org of orgs) {
      console.log(`\n🔗 Creating user_organizations entry for ${org.name}...`);
      
      // Try different column combinations based on what we've seen in migrations
      const userOrgData = {
        user_id: samUserId,
        organization_id: org.id,
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Attempting insert with data:', userOrgData);

      const { data: insertResult, error: insertError } = await supabase
        .from('user_organizations')
        .insert(userOrgData)
        .select();

      if (insertError) {
        console.error('❌ Error inserting user_organization:', insertError);
        
        // Try with org_id instead of organization_id
        const alternativeData = {
          user_id: samUserId,
          org_id: org.id,
          role: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Trying alternative column names:', alternativeData);

        const { data: altResult, error: altError } = await supabase
          .from('user_organizations')
          .insert(alternativeData)
          .select();

        if (altError) {
          console.error('❌ Alternative insert also failed:', altError);
        } else {
          console.log('✅ Successfully inserted with alternative columns:', altResult);
        }
      } else {
        console.log('✅ Successfully inserted user_organization:', insertResult);
      }
    }

    // Verify the fix
    console.log('\n✅ Verification - Checking user_organizations entries:');
    const { data: finalUserOrgs, error: finalError } = await supabase
      .from('user_organizations')
      .select('*');

    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
    } else {
      console.log(`Found ${finalUserOrgs.length} user_organization records:`);
      finalUserOrgs.forEach(uo => {
        console.log(`- User: ${uo.user_id}, Org: ${uo.organization_id || uo.org_id}, Role: ${uo.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

fixSamOrganizationLink().catch(console.error);