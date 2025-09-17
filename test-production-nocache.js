const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testProductionNoCache() {
  try {
    console.log('🚀 Testing production API with cache busting...');
    
    const csvPath = '/Users/Sam/atlas-fitness-onboarding/sample-attendance.csv';
    const csvBuffer = fs.readFileSync(csvPath);
    
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'sample-attendance.csv',
      contentType: 'text/csv'
    });
    formData.append('type', 'attendance');
    
    const timestamp = Date.now();
    const response = await fetch(`https://atlas-fitness-onboarding.vercel.app/api/import/goteamup?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📨 Status: ${response.status}`);
    console.log(`📨 Headers:`, Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    const responseJson = JSON.parse(responseText);
    
    console.log(`📊 Success: ${responseJson.success}`);
    console.log(`📊 Stats:`, responseJson.stats);
    
    if (responseJson.errors && responseJson.errors.length > 0) {
      console.log(`❌ First 3 errors:`, responseJson.errors.slice(0, 3));
    }
    
    if (responseJson.success && responseJson.stats.success > 0) {
      console.log('✅ Import is working! Successfully imported records.');
      return true;
    } else {
      console.log('❌ Still failing. Need to investigate further.');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  }
}

testProductionNoCache();