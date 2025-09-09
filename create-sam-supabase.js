#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSamAccount() {
  console.log('Creating Sam\'s account in production database...\n');
  
  try {
    // First get the organization ID
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ Failed to get organization:', orgError);
      process.exit(1);
    }
    
    const orgId = orgs[0].id;
    console.log(`Using organization: ${orgs[0].name} (${orgId})\n`);
    
    // Create Sam's client account
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert({
        email: 'sam@atlas-gyms.co.uk',
        first_name: 'Sam',
        last_name: 'Atlas',
        phone: '+447490253471',
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email,organization_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (clientError) {
      console.error('❌ Failed to create client:', clientError);
      process.exit(1);
    }
    
    console.log('✅ Sam\'s account created/updated successfully!');
    console.log('Client ID:', client.id);
    console.log('Email:', client.email);
    console.log('User ID:', client.user_id || '(not linked yet - will be created on first login)');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSamAccount();