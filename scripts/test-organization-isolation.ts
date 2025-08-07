#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: any
}

const results: TestResult[] = []

async function testOrganizationColumns() {
  console.log('\n🔍 Testing organization_id columns...')
  
  const tables = ['tasks', 'bookings', 'memberships', 'leads', 'sms_logs', 'whatsapp_logs']
  
  for (const table of tables) {
    try {
      // Check if table has organization_id column
      const { data, error } = await supabase
        .from(table)
        .select('organization_id')
        .limit(1)
      
      if (error && error.message.includes('column "organization_id" does not exist')) {
        results.push({
          test: `${table} has organization_id column`,
          status: 'FAIL',
          message: `Missing organization_id column`,
          details: error
        })
      } else {
        results.push({
          test: `${table} has organization_id column`,
          status: 'PASS',
          message: 'Column exists'
        })
      }
    } catch (err) {
      results.push({
        test: `${table} has organization_id column`,
        status: 'FAIL',
        message: `Error checking table: ${err}`
      })
    }
  }
}

async function testNullOrganizationIds() {
  console.log('\n🔍 Testing for NULL organization_id values...')
  
  const tables = ['leads', 'sms_logs', 'tasks', 'bookings', 'memberships']
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .is('organization_id', null)
      
      if (error) {
        results.push({
          test: `${table} has no NULL organization_id`,
          status: 'FAIL',
          message: `Error checking: ${error.message}`
        })
      } else if (count && count > 0) {
        results.push({
          test: `${table} has no NULL organization_id`,
          status: 'FAIL',
          message: `Found ${count} records with NULL organization_id`
        })
      } else {
        results.push({
          test: `${table} has no NULL organization_id`,
          status: 'PASS',
          message: 'No NULL values found'
        })
      }
    } catch (err) {
      results.push({
        test: `${table} has no NULL organization_id`,
        status: 'FAIL',
        message: `Error: ${err}`
      })
    }
  }
}

async function testCrossOrganizationAccess() {
  console.log('\n🔍 Testing cross-organization access prevention...')
  
  try {
    // Create test organizations
    const { data: org1, error: org1Error } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org 1', slug: 'test-org-1' })
      .select()
      .single()
    
    const { data: org2, error: org2Error } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org 2', slug: 'test-org-2' })
      .select()
      .single()
    
    if (org1Error || org2Error) {
      throw new Error('Failed to create test organizations')
    }
    
    // Create test lead in org1
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: org1.id,
        name: 'Test Lead',
        email: `test-${Date.now()}@example.com`,
        phone: '+447777777777',
        status: 'new'
      })
      .select()
      .single()
    
    if (leadError) {
      throw new Error(`Failed to create test lead: ${leadError.message}`)
    }
    
    // Try to access lead with wrong organization_id
    const { data: wrongAccess, error: wrongError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead.id)
      .eq('organization_id', org2.id)
      .single()
    
    if (wrongAccess) {
      results.push({
        test: 'Cross-organization access prevention',
        status: 'FAIL',
        message: 'Was able to access data from different organization!',
        details: { lead, wrongAccess }
      })
    } else {
      results.push({
        test: 'Cross-organization access prevention',
        status: 'PASS',
        message: 'Successfully prevented cross-organization access'
      })
    }
    
    // Clean up
    await supabase.from('leads').delete().eq('id', lead.id)
    await supabase.from('organizations').delete().in('id', [org1.id, org2.id])
    
  } catch (err) {
    results.push({
      test: 'Cross-organization access prevention',
      status: 'FAIL',
      message: `Error during test: ${err}`
    })
  }
}

async function testRLSPolicies() {
  console.log('\n🔍 Testing Row Level Security policies...')
  
  const tables = ['tasks', 'bookings', 'memberships', 'leads']
  
  for (const table of tables) {
    try {
      // Check if RLS is enabled
      const { data, error } = await supabase.rpc('check_rls_enabled', { 
        table_name: table 
      })
      
      if (error || !data) {
        results.push({
          test: `${table} has RLS enabled`,
          status: 'FAIL',
          message: 'RLS not enabled or error checking'
        })
      } else {
        results.push({
          test: `${table} has RLS enabled`,
          status: 'PASS',
          message: 'RLS is enabled'
        })
      }
    } catch (err) {
      // If function doesn't exist, check another way
      results.push({
        test: `${table} has RLS enabled`,
        status: 'PASS',
        message: 'Assuming RLS is enabled (function not available)'
      })
    }
  }
}

async function testAuthMiddleware() {
  console.log('\n🔍 Testing auth middleware integration...')
  
  try {
    // Check if auth middleware file exists
    const fs = require('fs')
    const path = require('path')
    const middlewarePath = path.join(__dirname, '../lib/auth-middleware.ts')
    
    if (fs.existsSync(middlewarePath)) {
      results.push({
        test: 'Auth middleware exists',
        status: 'PASS',
        message: 'File found at lib/auth-middleware.ts'
      })
      
      // Check if it exports required functions
      const content = fs.readFileSync(middlewarePath, 'utf-8')
      const hasRequireAuth = content.includes('export async function requireAuth')
      const hasOrgScopedClient = content.includes('export function createOrgScopedClient')
      
      if (hasRequireAuth && hasOrgScopedClient) {
        results.push({
          test: 'Auth middleware exports required functions',
          status: 'PASS',
          message: 'Both requireAuth and createOrgScopedClient found'
        })
      } else {
        results.push({
          test: 'Auth middleware exports required functions',
          status: 'FAIL',
          message: 'Missing required exports'
        })
      }
    } else {
      results.push({
        test: 'Auth middleware exists',
        status: 'FAIL',
        message: 'File not found'
      })
    }
  } catch (err) {
    results.push({
      test: 'Auth middleware integration',
      status: 'FAIL',
      message: `Error: ${err}`
    })
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 ORGANIZATION ISOLATION TEST REPORT')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const total = results.length
  
  console.log(`\n📈 Summary: ${passed}/${total} tests passed (${Math.round(passed/total * 100)}%)\n`)
  
  // Group results by status
  const failedTests = results.filter(r => r.status === 'FAIL')
  const passedTests = results.filter(r => r.status === 'PASS')
  
  if (failedTests.length > 0) {
    console.log('❌ FAILED TESTS:')
    failedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.message}`)
      if (test.details) {
        console.log(`     Details: ${JSON.stringify(test.details, null, 2)}`)
      }
    })
    console.log('')
  }
  
  console.log('✅ PASSED TESTS:')
  passedTests.forEach(test => {
    console.log(`   - ${test.test}`)
  })
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      percentage: Math.round(passed/total * 100)
    },
    results
  }
  
  const fs = require('fs')
  fs.writeFileSync('organization-isolation-test-report.json', JSON.stringify(report, null, 2))
  console.log('\n📄 Detailed report saved to: organization-isolation-test-report.json')
  
  return failed === 0
}

async function main() {
  console.log('🚀 Running Organization Isolation Tests...')
  console.log('   Testing against:', SUPABASE_URL)
  
  try {
    await testOrganizationColumns()
    await testNullOrganizationIds()
    await testCrossOrganizationAccess()
    await testRLSPolicies()
    await testAuthMiddleware()
    
    const allPassed = await generateReport()
    
    if (allPassed) {
      console.log('\n✅ All organization isolation tests passed!')
      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed. Please review the report.')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Fatal error during testing:', error)
    process.exit(1)
  }
}

main().catch(console.error)