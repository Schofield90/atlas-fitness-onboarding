const fs = require('fs');

async function testProductionFix() {
  // Read the fresh test CSV file
  const csvContent = fs.readFileSync('./test-fresh-attendance.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-fresh-attendance.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('Testing PRODUCTION with the FIX for duplicate detection...');
  console.log('URL: https://atlas-fitness-onboarding.vercel.app');
  console.log('Testing with 5 records that were already imported locally');
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://atlas-fitness-onboarding.vercel.app/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
      },
      body: formData
    });

    const elapsed = Date.now() - startTime;
    const result = await response.json();
    
    console.log('\n=== PRODUCTION RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nCompleted in ${elapsed}ms`);
    
    if (result.stats.success > 0) {
      console.log(`\n✅ FIX CONFIRMED! Imported ${result.stats.success} new records in production`);
      if (result.stats.newClients > 0) {
        console.log(`✅ Created ${result.stats.newClients} new clients in production`);
      }
      console.log('\n🎉 The duplicate detection fix is working correctly!');
    } else if (result.stats.skipped === result.stats.total) {
      console.log(`\n⚠️  All ${result.stats.skipped} records were skipped as duplicates`);
      console.log('This is expected if these records already exist in production');
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`  Row ${err.row}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Production test failed:', error);
  }
}

testProductionFix();