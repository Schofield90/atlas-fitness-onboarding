#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClientsTable() {
  console.log('Checking clients table structure...\n');
  
  try {
    // Try to insert without organization_id
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert({
        email: 'sam@atlas-gyms.co.uk',
        first_name: 'Sam',
        last_name: 'Atlas',
        phone: '+447490253471',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (clientError) {
      console.error('❌ Failed to create client:', clientError);
      process.exit(1);
    }
    
    console.log('✅ Sam\'s account created/updated successfully!');
    console.log('Client data:', JSON.stringify(client, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkClientsTable();