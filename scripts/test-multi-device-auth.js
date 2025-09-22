#!/usr/bin/env node

/**
 * Test script for multi-device authentication
 * Tests concurrent login scenarios to ensure users can log in from multiple devices
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_EMAIL = process.env.TEST_MEMBER_EMAIL || 'test-member@example.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create clients to simulate different devices
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const device1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Simulate different devices
  },
});

const device2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Simulate different devices
  },
});

async function findTestUser() {
  console.log('🔍 Finding test user...');
  
  const { data: client, error } = await adminClient
    .from('clients')
    .select('id, email, user_id, organization_id')
    .eq('email', TEST_EMAIL.toLowerCase())
    .single();

  if (error || !client) {
    console.error('❌ Test user not found:', error?.message);
    console.log('💡 Please ensure a test user exists with email:', TEST_EMAIL);
    return null;
  }

  console.log('✅ Test user found:', {
    id: client.id,
    email: client.email,
    user_id: client.user_id,
    organization_id: client.organization_id,
  });

  return client;
}

async function createSessionForDevice(deviceName, userId) {
  console.log(`📱 Creating session for ${deviceName}...`);
  
  try {
    const { data: sessionData, error } = await adminClient.auth.admin.createSession({
      user_id: userId,
    });

    if (error) {
      console.error(`❌ Failed to create session for ${deviceName}:`, error.message);
      return null;
    }

    if (!sessionData?.session) {
      console.error(`❌ No session data returned for ${deviceName}`);
      return null;
    }

    console.log(`✅ Session created for ${deviceName}:`, {
      user_id: sessionData.session.user.id,
      expires_at: sessionData.session.expires_at,
      session_length: sessionData.session.access_token.length,
    });

    return sessionData.session;

  } catch (error) {
    console.error(`❌ Unexpected error creating session for ${deviceName}:`, error.message);
    return null;
  }
}

async function setSessionOnDevice(deviceClient, deviceName, session) {
  console.log(`🔗 Setting session on ${deviceName}...`);
  
  try {
    const { data, error } = await deviceClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error(`❌ Failed to set session on ${deviceName}:`, error.message);
      return false;
    }

    if (!data?.session) {
      console.error(`❌ Session not properly set on ${deviceName}`);
      return false;
    }

    console.log(`✅ Session active on ${deviceName}:`, {
      user_id: data.session.user.id,
      email: data.session.user.email,
    });

    return true;

  } catch (error) {
    console.error(`❌ Unexpected error setting session on ${deviceName}:`, error.message);
    return false;
  }
}

async function verifySessionOnDevice(deviceClient, deviceName) {
  console.log(`🔍 Verifying session on ${deviceName}...`);
  
  try {
    const { data: { session }, error } = await deviceClient.auth.getSession();

    if (error) {
      console.error(`❌ Error getting session on ${deviceName}:`, error.message);
      return false;
    }

    if (!session) {
      console.error(`❌ No active session on ${deviceName}`);
      return false;
    }

    // Check if session is still valid (not expired)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const isExpired = expiresAt <= Date.now();

    if (isExpired) {
      console.error(`❌ Session expired on ${deviceName}`);
      return false;
    }

    console.log(`✅ Session verified on ${deviceName}:`, {
      user_id: session.user.id,
      email: session.user.email,
      expires_at: new Date(expiresAt).toISOString(),
      time_until_expiry: Math.round((expiresAt - Date.now()) / 1000 / 60) + ' minutes',
    });

    return true;

  } catch (error) {
    console.error(`❌ Unexpected error verifying session on ${deviceName}:`, error.message);
    return false;
  }
}

async function testConcurrentSessions() {
  console.log('🚀 Starting multi-device authentication test...\n');
  
  // Step 1: Find test user
  const testUser = await findTestUser();
  if (!testUser || !testUser.user_id) {
    console.error('❌ Cannot proceed without valid test user');
    return false;
  }

  console.log('\n📱 Testing concurrent device sessions...\n');

  // Step 2: Create sessions for both devices
  const device1Session = await createSessionForDevice('Device 1 (Laptop)', testUser.user_id);
  if (!device1Session) return false;

  console.log(''); // Spacing

  const device2Session = await createSessionForDevice('Device 2 (Phone)', testUser.user_id);
  if (!device2Session) return false;

  console.log('\n🔗 Setting up sessions on devices...\n');

  // Step 3: Set sessions on both devices
  const device1Success = await setSessionOnDevice(device1Client, 'Device 1 (Laptop)', device1Session);
  if (!device1Success) return false;

  console.log(''); // Spacing

  const device2Success = await setSessionOnDevice(device2Client, 'Device 2 (Phone)', device2Session);
  if (!device2Success) return false;

  console.log('\n🔍 Verifying concurrent sessions...\n');

  // Step 4: Verify both sessions are active simultaneously
  const device1Valid = await verifySessionOnDevice(device1Client, 'Device 1 (Laptop)');
  console.log(''); // Spacing

  const device2Valid = await verifySessionOnDevice(device2Client, 'Device 2 (Phone)');

  console.log('\n📊 Multi-Device Authentication Test Results:');
  console.log('================================================');
  console.log(`Device 1 Session: ${device1Valid ? '✅ ACTIVE' : '❌ FAILED'}`);
  console.log(`Device 2 Session: ${device2Valid ? '✅ ACTIVE' : '❌ FAILED'}`);
  console.log(`Concurrent Sessions: ${device1Valid && device2Valid ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);

  if (device1Valid && device2Valid) {
    console.log('\n🎉 SUCCESS: Multi-device authentication is working correctly!');
    console.log('Users can now log in from multiple devices simultaneously.');
    return true;
  } else {
    console.log('\n❌ FAILURE: Multi-device authentication is not working properly.');
    console.log('Users may experience issues logging in from multiple devices.');
    return false;
  }
}

async function main() {
  try {
    const success = await testConcurrentSessions();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { testConcurrentSessions };