#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use the provided connection details
const supabaseUrl = 'https://db.lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNutritionSchema() {
  console.log('🔍 Checking nutrition_profiles table schema...\n');
  
  try {
    // First, try to get the table structure by selecting from information_schema
    const { data: columns, error: schemaError } = await supabase.rpc('get_table_columns', {
      table_name: 'nutrition_profiles'
    });
    
    if (schemaError) {
      console.log('Could not get schema via RPC, trying direct query...');
      
      // Alternative: try to get one row to see structure
      const { data, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌ Error querying nutrition_profiles:', error.message);
        console.log('Error details:', error);
        
        // Try to see if table exists at all
        const { data: tableExists, error: existsError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'nutrition_profiles')
          .eq('table_schema', 'public');
        
        if (existsError) {
          console.log('❌ Cannot check if table exists:', existsError);
        } else if (tableExists && tableExists.length > 0) {
          console.log('✅ Table exists but has access issues');
        } else {
          console.log('❌ Table does not exist');
        }
        
        return;
      }
      
      if (data && data.length > 0) {
        console.log('✅ Sample row columns:', Object.keys(data[0]));
        console.log('\n📄 Sample data:');
        console.log(JSON.stringify(data[0], null, 2));
      } else {
        console.log('⚠️  Table exists but is empty');
        
        // Test what columns are expected by trying an insert
        console.log('\n🧪 Testing column requirements...');
        
        const testData = {
          client_id: '00000000-0000-0000-0000-000000000000', // Test with client_id
          organization_id: '00000000-0000-0000-0000-000000000001',
          height_cm: 180,
          weight_kg: 80,
          age: 30,
          gender: 'MALE',
          activity_level: 'SEDENTARY'
        };
        
        const { error: insertError } = await supabase
          .from('nutrition_profiles')
          .insert(testData);
        
        if (insertError) {
          console.log('Insert test result (shows expected columns):');
          console.log(insertError.message);
          
          // Also test with lead_id instead
          const testData2 = {
            lead_id: '00000000-0000-0000-0000-000000000000', // Test with lead_id
            organization_id: '00000000-0000-0000-0000-000000000001',
            height_cm: 180,
            weight_kg: 80,
            age: 30,
            gender: 'MALE',
            activity_level: 'SEDENTARY'
          };
          
          console.log('\n🧪 Testing with lead_id instead...');
          const { error: insertError2 } = await supabase
            .from('nutrition_profiles')
            .insert(testData2);
          
          if (insertError2) {
            console.log('Insert test with lead_id:');
            console.log(insertError2.message);
          } else {
            console.log('✅ Insert with lead_id succeeded - cleaning up...');
            // Clean up the test record
            await supabase
              .from('nutrition_profiles')
              .delete()
              .eq('lead_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          console.log('✅ Insert with client_id succeeded - cleaning up...');
          // Clean up the test record
          await supabase
            .from('nutrition_profiles')
            .delete()
            .eq('client_id', '00000000-0000-0000-0000-000000000000');
        }
      }
    } else {
      console.log('✅ Schema information:', columns);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n🔍 Checking related tables...\n');
  
  // Check if clients table exists and has the right structure
  try {
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, user_id')
      .limit(1);
    
    if (clientError) {
      console.log('❌ Clients table issue:', clientError.message);
    } else {
      console.log('✅ Clients table accessible');
      if (clientData && clientData.length > 0) {
        console.log('Client table columns:', Object.keys(clientData[0]));
      }
    }
  } catch (error) {
    console.log('❌ Error checking clients table:', error.message);
  }
}

// Function to check cache status
async function checkCacheStatus() {
  console.log('\n🔍 Checking Supabase schema cache...\n');
  
  try {
    // Try to force a schema refresh by attempting different column names
    console.log('Testing different column references...');
    
    // Test client_id
    const { error: clientIdError } = await supabase
      .from('nutrition_profiles')
      .select('client_id')
      .limit(0);
    
    // Test lead_id  
    const { error: leadIdError } = await supabase
      .from('nutrition_profiles')
      .select('lead_id')
      .limit(0);
    
    console.log('client_id query error:', clientIdError?.message || 'No error');
    console.log('lead_id query error:', leadIdError?.message || 'No error');
    
  } catch (error) {
    console.log('Cache check error:', error.message);
  }
}

async function main() {
  await checkNutritionSchema();
  await checkCacheStatus();
}

main().catch(console.error);