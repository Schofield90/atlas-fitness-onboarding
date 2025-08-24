#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking actual facebook_pages table schema...\n');
  
  try {
    // Get one row from facebook_pages to see its structure
    const { data, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Sample row columns:', Object.keys(data[0]));
      console.log('\nSample data:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Table exists but is empty');
      
      // Try to insert a dummy row to see what columns are required
      const { error: insertError } = await supabase
        .from('facebook_pages')
        .insert({
          organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
          page_id: 'test123',  // Try this column name
          page_name: 'Test Page'
        });
      
      if (insertError) {
        console.log('\nInsert error (this helps identify column names):');
        console.log(insertError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();