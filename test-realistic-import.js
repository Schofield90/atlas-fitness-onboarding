const fs = require('fs');

async function testRealisticImport() {
  const csvContent = fs.readFileSync('./test-realistic.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-realistic.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('Testing with REALISTIC data (multiple classes per customer)...');
  console.log('This simulates what might be in your 835-record file');
  console.log('Emma Wilson has 4 classes, Michael Chen has 2 classes');
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3004/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
      },
      body: formData
    });

    const elapsed = Date.now() - startTime;
    const result = await response.json();
    
    console.log('\n=== IMPORT RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nCompleted in ${elapsed}ms`);
    
    if (result.stats.success > 0) {
      console.log(`\n✅ SUCCESS! Imported ${result.stats.success} attendance records`);
      if (result.stats.newClients > 0) {
        console.log(`✅ Created ${result.stats.newClients} new clients`);
      }
    }
    
    if (result.stats.skipped > 0) {
      console.log(`\n⚠️  ${result.stats.skipped} records were skipped (duplicates)`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`  Row ${err.row}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Import failed:', error);
  }
}

testRealisticImport();