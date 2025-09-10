#!/usr/bin/env node

// Test script for the new background job meal plan generation system

async function testMealPlanGeneration() {
  const baseUrl = 'https://atlas-fitness-onboarding.vercel.app';
  
  console.log('🧪 Testing Background Job Meal Plan Generation System\n');
  console.log('========================================\n');
  
  // Test profile data
  const testProfile = {
    target_calories: 2000,
    protein_grams: 150,
    carbs_grams: 200,
    fat_grams: 67,
    id: 'test-profile-id',
    client_id: 'test-client-id',
    organization_id: 'test-org-id'
  };
  
  const testPreferences = {
    dietary_type: 'balanced',
    meal_frequency: 3,
    avoid_foods: ['nuts'],
    preferred_foods: ['chicken', 'rice', 'vegetables']
  };
  
  console.log('1️⃣  Testing v2 endpoint (background jobs)...');
  console.log('   Request: POST /api/nutrition/generate-meal-plan-v2');
  console.log('   Expecting: 202 Accepted with job ID and skeleton\n');
  
  try {
    // Test the v2 endpoint
    const v2Response = await fetch(`${baseUrl}/api/nutrition/generate-meal-plan-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nutritionProfile: testProfile,
        preferences: testPreferences,
        daysToGenerate: 3
      })
    });
    
    const v2Data = await v2Response.json();
    
    console.log('   Response Status:', v2Response.status);
    console.log('   Response:', JSON.stringify(v2Data, null, 2).substring(0, 500) + '...\n');
    
    if (v2Response.status === 202 && v2Data.jobId) {
      console.log('✅ V2 endpoint working! Job ID:', v2Data.jobId);
      console.log('✅ Skeleton data received:', v2Data.skeleton ? 'Yes' : 'No');
      
      // Test job status endpoint
      console.log('\n2️⃣  Testing job status endpoint...');
      console.log('   Request: GET /api/nutrition/job-status/' + v2Data.jobId);
      console.log('   Polling for job completion...\n');
      
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollStatus = async () => {
        attempts++;
        const statusResponse = await fetch(`${baseUrl}/api/nutrition/job-status/${v2Data.jobId}`);
        const statusData = await statusResponse.json();
        
        console.log(`   Attempt ${attempts}/${maxAttempts}:`);
        console.log(`   - Status: ${statusData.status}`);
        console.log(`   - Progress: ${statusData.progress}%`);
        console.log(`   - Message: ${statusData.message || 'Processing...'}`);
        
        if (statusData.status === 'completed') {
          console.log('\n✅ Job completed successfully!');
          console.log('✅ Full meal plan received:', statusData.data ? 'Yes' : 'No');
          return true;
        } else if (statusData.status === 'failed') {
          console.log('\n❌ Job failed:', statusData.error);
          return false;
        } else if (attempts >= maxAttempts) {
          console.log('\n⏱️  Job still processing after', maxAttempts * 2, 'seconds');
          return false;
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollStatus();
      };
      
      await pollStatus();
      
    } else {
      console.log('❌ V2 endpoint not working as expected');
      console.log('   Expected status 202, got:', v2Response.status);
      console.log('   Job ID present:', !!v2Data.jobId);
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
  
  console.log('\n========================================');
  console.log('Test complete!');
}

// Run the test
testMealPlanGeneration();