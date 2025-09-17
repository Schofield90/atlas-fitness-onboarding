const fs = require('fs');

async function testFreshImport() {
  // Read the fresh test CSV file
  const csvContent = fs.readFileSync('./test-fresh-attendance.csv', 'utf-8');
  
  const formData = new FormData();
  const file = new File([csvContent], 'test-fresh-attendance.csv', { type: 'text/csv' });
  
  formData.append('file', file);
  formData.append('type', 'attendance');
  
  console.log('Testing with FRESH data (5 new records)...');
  console.log('These emails have never been imported before.');
  const startTime = Date.now();
  
  try {
    const response = await fetch('http://localhost:3003/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
      },
      body: formData
    });

    const elapsed = Date.now() - startTime;
    const result = await response.json();
    
    console.log('\nImport result:', JSON.stringify(result, null, 2));
    console.log(`\nCompleted in ${elapsed}ms`);
    
    if (result.stats.success > 0) {
      console.log(`\n✅ SUCCESS! Imported ${result.stats.success} new records`);
      if (result.stats.newClients > 0) {
        console.log(`✅ Created ${result.stats.newClients} new clients`);
      }
    } else if (result.stats.skipped > 0) {
      console.log(`\n⚠️  All records were skipped (duplicates)`);
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

testFreshImport();