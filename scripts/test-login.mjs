#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIzMzcwOTAsImV4cCI6MjAzNzkxMzA5MH0.Ws-VL42PrpLQs7Lv_Mq6XhBWHSlJ1CsDHk8Lm_Uo_Dc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🔐 Testing login...\n');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@test.co.uk',
    password: 'Test123'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }

  console.log('✅ Login successful!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Email confirmed:', !!data.user.email_confirmed_at);

  // Test fetching user's organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('user_organizations')
    .select('organization_id, role, organizations(name, slug)')
    .eq('user_id', data.user.id);

  if (orgsError) {
    console.error('\n⚠️ Error fetching organizations:', orgsError.message);
  } else {
    console.log('\n📊 User Organizations:');
    orgs.forEach(org => {
      console.log(`  - ${org.organizations.name} (${org.role})`);
      console.log(`    Slug: ${org.organizations.slug}`);
    });
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Test complete!');
}

testLogin().catch(console.error);
