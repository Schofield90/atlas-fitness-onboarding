#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTI1MzksImV4cCI6MjA2ODA2ODUzOX0.8rGsdaYcnwFIyWEhKKqz-W-KsOAP6WRTuEv8UrzkKuc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugLookup() {
  console.log('Testing client lookup...\n');
  
  const email = 'sam@atlas-gyms.co.uk';
  
  try {
    // Try with ilike
    const { data: client1, error: error1 } = await supabase
      .from('clients')
      .select('id, first_name, last_name, user_id, phone, email')
      .ilike('email', email)
      .maybeSingle();
    
    console.log('Result with ilike:');
    console.log('Data:', client1);
    console.log('Error:', error1);
    console.log('');
    
    // Try with eq
    const { data: client2, error: error2 } = await supabase
      .from('clients')
      .select('id, first_name, last_name, user_id, phone, email')
      .eq('email', email)
      .maybeSingle();
    
    console.log('Result with eq:');
    console.log('Data:', client2);
    console.log('Error:', error2);
    console.log('');
    
    // Try getting all clients
    const { data: allClients, error: error3 } = await supabase
      .from('clients')
      .select('email')
      .limit(5);
    
    console.log('All client emails:');
    console.log(allClients);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugLookup();