const fs = require('fs');

async function testImport() {
  // Read the test CSV file
  const csvContent = fs.readFileSync('./test-large-attendance.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-large-attendance.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  try {
    const response = await fetch('http://localhost:3002/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
      },
      body: formData
    });

    const result = await response.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
    
    if (!result.success && result.errors) {
      console.log('\nErrors encountered:');
      result.errors.forEach(err => {
        console.log(`  Row ${err.row}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
}

testImport();