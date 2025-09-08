#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const SUPABASE_URL = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearClientsTable() {
  const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';
  
  console.log('🔍 Checking clients table...');
  
  try {
    // First, check what's in the clients table
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('org_id', organizationId);
    
    if (fetchError) {
      console.error('Error fetching clients:', fetchError);
      return;
    }
    
    console.log(`Found ${clients?.length || 0} clients in the clients table:`);
    clients?.forEach(client => {
      console.log(`- ${client.first_name} ${client.last_name} (${client.email})`);
    });
    
    if (clients && clients.length > 0) {
      console.log('\n⚠️  Clearing clients table...');
      console.log('Starting in 3 seconds... Press Ctrl+C to cancel');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clear all clients for this organization
      const { data: deleted, error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('org_id', organizationId)
        .select();
      
      if (deleteError) {
        console.error('Error deleting clients:', deleteError);
      } else {
        console.log(`✅ Deleted ${deleted?.length || 0} clients from the clients table`);
      }
    } else {
      console.log('✅ No clients found - table is already empty');
    }
    
    // Also check if there are any bookings referencing these clients
    console.log('\n🔍 Checking for bookings referencing clients...');
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, client_id')
      .eq('organization_id', organizationId);
    
    if (bookings && bookings.length > 0) {
      console.log(`Found ${bookings.length} bookings that might reference clients`);
      
      // Clear client_id references
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ client_id: null })
        .eq('organization_id', organizationId);
      
      if (updateError) {
        console.error('Error clearing client references:', updateError);
      } else {
        console.log('✅ Cleared client references from bookings');
      }
    }
    
    console.log('\n🎉 Clients table cleared successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

clearClientsTable().catch(console.error);