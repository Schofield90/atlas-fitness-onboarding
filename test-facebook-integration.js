#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFacebookIntegration() {
  console.log('🧪 Testing Facebook Lead Form Integration\n')
  
  const tests = {
    passed: 0,
    failed: 0,
    warnings: 0
  }
  
  // Test 1: Check if Facebook integration exists
  console.log('Test 1: Checking Facebook integration status...')
  try {
    const { data: integrations, error } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    
    if (integrations && integrations.length > 0) {
      console.log('✅ Facebook integration found:', integrations.length, 'active connection(s)')
      tests.passed++
      
      // Get the first integration
      const integration = integrations[0]
      console.log('   Organization:', integration.organization_id)
      console.log('   Facebook User:', integration.facebook_user_name || integration.facebook_user_id)
    } else {
      console.log('❌ No active Facebook integrations found')
      tests.failed++
    }
  } catch (error) {
    console.log('❌ Failed to check integrations:', error.message)
    tests.failed++
  }
  
  // Test 2: Check Facebook pages
  console.log('\nTest 2: Checking Facebook pages...')
  try {
    const { data: pages, error } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    
    if (pages && pages.length > 0) {
      console.log('✅ Facebook pages found:', pages.length)
      pages.forEach(page => {
        console.log(`   - ${page.page_name} (${page.facebook_page_id})${page.is_primary ? ' [PRIMARY]' : ''}`)
      })
      tests.passed++
    } else {
      console.log('⚠️  No active Facebook pages found - need to select a page')
      tests.warnings++
    }
  } catch (error) {
    console.log('❌ Failed to check pages:', error.message)
    tests.failed++
  }
  
  // Test 3: Check lead forms
  console.log('\nTest 3: Checking lead forms...')
  try {
    const { data: forms, error } = await supabase
      .from('facebook_lead_forms')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    
    if (forms && forms.length > 0) {
      console.log('✅ Lead forms found:', forms.length)
      
      forms.forEach(form => {
        console.log(`\n   Form: ${form.form_name} (${form.facebook_form_id})`)
        console.log(`   - Questions: ${form.questions ? form.questions.length : 0} fields`)
        console.log(`   - Has mappings: ${form.field_mappings ? 'Yes' : 'No'}`)
        console.log(`   - Auto-sync: ${form.auto_sync_enabled ? 'Enabled' : 'Disabled'}`)
        
        // Check if form has questions
        if (!form.questions || form.questions.length === 0) {
          console.log('   ⚠️  Form has no questions - needs refresh from Facebook')
          tests.warnings++
        }
        
        // Check if form has field mappings
        if (!form.field_mappings) {
          console.log('   ⚠️  Form has no field mappings configured')
          tests.warnings++
        }
      })
      tests.passed++
    } else {
      console.log('⚠️  No lead forms found - need to sync forms from Facebook')
      tests.warnings++
    }
  } catch (error) {
    console.log('❌ Failed to check lead forms:', error.message)
    tests.failed++
  }
  
  // Test 4: Check webhook subscriptions
  console.log('\nTest 4: Checking webhook subscriptions...')
  try {
    const { data: webhooks, error } = await supabase
      .from('facebook_webhook_subscriptions')
      .select('*')
      .eq('is_active', true)
    
    if (error) throw error
    
    if (webhooks && webhooks.length > 0) {
      console.log('✅ Webhook subscriptions found:', webhooks.length)
      webhooks.forEach(webhook => {
        console.log(`   - Page ${webhook.page_id}: ${webhook.subscribed_fields}`)
        console.log(`     Last verified: ${webhook.last_verified_at || 'Never'}`)
      })
      tests.passed++
    } else {
      console.log('⚠️  No active webhook subscriptions - real-time sync disabled')
      tests.warnings++
    }
  } catch (error) {
    console.log('❌ Failed to check webhooks:', error.message)
    tests.failed++
  }
  
  // Test 5: Check recent leads from Facebook
  console.log('\nTest 5: Checking recent Facebook leads...')
  try {
    const { data: leads, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('source', 'facebook')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) throw error
    
    if (leads && leads.length > 0) {
      console.log(`✅ Facebook leads found: ${count} total`)
      console.log('   Recent leads:')
      leads.forEach(lead => {
        console.log(`   - ${lead.first_name} ${lead.last_name} (${lead.email}) - ${new Date(lead.created_at).toLocaleDateString()}`)
      })
      tests.passed++
    } else {
      console.log('ℹ️  No Facebook leads found yet')
      tests.warnings++
    }
  } catch (error) {
    console.log('❌ Failed to check leads:', error.message)
    tests.failed++
  }
  
  // Test 6: Check field mapping service
  console.log('\nTest 6: Testing field mapping service...')
  try {
    const { data: forms } = await supabase
      .from('facebook_lead_forms')
      .select('facebook_form_id, form_name, questions, field_mappings')
      .limit(1)
    
    if (forms && forms.length > 0) {
      const form = forms[0]
      console.log(`   Testing form: ${form.form_name}`)
      
      if (form.questions && form.questions.length > 0) {
        console.log(`   ✅ Form has ${form.questions.length} questions`)
        
        // Check if mappings exist
        if (form.field_mappings) {
          console.log(`   ✅ Form has field mappings configured`)
          const mappings = form.field_mappings.mappings || []
          console.log(`      - ${mappings.length} field mappings`)
        } else {
          console.log(`   ⚠️  Form needs field mapping configuration`)
          tests.warnings++
        }
        tests.passed++
      } else {
        console.log('   ⚠️  Form has no questions - needs sync')
        tests.warnings++
      }
    } else {
      console.log('   ℹ️  No forms available to test')
    }
  } catch (error) {
    console.log('❌ Failed to test field mapping:', error.message)
    tests.failed++
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary:')
  console.log(`   ✅ Passed: ${tests.passed}`)
  console.log(`   ❌ Failed: ${tests.failed}`)
  console.log(`   ⚠️  Warnings: ${tests.warnings}`)
  
  // Recommendations
  console.log('\n💡 Recommendations:')
  
  if (tests.failed > 0) {
    console.log('   1. Fix failed tests first - these are blocking issues')
  }
  
  if (tests.warnings > 0) {
    console.log('   2. Address warnings to enable full functionality:')
    console.log('      - Connect Facebook account if not connected')
    console.log('      - Select and activate Facebook pages')
    console.log('      - Sync lead forms from selected pages')
    console.log('      - Configure field mappings for each form')
    console.log('      - Enable webhook subscriptions for real-time sync')
  }
  
  if (tests.failed === 0 && tests.warnings === 0) {
    console.log('   ✨ Everything looks good! Facebook integration is fully configured.')
  }
  
  process.exit(tests.failed > 0 ? 1 : 0)
}

// Run tests
testFacebookIntegration().catch(console.error)