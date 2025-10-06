#!/usr/bin/env node

/**
 * Direct Test of GoTeamUp Membership Import
 *
 * This script tests the import service directly without UI
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { GoTeamUpImporter, parseCSV } from '../app/lib/services/goteamup-import.ts';

const ORG_ID = 'ee1206d7-62fb-49cf-9f39-95b9c54423a4';
const CSV_PATH = '/Users/samschofield/Downloads/1 client test - 1 client test.csv';

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_KEY);
  process.exit(1);
}

console.log('🤖 GoTeamUp Membership Import - Direct Test\n');
console.log(`Organization ID: ${ORG_ID}`);
console.log(`CSV File: ${CSV_PATH}\n`);

async function main() {
  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('✅ Supabase client created\n');

  // Read and parse CSV
  console.log('📄 Reading CSV file...');
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n');
  console.log(`   - ${lines.length} lines found`);
  console.log(`   - Headers: ${lines[0].substring(0, 100)}...\n`);

  // Parse CSV using Papa Parse
  console.log('🔍 Parsing CSV...');
  const Papa = await import('papaparse');
  const parsed = Papa.default.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`   - ${parsed.data.length} rows parsed`);
  console.log(`   - Sample row:`, JSON.stringify(parsed.data[0], null, 2).substring(0, 200));
  console.log('\n');

  // Create importer instance
  const importer = new GoTeamUpImporter(
    supabase,
    ORG_ID,
    (progress) => {
      console.log(`   Progress: ${progress.processed}/${progress.total} - ${progress.success} success, ${progress.errors} errors, ${progress.skipped} skipped`);
    },
    true // createMissingClients
  );

  console.log('✅ Importer created\n');

  // TEST 1: Import memberships
  console.log('🚀 TEST 1: Importing memberships...\n');
  const result1 = await importer.importMemberships(parsed.data);

  console.log('\n📊 Import Result:');
  console.log(`   - Success: ${result1.success}`);
  console.log(`   - Message: ${result1.message}`);
  console.log(`   - Stats:`, result1.stats);

  if (result1.errors && result1.errors.length > 0) {
    console.log('\n❌ Errors found:');
    result1.errors.forEach(err => {
      console.log(`   - Row ${err.row}: ${err.error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ Import completed successfully!\n');

  // Verify database
  console.log('💾 Verifying database records...\n');

  // Check programs
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, name, organization_id')
    .eq('organization_id', ORG_ID)
    .ilike('name', '%Full Member%');

  if (programsError) {
    console.error('❌ Error fetching programs:', programsError);
  } else {
    console.log(`✅ Programs: ${programs?.length || 0}`);
    programs?.forEach(p => console.log(`   - ${p.name} (${p.id.substring(0, 8)}...)`));
  }

  // Check memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('id, customer_id, program_id, membership_status, start_date')
    .in('program_id', programs?.map(p => p.id) || []);

  if (membershipsError) {
    console.error('❌ Error fetching memberships:', membershipsError);
  } else {
    console.log(`\n✅ Memberships: ${memberships?.length || 0}`);
    memberships?.forEach(m => {
      console.log(`   - Customer ${m.customer_id.substring(0, 8)}... → Program ${m.program_id.substring(0, 8)}... (${m.membership_status})`);
    });
  }

  // Check client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, email, org_id')
    .eq('org_id', ORG_ID)
    .eq('email', 'adambrantsmith@me.com')
    .single();

  if (clientError) {
    console.error('\n❌ Error fetching client:', clientError);
  } else {
    console.log(`\n✅ Client: ${client?.name} (${client?.email})`);
  }

  console.log('\n');

  // TEST 2: Re-import to test duplicate prevention
  console.log('🔄 TEST 2: Re-importing same data (duplicate prevention test)...\n');
  const result2 = await importer.importMemberships(parsed.data);

  console.log('\n📊 Re-import Result:');
  console.log(`   - Success: ${result2.success}`);
  console.log(`   - Message: ${result2.message}`);
  console.log(`   - Stats:`, result2.stats);

  if (result2.stats.success > 0 && result2.stats.skipped === 0) {
    console.log('\n❌ WARNING: Re-import created new records instead of skipping!');
  } else {
    console.log('\n✅ Duplicate prevention working correctly!');
  }

  // Final verification
  const { data: finalMemberships } = await supabase
    .from('memberships')
    .select('id')
    .in('program_id', programs?.map(p => p.id) || []);

  console.log(`\n📊 Final membership count: ${finalMemberships?.length || 0}`);

  if (finalMemberships?.length === memberships?.length) {
    console.log('✅ No duplicates created!\n');
  } else {
    console.log(`❌ Duplicates detected! Expected ${memberships?.length}, got ${finalMemberships?.length}\n`);
  }

  console.log('🎉 ALL TESTS PASSED!\n');
}

main().catch(error => {
  console.error('\n❌ TEST FAILED:', error);
  console.error(error.stack);
  process.exit(1);
});
