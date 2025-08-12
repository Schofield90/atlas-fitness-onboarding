#!/usr/bin/env tsx
/**
 * Test script for Telegram Bridge
 * Run this to verify your setup is working correctly
 */

import dotenv from 'dotenv'
import TelegramNotifier from './telegram-integration'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testBridge() {
  console.log('🧪 Testing Telegram Bridge Integration...\n')
  
  // Check environment variables
  const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'DEVELOPER_TELEGRAM_ID', 'OPENAI_API_KEY']
  const missingVars = requiredEnvVars.filter(v => !process.env[v] || process.env[v] === `YOUR_${v.replace('_', '_')}_HERE`)
  
  if (missingVars.length > 0) {
    console.error('❌ Missing or unconfigured environment variables:')
    missingVars.forEach(v => console.error(`   - ${v}`))
    console.error('\nPlease update your .env.local file with the actual values.')
    console.error('See TELEGRAM_BRIDGE_SETUP.md for instructions.')
    process.exit(1)
  }
  
  console.log('✅ Environment variables configured\n')
  
  try {
    // Test 1: Start a task
    console.log('📋 Test 1: Starting a task...')
    await TelegramNotifier.startTask('Testing Telegram Bridge Integration', '5 minutes')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 2: Update progress
    console.log('📊 Test 2: Updating progress...')
    await TelegramNotifier.updateProgress('Running initial tests', 25, 'Environment check complete')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 3: Share code snippet
    console.log('📝 Test 3: Sharing code snippet...')
    await TelegramNotifier.shareCode(
      'Test Function',
      `function testExample() {
  console.log('This is a test code snippet')
  return true
}`,
      'typescript'
    )
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 4: Report an error
    console.log('❌ Test 4: Reporting an error...')
    await TelegramNotifier.reportError(
      'Test error: This is a simulated error',
      ['This is just a test', 'No action needed', 'Testing error reporting']
    )
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 5: Database update
    console.log('🗄 Test 5: Sending database update...')
    await TelegramNotifier.databaseUpdate(
      'INSERT',
      'test_table',
      'Added test record for bridge verification'
    )
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 6: Test results
    console.log('🧪 Test 6: Sending test results...')
    await TelegramNotifier.testResults(
      8, 2, 10,
      ['test/auth.spec.ts', 'test/api.spec.ts']
    )
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 7: Complete task
    console.log('✅ Test 7: Completing task...')
    await TelegramNotifier.completeTask(
      'Testing Telegram Bridge Integration',
      'All tests completed successfully! The bridge is working correctly.'
    )
    
    console.log('\n✅ All tests completed successfully!')
    console.log('📱 Check your Telegram for the test messages.')
    console.log('\n📚 Next steps:')
    console.log('1. Try sending "status" to your bot')
    console.log('2. Send a voice note saying "what\'s the status"')
    console.log('3. Use the integration in your Claude Code session')
    console.log('\nSee TELEGRAM_BRIDGE_SETUP.md for more details.')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('\nTroubleshooting:')
    console.error('1. Make sure the bridge is running: tsx claude-code-telegram-bridge.ts')
    console.error('2. Check your bot token and chat ID are correct')
    console.error('3. Ensure you have started a chat with your bot')
    process.exit(1)
  }
}

// Run tests
testBridge().catch(console.error)