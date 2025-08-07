#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function applyDatabaseFixes() {
  console.log('🔧 Applying database fixes...\n')
  
  const results = {
    nullOrganizationFixes: 0,
    errors: [] as string[]
  }
  
  try {
    // 1. Get default organization
    console.log('1️⃣ Getting default organization...')
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Atlas Fitness')
      .single()
    
    if (orgError || !orgs) {
      console.log('   No Atlas Fitness organization found, using first organization')
      const { data: firstOrg, error: firstOrgError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1)
        .single()
      
      if (firstOrgError || !firstOrg) {
        throw new Error('No organizations found in database')
      }
      
      console.log(`   Using organization: ${firstOrg.name} (${firstOrg.id})`)
      const defaultOrgId = firstOrg.id
      
      // 2. Fix NULL organization_id in sms_logs
      console.log('\n2️⃣ Fixing NULL organization_id in sms_logs...')
      const { data: smsUpdated, error: smsError } = await supabase
        .from('sms_logs')
        .update({ organization_id: defaultOrgId })
        .is('organization_id', null)
        .select()
      
      if (!smsError && smsUpdated) {
        results.nullOrganizationFixes += smsUpdated.length
        console.log(`   ✅ Fixed ${smsUpdated.length} records`)
      } else if (smsError) {
        console.log(`   ❌ Error: ${smsError.message}`)
        results.errors.push(`sms_logs: ${smsError.message}`)
      } else {
        console.log('   ✅ No NULL values found')
      }
      
    } else {
      console.log(`   ✅ Found: ${orgs.name} (${orgs.id})`)
      const defaultOrgId = orgs.id
      
      // 2. Fix NULL organization_id in sms_logs
      console.log('\n2️⃣ Fixing NULL organization_id in sms_logs...')
      const { data: smsUpdated, error: smsError } = await supabase
        .from('sms_logs')
        .update({ organization_id: defaultOrgId })
        .is('organization_id', null)
        .select()
      
      if (!smsError && smsUpdated) {
        results.nullOrganizationFixes += smsUpdated.length
        console.log(`   ✅ Fixed ${smsUpdated.length} records`)
      } else if (smsError) {
        console.log(`   ❌ Error: ${smsError.message}`)
        results.errors.push(`sms_logs: ${smsError.message}`)
      } else {
        console.log('   ✅ No NULL values found')
      }
    }
    
    // 3. Summary
    console.log('\n📊 Summary:')
    console.log(`✅ Fixed ${results.nullOrganizationFixes} NULL organization_id values`)
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  ${results.errors.length} errors occurred:`)
      results.errors.forEach(err => console.log(`   - ${err}`))
    }
    
    console.log('\n💡 Note: To apply the full SQL optimizations including:')
    console.log('   - Adding missing organization_id columns')
    console.log('   - Creating performance indexes')
    console.log('   - Setting up RLS policies')
    console.log('   Please run the SQL in scripts/fix-database-issues.sql')
    console.log('   directly in your Supabase dashboard SQL editor.')
    
    // 4. Create optimization report
    console.log('\n📝 Creating optimization report...')
    const report = {
      timestamp: new Date().toISOString(),
      fixes_applied: {
        null_organization_fixes: results.nullOrganizationFixes,
      },
      remaining_tasks: [
        'Add organization_id columns to: tasks, bookings, memberships',
        'Create performance indexes on frequently queried columns',
        'Enable RLS policies for multi-tenant security',
        'Create security audit log table',
        'Set up organization access validation function'
      ],
      sql_file_location: 'scripts/fix-database-issues.sql',
      errors: results.errors
    }
    
    const reportPath = 'database-optimization-report.json'
    await require('fs').promises.writeFile(
      reportPath,
      JSON.stringify(report, null, 2)
    )
    
    console.log(`   ✅ Report saved to ${reportPath}`)
    
  } catch (error) {
    console.error('❌ Failed to apply fixes:', error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  console.log('🚀 Database Fix Script\n')
  
  // Test connection
  console.log('Testing Supabase connection...')
  const { data, error } = await supabase
    .from('organizations')
    .select('count(*)', { count: 'exact', head: true })
  
  if (error) {
    console.error('❌ Failed to connect to Supabase:', error)
    process.exit(1)
  }
  
  console.log('✅ Connected successfully\n')
  
  await applyDatabaseFixes()
}

main().catch(console.error)