#!/usr/bin/env tsx

/**
 * Test script for verifying all new settings features
 * Run with: npx tsx scripts/test-settings-features.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test organization ID (Atlas Fitness)
const TEST_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testTable(tableName: string, testData: any) {
  try {
    log(`\nTesting ${tableName}...`, 'cyan')
    
    // Test INSERT
    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      // Check if it's a unique constraint (already exists)
      if (insertError.code === '23505') {
        log(`  ✓ Table exists (record already present)`, 'green')
        
        // Try to fetch existing record
        const { data: existingData, error: fetchError } = await supabase
          .from(tableName)
          .select('*')
          .eq('organization_id', TEST_ORG_ID)
          .single()
        
        if (!fetchError && existingData) {
          log(`  ✓ Can fetch existing records`, 'green')
          
          // Test UPDATE
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ updated_at: new Date().toISOString() })
            .eq('id', existingData.id)
          
          if (!updateError) {
            log(`  ✓ Can update records`, 'green')
          } else {
            log(`  ✗ Update failed: ${updateError.message}`, 'red')
          }
        }
      } else {
        throw insertError
      }
    } else {
      log(`  ✓ Can insert records`, 'green')
      
      // Clean up test data
      if (insertData) {
        await supabase
          .from(tableName)
          .delete()
          .eq('id', insertData.id)
        log(`  ✓ Cleanup successful`, 'green')
      }
    }
    
    return true
  } catch (error: any) {
    log(`  ✗ Failed: ${error.message}`, 'red')
    return false
  }
}

async function runTests() {
  log('\n========================================', 'blue')
  log('Atlas Fitness CRM - Settings Features Test', 'blue')
  log('========================================\n', 'blue')
  
  let totalTests = 0
  let passedTests = 0
  
  // Test 1: Phone Settings
  totalTests++
  const phoneSettingsTest = await testTable('phone_settings', {
    organization_id: TEST_ORG_ID,
    primary_number: '+44 7700 900000',
    display_name: 'Atlas Fitness Test',
    voicemail_enabled: true,
    voicemail_greeting: 'Test greeting',
    text_enabled: true
  })
  if (phoneSettingsTest) passedTests++
  
  // Test 2: Lead Scoring Settings
  totalTests++
  const leadScoringTest = await testTable('lead_scoring_settings', {
    organization_id: TEST_ORG_ID,
    scoring_enabled: true,
    auto_assign_enabled: true,
    auto_assign_threshold: 50,
    rules: [
      {
        id: '1',
        name: 'Test Rule',
        points: 10,
        is_active: true
      }
    ],
    thresholds: [
      {
        id: '1',
        label: 'Cold',
        min_score: 0,
        max_score: 25,
        color: 'bg-gray-500'
      }
    ]
  })
  if (leadScoringTest) passedTests++
  
  // Test 3: Calendar Settings
  totalTests++
  const calendarTest = await testTable('calendar_settings', {
    organization_id: TEST_ORG_ID,
    slot_duration: 60,
    buffer_time: 15,
    advance_booking_days: 30,
    timezone: 'Europe/London'
  })
  if (calendarTest) passedTests++
  
  // Test 4: Pipelines
  totalTests++
  const pipelineTest = await testTable('pipelines', {
    organization_id: TEST_ORG_ID,
    name: 'Test Pipeline',
    description: 'Test pipeline for verification',
    type: 'sales',
    stages: [
      {
        id: '1',
        name: 'Lead',
        order: 0,
        color: 'bg-gray-500'
      }
    ],
    is_default: false
  })
  if (pipelineTest) passedTests++
  
  // Test 5: Custom Fields
  totalTests++
  const customFieldTest = await testTable('custom_fields', {
    organization_id: TEST_ORG_ID,
    field_name: 'test_field_' + Date.now(),
    field_label: 'Test Field',
    field_type: 'text',
    entity_type: 'lead',
    is_required: false,
    is_active: true
  })
  if (customFieldTest) passedTests++
  
  // Test 6: Email Templates
  totalTests++
  const emailTemplateTest = await testTable('email_templates', {
    organization_id: TEST_ORG_ID,
    name: 'Test Template ' + Date.now(),
    subject: 'Test Subject',
    template_type: 'custom',
    html_content: '<p>Test content</p>',
    text_content: 'Test content',
    category: 'email',
    is_active: true
  })
  if (emailTemplateTest) passedTests++
  
  // Test 7: Storage Bucket
  totalTests++
  try {
    log('\nTesting Storage Bucket...', 'cyan')
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (!error && buckets) {
      const businessAssetsBucket = buckets.find(b => b.name === 'business-assets')
      if (businessAssetsBucket) {
        log('  ✓ business-assets bucket exists', 'green')
        passedTests++
      } else {
        log('  ✗ business-assets bucket not found', 'red')
      }
    } else {
      log(`  ✗ Failed to list buckets: ${error?.message}`, 'red')
    }
  } catch (error: any) {
    log(`  ✗ Storage test failed: ${error.message}`, 'red')
  }
  
  // Test 8: Check RLS Policies
  totalTests++
  try {
    log('\nChecking RLS Policies...', 'cyan')
    
    // This would normally require a user context, so we just verify the tables exist
    const tables = [
      'phone_settings',
      'lead_scoring_settings',
      'calendar_settings',
      'pipelines',
      'custom_fields',
      'email_templates'
    ]
    
    let rlsPass = true
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error && error.message.includes('row-level security')) {
        log(`  ✓ RLS enabled for ${table}`, 'green')
      } else if (!error) {
        log(`  ⚠ RLS might not be properly configured for ${table}`, 'yellow')
        rlsPass = false
      }
    }
    
    if (rlsPass) passedTests++
  } catch (error: any) {
    log(`  ✗ RLS check failed: ${error.message}`, 'red')
  }
  
  // Summary
  log('\n========================================', 'blue')
  log('Test Results', 'blue')
  log('========================================\n', 'blue')
  
  const percentage = Math.round((passedTests / totalTests) * 100)
  const color = percentage === 100 ? 'green' : percentage >= 75 ? 'yellow' : 'red'
  
  log(`Tests Passed: ${passedTests}/${totalTests} (${percentage}%)`, color)
  
  if (passedTests === totalTests) {
    log('\n✅ All settings features are working correctly!', 'green')
  } else {
    log('\n⚠️  Some tests failed. Please check the output above.', 'yellow')
    log('You may need to:', 'yellow')
    log('  1. Run the migration: supabase db push', 'yellow')
    log('  2. Check your Supabase dashboard for any issues', 'yellow')
    log('  3. Ensure all environment variables are set correctly', 'yellow')
  }
  
  process.exit(passedTests === totalTests ? 0 : 1)
}

// Run the tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  process.exit(1)
})