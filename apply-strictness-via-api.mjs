#!/usr/bin/env node

import fetch from 'node-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

console.log('🔧 Applying strictness_level column migration...\n');

// Execute raw SQL via Supabase's PostgREST query endpoint
const sql = `
-- Step 1: Add strictness_level column
ALTER TABLE sops
ADD COLUMN IF NOT EXISTS strictness_level TEXT DEFAULT 'guideline'
CHECK (strictness_level IN ('exact_script', 'guideline', 'general_tone'));

-- Step 2: Add comment
COMMENT ON COLUMN sops.strictness_level IS 'exact_script: Copy word-for-word | guideline: Follow closely but allow adaptation | general_tone: Use as general guidance only';
`;

console.log('📝 SQL to execute:');
console.log(sql);
console.log('\n---\n');

// For ALTER TABLE, we need to use Supabase's SQL endpoint directly
// Unfortunately, Supabase's REST API doesn't support DDL statements
// We'll need to apply this via the Supabase Dashboard SQL Editor

console.log('⚠️  ALTER TABLE statements cannot be executed via Supabase REST API');
console.log('');
console.log('📋 Please apply this migration manually:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
console.log('2. Paste the following SQL:');
console.log('');
console.log('---START---');
console.log(sql);
console.log('---END---');
console.log('');
console.log('3. Click "Run"');
console.log('');
console.log('4. Then run this script again to update the SOP strictness levels');
console.log('');

// Check if column exists by trying to query it
console.log('🔍 Checking if column already exists...\n');

try {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/sops?select=id,name,strictness_level&limit=1`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.ok) {
    console.log('✅ Column already exists! Proceeding to update SOPs...\n');

    // Update SOPs with appropriate strictness levels
    const updates = [
      { pattern: 'First message%', level: 'exact_script', description: 'First message (exact script)' },
      { pattern: 'Second message%', level: 'exact_script', description: 'Second message (exact script)' },
      { pattern: 'Third message%', level: 'exact_script', description: 'Third message (exact script)' },
      { pattern: '%Tone%', level: 'general_tone', description: 'Tone SOP (general guidance)' },
      { pattern: '%price%', level: 'guideline', description: 'Pricing SOP (guideline)' },
      { pattern: '%Book%', level: 'guideline', description: 'Booking SOP (guideline)' }
    ];

    for (const update of updates) {
      console.log(`Updating: ${update.description}`);

      // Fetch SOPs matching pattern
      const fetchResponse = await fetch(
        `${supabaseUrl}/rest/v1/sops?select=id,name&name=ilike.${encodeURIComponent(update.pattern)}`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const sops = await fetchResponse.json();

      if (sops.length > 0) {
        // Update each matching SOP
        for (const sop of sops) {
          const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/sops?id=eq.${sop.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({ strictness_level: update.level })
            }
          );

          if (updateResponse.ok) {
            console.log(`  ✅ Updated: ${sop.name}`);
          } else {
            const error = await updateResponse.text();
            console.log(`  ❌ Failed to update ${sop.name}: ${error}`);
          }
        }
      } else {
        console.log(`  ⚠️  No SOPs found matching "${update.pattern}"`);
      }
    }

    console.log('\n✅ Migration complete!\n');

    // Verify results
    const verifyResponse = await fetch(
      `${supabaseUrl}/rest/v1/sops?select=name,strictness_level&order=name`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const allSops = await verifyResponse.json();
    console.log('📊 Final SOP strictness levels:\n');
    console.table(allSops);

  } else {
    const error = await response.text();
    console.log('❌ Column does not exist yet. Please apply the migration via Supabase Dashboard first.');
    console.log(`Error: ${error}`);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
