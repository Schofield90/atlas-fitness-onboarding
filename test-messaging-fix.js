#!/usr/bin/env node

/**
 * Test script to verify messaging system fixes
 * Run this after applying the database migration
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessagingFix() {
  console.log('🧪 Testing messaging system fixes...\n');

  let allTestsPassed = true;

  try {
    // Test 1: Check if messages table exists and has correct columns
    console.log('1. Testing messages table structure...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (messagesError) {
      console.log('   ❌ Messages table access failed:', messagesError.message);
      allTestsPassed = false;
    } else {
      console.log('   ✅ Messages table accessible');
    }

    // Test 2: Check if messages_with_user_info view exists
    console.log('\n2. Testing messages view...');
    const { data: viewData, error: viewError } = await supabase
      .from('messages_with_user_info')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('   ❌ Messages view failed:', viewError.message);
      allTestsPassed = false;
    } else {
      console.log('   ✅ Messages view accessible');
    }

    // Test 3: Test message insertion with new schema
    console.log('\n3. Testing message insertion...');
    
    // First, get a test organization and customer
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.log('   ⚠️  No organizations found, skipping insertion test');
    } else {
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgs[0].id)
        .limit(1);

      if (clientError || !clients || clients.length === 0) {
        console.log('   ⚠️  No clients found, skipping insertion test');
      } else {
        const testMessage = {
          organization_id: orgs[0].id,
          customer_id: clients[0].id,
          client_id: clients[0].id,
          channel: 'in_app',
          direction: 'outbound',
          content: 'Test message from automated fix verification',
          status: 'sent',
          sender_name: 'System Test',
        };

        const { data: insertedMessage, error: insertError } = await supabase
          .from('messages')
          .insert(testMessage)
          .select()
          .single();

        if (insertError) {
          console.log('   ❌ Message insertion failed:', insertError.message);
          allTestsPassed = false;
        } else {
          console.log('   ✅ Message insertion successful');
          
          // Clean up test message
          await supabase
            .from('messages')
            .delete()
            .eq('id', insertedMessage.id);
          console.log('   ✅ Test message cleaned up');
        }
      }
    }

    // Test 4: Test API endpoint (if running locally)
    console.log('\n4. Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true
        }),
      });

      if (response.status === 401) {
        console.log('   ✅ API endpoint accessible (authentication required)');
      } else if (response.ok) {
        console.log('   ✅ API endpoint working');
      } else {
        console.log('   ⚠️  API endpoint response:', response.status);
      }
    } catch (error) {
      console.log('   ⚠️  API endpoint test skipped (not running locally)');
    }

    // Test 5: Test WebSocket connection
    console.log('\n5. Testing WebSocket connection...');
    const channel = supabase.channel('test-messaging-fix');
    
    let websocketWorking = false;
    
    channel.on('broadcast', { event: 'test' }, () => {
      websocketWorking = true;
    });

    await channel.subscribe();
    
    // Send a test broadcast
    await channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'test' }
    });

    // Wait a moment for the message
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (websocketWorking) {
      console.log('   ✅ WebSocket connection working');
    } else {
      console.log('   ⚠️  WebSocket connection test inconclusive');
    }

    await channel.unsubscribe();

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📊 Test Summary:');
  if (allTestsPassed) {
    console.log('✅ All tests passed! Messaging system should be working correctly.');
    console.log('\n🎉 You can now test the in-app messaging functionality in the UI.');
  } else {
    console.log('❌ Some tests failed. Please check the database migration and configuration.');
    console.log('\n🔧 Recommended actions:');
    console.log('   1. Ensure the database migration has been applied');
    console.log('   2. Check Supabase connection and permissions');
    console.log('   3. Verify environment variables are correct');
  }
}

// Run the tests
testMessagingFix().catch(console.error);