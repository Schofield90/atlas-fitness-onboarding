#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  console.log('Checking facebook_lead_forms table structure...\n');
  
  // First, let's see if we can insert a simple record to understand the structure
  const testData = {
    organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
    id: 'test-' + Date.now(), // Try using id instead of form_id
    name: 'Test Form',
    status: 'ACTIVE'
  };
  
  const { data, error } = await supabase
    .from('facebook_lead_forms')
    .insert(testData)
    .select();
  
  if (error) {
    console.log('Insert error:', error.message);
    console.log('\nThis suggests the table has different columns.');
    
    // Try to get table info from error message
    if (error.message.includes('column')) {
      console.log('\nThe error mentions columns, which means:');
      console.log('- The table exists but has a different structure');
      console.log('- We need to match the exact column names');
    }
  } else {
    console.log('Successfully inserted test record!');
    console.log('Record:', data);
    
    // Delete the test record
    await supabase
      .from('facebook_lead_forms')
      .delete()
      .eq('id', testData.id);
  }
  
  // Try a different approach - query with select('*')
  console.log('\nAttempting to query existing records...');
  const { data: existingData, error: queryError } = await supabase
    .from('facebook_lead_forms')
    .select('*')
    .limit(1);
  
  if (queryError) {
    console.log('Query error:', queryError.message);
  } else if (existingData && existingData.length > 0) {
    console.log('Found existing record with columns:');
    console.log(Object.keys(existingData[0]));
  } else {
    console.log('Table exists but is empty');
  }
}

checkTableStructure();