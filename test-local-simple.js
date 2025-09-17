const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testLocal() {
  try {
    console.log('🏠 Testing local development server...');
    
    const csvPath = '/Users/Sam/atlas-fitness-onboarding/sample-attendance.csv';
    const csvBuffer = fs.readFileSync(csvPath);
    
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'sample-attendance.csv',
      contentType: 'text/csv'
    });
    formData.append('type', 'attendance');
    
    const response = await fetch('http://localhost:3000/api/import/goteamup', {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📨 Response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📨 Response:`, responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log(`📨 Parsed response:`, JSON.stringify(responseJson, null, 2));
      
      if (responseJson.success) {
        console.log('✅ Local import successful!');
      } else {
        console.log('❌ Local import failed');
        console.log('First few errors:', responseJson.errors?.slice(0, 3));
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response');
    }
    
  } catch (error) {
    console.error('💥 Local test failed:', error.message);
  }
}

testLocal();