#!/usr/bin/env node

// Script to test the cleanup API endpoint
// This will delete all test/sample classes for the logged-in user

async function testCleanup() {
  try {
    console.log('Testing class session cleanup endpoint...\n');
    
    // First, let's call the cleanup endpoint
    // Note: This requires being logged in with a valid session
    const response = await fetch('http://localhost:3000/api/class-sessions/cleanup', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add any necessary auth headers if running outside of browser
    });

    if (!response.ok) {
      console.error('Failed to call cleanup endpoint:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
      return;
    }

    const data = await response.json();
    
    console.log('Cleanup Results:');
    console.log('================');
    console.log(`✓ Success: ${data.success}`);
    console.log(`✓ Deleted: ${data.deleted} test sessions`);
    console.log(`✓ Remaining: ${data.remaining} sessions`);
    
    if (data.deletedSessions && data.deletedSessions.length > 0) {
      console.log('\nDeleted Sessions:');
      data.deletedSessions.forEach((session: any) => {
        console.log(`  - ${session.name} (${new Date(session.start_time).toLocaleString()})`);
      });
    }
    
    console.log('\n' + data.message);
    
  } catch (error) {
    console.error('Error testing cleanup:', error);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  testCleanup();
}

export { testCleanup };