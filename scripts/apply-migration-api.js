#!/usr/bin/env node

/**
 * Apply Migration via Supabase Management API
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('🚀 Applying Facebook Integration Migration');
  console.log('=' .repeat(60));
  
  // Extract project reference from URL
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error('❌ Could not extract project reference from URL');
    return;
  }
  
  console.log('📦 Project:', projectRef);
  
  // Read migration
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250823_fix_facebook_integration_critical.sql');
  const migrationSQL = await fs.readFile(migrationPath, 'utf8');
  
  // Split into individual statements
  const statements = migrationSQL
    .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|$))/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--.*$/));
  
  console.log(`📝 Found ${statements.length} SQL statements to execute`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    
    // Skip pure comments
    if (statement.startsWith('--')) continue;
    
    const preview = statement.substring(0, 50).replace(/\n/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: statement + ';' })
      });
      
      if (response.ok) {
        console.log('✅');
        successCount++;
      } else {
        const error = await response.text();
        if (error.includes('does not exist') || error.includes('already exists')) {
          console.log('⚠️  (expected)');
          successCount++;
        } else {
          console.log('❌');
          console.log(`   Error: ${error.substring(0, 100)}`);
          errors.push({ statement: preview, error });
          errorCount++;
        }
      }
    } catch (error) {
      console.log('❌');
      console.log(`   Error: ${error.message}`);
      errors.push({ statement: preview, error: error.message });
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Results:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  
  if (errorCount > 0 && errorCount > successCount / 2) {
    console.log('\n❌ Too many errors. Migration may need manual application.');
    console.log('\n📝 Manual Steps:');
    console.log('1. The migration SQL is in your clipboard');
    console.log('2. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new');
    console.log('3. Paste and run the SQL');
  } else {
    console.log('\n✅ Migration completed!');
    console.log('\n🎉 Next Steps:');
    console.log('1. Go to: https://atlas-fitness-onboarding.vercel.app/integrations/facebook');
    console.log('2. Click "Sync Pages from Facebook"');
    console.log('3. Your 25 pages should appear!');
  }
}

applyMigration().catch(console.error);