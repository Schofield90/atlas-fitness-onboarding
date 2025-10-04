#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function nuclearDelete() {
  try {
    console.log('☢️  NUCLEAR DELETE MODE - Removing ALL data from related tables');

    // Delete ALL from each table (not just client-related)
    const tables = [
      'lead_tags',
      'bookings',
      'class_bookings',
      'memberships',
      'payments'
    ];

    for (const table of tables) {
      try {
        console.log(`  Deleting ALL from ${table}...`);
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && error.code !== '42P01') {
          console.error(`  Error: ${error.message}`);
        } else {
          console.log(`  ✅ Cleared ${table}`);
        }
      } catch (err) {
        console.log(`  (${table} not found or error)`);
      }
    }

    // Now delete ALL clients
    console.log('\n🗑️  Deleting ALL clients...');
    const { error: clientError } = await supabase
      .from('clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clientError) {
      console.error('❌ Error deleting clients:', clientError.message);
    } else {
      console.log('✅ All clients deleted!');
    }

    // Verify
    const { count } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Final count: ${count} clients remaining`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

nuclearDelete();
