const fs = require('fs');

async function testProductionImportLarge() {
  // Read the large test CSV file
  const csvContent = fs.readFileSync('./test-large-attendance.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-large-attendance.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('Sending large dataset (50 rows) to production...');
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
    console.log(`Response received in ${elapsed}ms`);
    console.log('Response status:', response.status);
    
    const text = await response.text();
    
    try {
      const result = JSON.parse(text);
      console.log('\nProduction Import result:', JSON.stringify(result, null, 2));
      
      if (!result.success && result.errors) {
        console.log('\nErrors encountered:');
        result.errors.forEach(err => {
          console.log(`  Row ${err.row}: ${err.error}`);
        });
      }
      
      if (result.backgroundProcessing) {
        console.log('\n✅ Import is being processed in the background');
        console.log('Job ID:', result.jobId);
      } else {
        console.log(`\n✅ Import completed successfully in ${elapsed}ms`);
      }
    } catch (parseError) {
      console.log('Response was not JSON. Response text:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('Production Import failed:', error);
  }
}

console.log('Testing production import with LARGE dataset (50 rows)...');
testProductionImportLarge();