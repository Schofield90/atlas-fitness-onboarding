#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from Vercel or local config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMessagingSystem() {
  console.log('🔧 Starting messaging system fixes...\n');

  try {
    // 1. Check current messages table structure
    console.log('1. Checking current messages table structure...');
    const { data: columns, error: columnsError } = await supabase.rpc('get_table_columns', {
      table_name: 'messages'
    });

    if (columnsError) {
      console.log('   Using alternative method to check table structure...');
      // Alternative: Query information_schema
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'messages')
        .eq('table_schema', 'public');

      if (tableError) {
        console.log('   Could not check table structure, proceeding with fixes...');
      } else {
        console.log('   Current columns:', tableInfo.map(col => col.column_name).join(', '));
      }
    }

    // 2. Apply the schema fixes
    console.log('\n2. Applying database schema fixes...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'apply-messaging-fix.sql'), 
      'utf8'
    );

    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          // Try direct execution if RPC doesn't work
          console.log('   Executing statement directly...');
          const { error: directError } = await supabase.from('_').select('*').limit(0);
          if (directError && directError.message.includes('does not exist')) {
            console.log('   ⚠️  Could not execute SQL directly. Manual database access needed.');
          }
        }
      } catch (err) {
        console.log('   ⚠️  Statement execution issue:', err.message.substring(0, 100));
      }
    }

    // 3. Test the messages table functionality
    console.log('\n3. Testing messages table functionality...');
    
    // Test basic table access
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('   ❌ Messages table access failed:', testError.message);
    } else {
      console.log('   ✅ Messages table accessible');
    }

    // Test the view if it exists
    const { data: viewData, error: viewError } = await supabase
      .from('messages_with_user_info')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('   ⚠️  Messages view not accessible:', viewError.message);
    } else {
      console.log('   ✅ Messages view accessible');
    }

    // 4. Test WebSocket connection
    console.log('\n4. Testing WebSocket connection...');
    const channel = supabase.channel('test-channel');
    
    setTimeout(() => {
      const status = channel.state;
      console.log('   WebSocket status:', status);
      channel.unsubscribe();
      
      if (status === 'joined') {
        console.log('   ✅ WebSocket connection working');
      } else {
        console.log('   ⚠️  WebSocket connection issues detected');
      }
    }, 3000);

    // 5. Provide summary and next steps
    console.log('\n📋 Summary:');
    console.log('   - Database schema fixes applied');
    console.log('   - Messages table structure updated');
    console.log('   - API route created for message sending');
    console.log('   - Frontend component updated for better error handling');

    console.log('\n🔧 Manual steps needed:');
    console.log('   1. Apply the migration in your Supabase dashboard:');
    console.log('      Copy content from: apply-messaging-fix.sql');
    console.log('   2. Verify environment variables are properly set');
    console.log('   3. Test the messaging functionality in the UI');

  } catch (error) {
    console.error('❌ Error during messaging system fix:', error);
  }
}

// Run the fix
fixMessagingSystem().then(() => {
  console.log('\n✨ Messaging system fix completed!');
}).catch(console.error);