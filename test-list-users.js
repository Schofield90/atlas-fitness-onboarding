#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testListUsers() {
  console.log('Testing listUsers...\n');
  
  try {
    // List all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return;
    }
    
    console.log(`Found ${users.users.length} users:`);
    users.users.forEach(user => {
      console.log(`- ${user.email} (${user.id})`);
    });
    
    // Check if Sam exists
    const samUser = users.users.find(u => u.email?.toLowerCase() === 'sam@atlas-gyms.co.uk');
    if (samUser) {
      console.log('\nSam found!');
      console.log('User ID:', samUser.id);
      console.log('Created at:', samUser.created_at);
    } else {
      console.log('\nSam not found in auth users');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testListUsers();