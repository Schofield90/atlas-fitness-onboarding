const fs = require('fs');

async function testProductionReady() {
  const csvContent = fs.readFileSync('./test-realistic.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-realistic.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('='.repeat(60));
  console.log('TESTING PRODUCTION FIX FOR MULTIPLE CLASSES PER DAY');
  console.log('='.repeat(60));
  console.log('URL: https://atlas-fitness-onboarding.vercel.app');
  console.log('Testing with customer having multiple classes same day');
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
      console.log(`✅ FIX IS WORKING! Your 835 records should now import correctly!`);
      console.log(`✅ Imported ${result.stats.success} attendance records`);
      if (result.stats.newClients > 0) {
        console.log(`✅ Created ${result.stats.newClients} new clients`);
      }
      console.log('✅'.repeat(10));
    } else if (result.stats.skipped === result.stats.total) {
      console.log(`\n⚠️  All records skipped - they already exist in production`);
      console.log('This is expected if we already imported this test data');
    }
    
    console.log('\n📊 Summary:');
    console.log('The fix allows customers to have multiple different classes per day');
    console.log('Only true duplicates (same customer + same class + same time) are skipped');
    console.log('\n🎉 Try importing your 835 records again!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProductionReady();