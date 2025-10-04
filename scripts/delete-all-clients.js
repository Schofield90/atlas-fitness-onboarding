#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllClients() {
  try {
    console.log('🔍 Fetching all clients...');

    // Get all clients
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, email, organization_id');

    if (fetchError) {
      console.error('Error fetching clients:', fetchError);
      return;
    }

    console.log(`📊 Found ${clients?.length || 0} clients`);

    if (!clients || clients.length === 0) {
      console.log('✅ No clients to delete');
      return;
    }

    const clientIds = clients.map(c => c.id);

    // Delete related data in order (to respect foreign key constraints)

    console.log('🗑️  Deleting bookings...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .in('client_id', clientIds);

    if (bookingsError) console.error('Error deleting bookings:', bookingsError);

    console.log('🗑️  Deleting class_bookings...');
    const { error: classBookingsError } = await supabase
      .from('class_bookings')
      .delete()
      .in('client_id', clientIds);

    if (classBookingsError) console.error('Error deleting class_bookings:', classBookingsError);

    console.log('🗑️  Deleting memberships...');
    const { error: membershipsError } = await supabase
      .from('memberships')
      .delete()
      .in('customer_id', clientIds);

    if (membershipsError) console.error('Error deleting memberships:', membershipsError);

    console.log('🗑️  Deleting lead_tags...');
    const { error: tagsError } = await supabase
      .from('lead_tags')
      .delete()
      .in('client_id', clientIds);

    if (tagsError) console.error('Error deleting lead_tags:', tagsError);

    console.log('🗑️  Deleting payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .in('client_id', clientIds);

    if (paymentsError && paymentsError.code !== '42703') {
      console.error('Error deleting payments:', paymentsError);
    }

    console.log('🗑️  Deleting clients...');
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .in('id', clientIds);

    if (clientsError) {
      console.error('Error deleting clients:', clientsError);
      return;
    }

    console.log(`✅ Successfully deleted ${clients.length} clients and all related data`);

    // Verify deletion
    const { data: remainingClients } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true });

    console.log(`📊 Remaining clients: ${remainingClients?.length || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deleteAllClients();
