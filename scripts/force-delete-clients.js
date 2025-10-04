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

async function forceDeleteAllClients() {
  try {
    console.log('🔍 Counting clients...');

    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Found ${count} clients to delete`);

    if (count === 0) {
      console.log('✅ No clients to delete');
      return;
    }

    // Use raw SQL to delete with proper cascading
    console.log('🗑️  Deleting all client data using SQL...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Delete all related data first
        DELETE FROM lead_tags WHERE client_id IN (SELECT id FROM clients);
        DELETE FROM bookings WHERE client_id IN (SELECT id FROM clients);
        DELETE FROM class_bookings WHERE client_id IN (SELECT id FROM clients);
        DELETE FROM memberships WHERE customer_id IN (SELECT id FROM clients);
        DELETE FROM payments WHERE client_id IN (SELECT id FROM clients);

        -- Delete all clients
        DELETE FROM clients;

        -- Return counts
        SELECT
          (SELECT COUNT(*) FROM clients) as clients,
          (SELECT COUNT(*) FROM memberships) as memberships,
          (SELECT COUNT(*) FROM bookings) as bookings;
      `
    });

    if (error) {
      // If exec_sql doesn't exist, try direct deletion with ignore errors
      console.log('⚠️  exec_sql function not available, using alternative method...');

      // Get all client IDs
      const { data: clients } = await supabase.from('clients').select('id');
      const clientIds = clients?.map(c => c.id) || [];

      if (clientIds.length === 0) {
        console.log('✅ No clients to delete');
        return;
      }

      // Try to delete related data (ignore errors for non-existent tables)
      const tables = [
        { name: 'lead_tags', column: 'client_id' },
        { name: 'bookings', column: 'client_id' },
        { name: 'class_bookings', column: 'client_id' },
        { name: 'memberships', column: 'customer_id' },
        { name: 'payments', column: 'client_id' }
      ];

      for (const table of tables) {
        try {
          console.log(`  Deleting from ${table.name}...`);
          await supabase.from(table.name).delete().in(table.column, clientIds);
        } catch (err) {
          console.log(`  (${table.name} not found or already clean)`);
        }
      }

      // Delete clients with CASCADE by updating foreign key temporarily
      console.log('  Deleting clients...');

      // Try batch delete
      const batchSize = 50;
      for (let i = 0; i < clientIds.length; i += batchSize) {
        const batch = clientIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`Error deleting batch ${i}-${i + batchSize}:`, deleteError.message);
        } else {
          console.log(`  Deleted ${batch.length} clients (${i + batchSize}/${clientIds.length})`);
        }
      }
    } else {
      console.log('✅ Successfully deleted all data using SQL');
      console.log('📊 Final counts:', data);
    }

    // Verify deletion
    const { count: remainingCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Remaining clients: ${remainingCount}`);

    if (remainingCount === 0) {
      console.log('✅ All clients successfully deleted!');
    } else {
      console.log(`⚠️  ${remainingCount} clients could not be deleted (may have protected foreign keys)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

forceDeleteAllClients();
