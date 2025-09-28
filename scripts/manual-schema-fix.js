#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function manualSchemaFix() {
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

  console.log('🔧 Manual schema fix for owner login...\n');

  try {
    // Step 1: Get Sam's user ID
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const samAuthUser = authUsers.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samAuthUser) {
      console.log('❌ Sam not found in auth.users');
      return;
    }
    
    const samUserId = samAuthUser.id;
    console.log(`✅ Sam's user ID: ${samUserId}`);

    // Step 2: Check current user_organizations structure by trying to insert a test record
    console.log('\n🔍 Testing user_organizations table structure...');
    
    // Get an organization for testing
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, owner_id')
      .limit(1);

    if (orgsError || !orgs.length) {
      console.error('❌ No organizations found for testing');
      return;
    }

    const testOrg = orgs[0];
    console.log(`Using test org: ${testOrg.name} (${testOrg.id})`);

    // Try inserting with minimal columns first
    const basicData = {
      user_id: samUserId,
      organization_id: testOrg.id,
      role: 'owner'
    };

    console.log('Trying basic insert:', basicData);

    const { data: basicInsert, error: basicError } = await supabase
      .from('user_organizations')
      .insert(basicData)
      .select();

    if (basicError) {
      console.log('❌ Basic insert failed:', basicError.message);
      
      // Try with created_at
      const withCreatedAt = {
        ...basicData,
        created_at: new Date().toISOString()
      };
      
      console.log('Trying with created_at:', withCreatedAt);
      
      const { data: createdAtInsert, error: createdAtError } = await supabase
        .from('user_organizations')
        .insert(withCreatedAt)
        .select();

      if (createdAtError) {
        console.log('❌ Insert with created_at failed:', createdAtError.message);
        
        // Let's check what columns actually exist by looking at the error
        console.log('\n🔍 Checking actual table structure...');
        
        // Try a select to see what's available
        const { data: existing, error: existingError } = await supabase
          .from('user_organizations')
          .select('*')
          .limit(0); // Get no rows but reveal columns
          
        if (existingError) {
          console.log('❌ Cannot access user_organizations:', existingError.message);
        } else {
          console.log('✅ user_organizations table exists but is empty');
        }
        
        // Let's try direct SQL through psql if possible
        console.log('\n🔨 Let\'s try adding the missing column directly...');
        
        // We need to add the updated_at column manually
        // Since we can't execute arbitrary SQL, let's check if we can work with existing columns
        
        // Try a very minimal insert
        const minimalData = {
          user_id: samUserId,
          organization_id: testOrg.id
        };
        
        console.log('Trying minimal insert:', minimalData);
        
        const { data: minimalInsert, error: minimalError } = await supabase
          .from('user_organizations')
          .insert(minimalData)
          .select();
          
        if (minimalError) {
          console.log('❌ Even minimal insert failed:', minimalError.message);
        } else {
          console.log('✅ Minimal insert successful:', minimalInsert);
        }
        
      } else {
        console.log('✅ Insert with created_at successful:', createdAtInsert);
      }
      
    } else {
      console.log('✅ Basic insert successful:', basicInsert);
    }

    // Step 3: Now try to link Sam to Atlas organization specifically
    console.log('\n🎯 Linking Sam to Atlas organization...');
    
    const { data: atlasOrgs, error: atlasError } = await supabase
      .from('organizations')
      .select('*')
      .ilike('name', '%atlas%');

    if (atlasError || !atlasOrgs.length) {
      console.log('❌ No Atlas organization found');
      return;
    }

    const atlasOrg = atlasOrgs[0];
    console.log(`Found Atlas org: ${atlasOrg.name} (${atlasOrg.id})`);

    // Ensure Sam is the owner
    if (atlasOrg.owner_id !== samUserId) {
      console.log('🔧 Setting Sam as owner of Atlas organization...');
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ owner_id: samUserId })
        .eq('id', atlasOrg.id);

      if (updateError) {
        console.error('❌ Failed to set Sam as owner:', updateError);
      } else {
        console.log('✅ Sam is now owner of Atlas organization');
      }
    } else {
      console.log('✅ Sam is already owner of Atlas organization');
    }

    // Try to create user_organizations link for Atlas
    const samAtlasData = {
      user_id: samUserId,
      organization_id: atlasOrg.id,
      role: 'owner',
      created_at: new Date().toISOString()
    };

    console.log('Creating user_organizations link for Atlas:', samAtlasData);

    const { data: atlasLink, error: atlasLinkError } = await supabase
      .from('user_organizations')
      .upsert(samAtlasData, { 
        onConflict: 'user_id,organization_id',
        ignoreDuplicates: false 
      })
      .select();

    if (atlasLinkError) {
      console.log('❌ Failed to create Atlas link:', atlasLinkError.message);
      
      // Try without upsert
      const { data: insertLink, error: insertLinkError } = await supabase
        .from('user_organizations')
        .insert(samAtlasData)
        .select();
        
      if (insertLinkError) {
        console.log('❌ Insert also failed:', insertLinkError.message);
      } else {
        console.log('✅ Successfully created Atlas link via insert:', insertLink);
      }
    } else {
      console.log('✅ Successfully created Atlas link:', atlasLink);
    }

    // Final verification
    console.log('\n✅ Final verification:');
    const { data: finalLinks, error: finalError } = await supabase
      .from('user_organizations')
      .select('*');

    if (finalError) {
      console.error('❌ Final verification failed:', finalError);
    } else {
      console.log(`Found ${finalLinks.length} user_organization records:`);
      finalLinks.forEach(link => {
        console.log(`- User: ${link.user_id}, Org: ${link.organization_id}, Role: ${link.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Manual fix failed:', error);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

manualSchemaFix().catch(console.error);