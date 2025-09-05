// Test script to verify the clients API is working
const fetch = require('node-fetch');

async function testClientsAPI() {
  const baseURL = 'https://atlas-fitness-onboarding.vercel.app';
  
  try {
    console.log('Testing clients API...');
    
    // Test data for creating a client
    const testClient = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '1234567890',
      date_of_birth: '1990-01-01',
      address: '123 Test St',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '0987654321',
      goals: 'Get fit',
      medical_conditions: 'None',
      source: 'test'
    };
    
    const response = await fetch(`${baseURL}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testClient),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.text();
    console.log('Response body:', responseData);
    
    if (!response.ok) {
      console.log('❌ API returned error status:', response.status);
      try {
        const errorData = JSON.parse(responseData);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
    } else {
      console.log('✅ API call successful!');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testClientsAPI();