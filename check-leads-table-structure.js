#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeadsTable() {
  console.log('Checking leads table structure...\n');
  
  // Try to insert a test Facebook lead
  const testLead = {
    organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
    name: 'Test Facebook Lead',
    email: 'test@facebook.com',
    phone: '1234567890',
    source: 'facebook',
    status: 'new',
    facebook_lead_id: 'fb_test_' + Date.now(),
    facebook_form_id: 'form_test_123',
    facebook_page_id: 'page_test_456',
    metadata: {
      form_name: 'Test Form',
      synced_at: new Date().toISOString()
    }
  };
  
  console.log('Attempting to insert test lead with structure:');
  console.log(JSON.stringify(testLead, null, 2));
  console.log('\n');
  
  const { data, error } = await supabase
    .from('leads')
    .insert(testLead)
    .select();
  
  if (error) {
    console.log('❌ Insert error:', error.message);
    console.log('\nError details:', error);
    
    // Try to understand what columns exist
    if (error.message.includes('column')) {
      console.log('\nThe error suggests these columns might not exist:');
      if (error.message.includes('facebook_lead_id')) {
        console.log('- facebook_lead_id');
      }
      if (error.message.includes('facebook_form_id')) {
        console.log('- facebook_form_id');
      }
      if (error.message.includes('facebook_page_id')) {
        console.log('- facebook_page_id');
      }
    }
    
    // Try simpler insert
    console.log('\n\nTrying simpler insert without Facebook fields...');
    const simpleLead = {
      organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
      name: 'Simple Test Lead',
      email: 'simple@test.com',
      phone: '9876543210',
      source: 'facebook',
      status: 'new',
      metadata: {
        facebook_lead_id: testLead.facebook_lead_id,
        facebook_form_id: testLead.facebook_form_id,
        facebook_page_id: testLead.facebook_page_id,
        form_name: 'Test Form'
      }
    };
    
    const { data: simpleData, error: simpleError } = await supabase
      .from('leads')
      .insert(simpleLead)
      .select();
    
    if (simpleError) {
      console.log('❌ Simple insert also failed:', simpleError.message);
    } else {
      console.log('✅ Simple insert succeeded!');
      console.log('Lead created with ID:', simpleData[0].id);
      console.log('\nThis means:');
      console.log('- The table exists and basic fields work');
      console.log('- Facebook-specific columns might not exist');
      console.log('- We should store Facebook data in metadata field');
      
      // Clean up test lead
      await supabase
        .from('leads')
        .delete()
        .eq('id', simpleData[0].id);
      
      console.log('\n✅ Test lead deleted');
    }
  } else {
    console.log('✅ Successfully inserted test lead!');
    console.log('Lead ID:', data[0].id);
    console.log('\nThis means all Facebook fields exist in the table.');
    
    // Clean up
    await supabase
      .from('leads')
      .delete()
      .eq('id', data[0].id);
    
    console.log('✅ Test lead deleted');
  }
  
  // Check existing structure
  console.log('\n\n📊 Checking existing lead structure...');
  const { data: sampleLead } = await supabase
    .from('leads')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleLead) {
    console.log('Columns in leads table:');
    Object.keys(sampleLead).forEach(key => {
      const value = sampleLead[key];
      const type = value === null ? 'null' : typeof value;
      console.log(`  - ${key}: ${type}`);
    });
  }
}

checkLeadsTable();