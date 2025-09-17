const fs = require('fs');

async function testProductionFinal() {
  // Read the brand new test CSV file
  const csvContent = fs.readFileSync('./test-production-new.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-production-new.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('='.repeat(60));
  console.log('FINAL PRODUCTION TEST WITH DUPLICATE FIX');
  console.log('='.repeat(60));
  console.log('URL: https://atlas-fitness-onboarding.vercel.app');
  console.log('Testing with 3 BRAND NEW records never imported before');
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
      console.log('\n' + '✅'.repeat(10));
      console.log(`✅ SUCCESS! The fix is working in PRODUCTION!`);
      console.log(`✅ Imported ${result.stats.success} new attendance records`);
      if (result.stats.newClients > 0) {
        console.log(`✅ Created ${result.stats.newClients} new clients`);
      }
      console.log('✅'.repeat(10));
      console.log('\n🎉 Your GoTeamUp attendance import is now FULLY WORKING!');
    } else if (result.stats.skipped === result.stats.total) {
      console.log(`\n⚠️  Records were skipped - they may already exist`);
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

testProductionFinal();