const fs = require('fs');

async function testProductionImport() {
  // Read the test CSV file
  const csvContent = fs.readFileSync('./test-attendance.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-attendance.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  try {
    const response = await fetch('https://atlas-fitness-onboarding.vercel.app/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
      },
      body: formData
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    
    try {
      const result = JSON.parse(text);
      console.log('Production Import result:', JSON.stringify(result, null, 2));
      
      if (!result.success && result.errors) {
        console.log('\nErrors encountered:');
        result.errors.forEach(err => {
          console.log(`  Row ${err.row}: ${err.error}`);
        });
      }
    } catch (parseError) {
      console.log('Response was not JSON. Response text:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('Production Import failed:', error);
  }
}

console.log('Testing production import with small dataset...');
testProductionImport();