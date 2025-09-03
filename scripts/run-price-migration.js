#!/usr/bin/env node

const https = require('https');

// Check for auth cookie from command line
const authCookie = process.argv[2];
const domain = process.argv[3] || 'atlas-fitness-onboarding.vercel.app';

if (!authCookie) {
  console.log('Usage: node run-price-migration.js <auth-cookie> [domain]');
  console.log('Example: node run-price-migration.js "sb-auth-token=..." atlas-fitness-onboarding.vercel.app');
  process.exit(1);
}

console.log(`Running price migration on ${domain}...`);

// First, check current status
const checkStatus = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: '/api/migrate-prices',
      method: 'GET',
      headers: {
        'Cookie': authCookie
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('\n📊 Current Status:');
          console.log(`Total plans: ${result.summary?.total_plans || 0}`);
          console.log(`Plans with price field: ${result.summary?.plans_with_price || 0}`);
          console.log(`Plans with price_pennies: ${result.summary?.plans_with_price_pennies || 0}`);
          console.log(`Needs migration: ${result.summary?.needs_migration || 0}`);
          
          if (result.plans) {
            console.log('\n📋 Plan Details:');
            result.plans.forEach(plan => {
              console.log(`- ${plan.name}: price=${plan.price}, price_pennies=${plan.price_pennies} ${plan.needs_migration ? '⚠️ NEEDS MIGRATION' : '✅'}`);
            });
          }
          
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Run the migration
const runMigration = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      path: '/api/migrate-prices',
      method: 'POST',
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('\n🚀 Migration Results:');
          console.log(`Message: ${result.message}`);
          console.log(`Checked: ${result.checked} plans`);
          console.log(`Migrated: ${result.migrated} plans`);
          
          if (result.errors && result.errors.length > 0) {
            console.log('\n⚠️ Errors:');
            result.errors.forEach(err => console.log(`  - ${err}`));
          }
          
          if (result.verification) {
            console.log('\n✅ Verification:');
            result.verification.forEach(v => {
              console.log(`  - ${v.name}: ${v.status}`);
            });
          }
          
          resolve(result);
        } catch (e) {
          console.error('Failed to parse response:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Main execution
async function main() {
  try {
    console.log('🔍 Checking current status...');
    const status = await checkStatus();
    
    if (status.summary?.needs_migration > 0) {
      console.log(`\n🔄 Found ${status.summary.needs_migration} plans that need migration.`);
      console.log('Running migration...\n');
      
      const migrationResult = await runMigration();
      
      console.log('\n🎉 Migration complete!');
      
      // Check status again
      console.log('\n🔍 Verifying final status...');
      await checkStatus();
    } else {
      console.log('\n✅ No migration needed - all plans already have price_pennies set!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    process.exit(1);
  }
}

main();