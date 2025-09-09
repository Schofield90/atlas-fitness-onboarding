#!/usr/bin/env node

// Script to create Sam's account in production

async function createSamAccount() {
  const baseUrl = 'https://atlas-fitness-onboarding.vercel.app';
  
  console.log('Creating Sam\'s account in production...');
  
  try {
    // Create Sam's account via the API
    const response = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: 'Sam',
        last_name: 'Atlas',
        email: 'sam@atlas-gyms.co.uk',
        phone: '+447490253471',
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness org
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to create account:', response.status);
      console.error('Error:', data.error || data);
      process.exit(1);
    }
    
    console.log('✅ Account created successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSamAccount();