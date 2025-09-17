#!/usr/bin/env node

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImport() {
  try {
    console.log('🚀 Testing GoTeamUp import API...');
    
    // Read the CSV file
    const csvPath = '/Users/Sam/atlas-fitness-onboarding/sample-attendance.csv';
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    const csvBuffer = fs.readFileSync(csvPath);
    console.log(`📁 Loaded CSV file (${csvBuffer.length} bytes)`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'sample-attendance.csv',
      contentType: 'text/csv'
    });
    formData.append('type', 'attendance');
    
    // Test against production URL
    const url = 'https://atlas-fitness-onboarding.vercel.app/api/import/goteamup';
    
    console.log(`📡 Sending request to: ${url}`);
    console.log(`📋 Headers: x-organization-id: 63589490-8f55-4157-bd3a-e141594b748e`);
    console.log(`📋 Form data: file (${csvBuffer.length} bytes), type: attendance`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📨 Response status: ${response.status}`);
    console.log(`📨 Response headers:`, Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log(`📨 Response body (raw):`, responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log(`📨 Response body (parsed):`, JSON.stringify(responseJson, null, 2));
      
      if (responseJson.success) {
        console.log('✅ Import successful!');
        console.log(`📊 Stats:`, responseJson.stats);
      } else {
        console.log('❌ Import failed:');
        console.log(`💥 Error:`, responseJson.error);
        if (responseJson.errors) {
          console.log(`💥 Errors:`, responseJson.errors);
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response');
      console.log('💥 Parse error:', parseError.message);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('💥 Stack trace:', error.stack);
  }
}

// Also test local development server
async function testLocal() {
  try {
    console.log('\n🏠 Testing local development server...');
    
    const csvPath = '/Users/Sam/atlas-fitness-onboarding/sample-attendance.csv';
    const csvBuffer = fs.readFileSync(csvPath);
    
    const formData = new FormData();
    formData.append('file', csvBuffer, {
      filename: 'sample-attendance.csv',
      contentType: 'text/csv'
    });
    formData.append('type', 'attendance');
    
    const url = 'http://localhost:3000/api/import/goteamup';
    
    console.log(`📡 Sending request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-organization-id': '63589490-8f55-4157-bd3a-e141594b748e',
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📨 Local response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`📨 Local response body (raw):`, responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log(`📨 Local response body (parsed):`, JSON.stringify(responseJson, null, 2));
      
      if (responseJson.success) {
        console.log('✅ Local import successful!');
        console.log(`📊 Stats:`, responseJson.stats);
      } else {
        console.log('❌ Local import failed:');
        console.log(`💥 Error:`, responseJson.error);
      }
    } catch (parseError) {
      console.log('❌ Failed to parse local JSON response');
    }
    
  } catch (error) {
    console.error('💥 Local test failed:', error.message);
  }
}

// Run tests
(async () => {
  await testImport();
  await testLocal();
})();