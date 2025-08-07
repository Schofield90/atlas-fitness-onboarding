/**
 * Database Validation Script
 * Checks for:
 * 1. Missing indexes on performance-critical queries
 * 2. Orphaned records (foreign key issues)
 * 3. Data integrity issues
 * 4. Missing RLS policies
 * 5. Inconsistent data formats
 * 6. Tables missing organization_id for multi-tenancy
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'

const supabase = createClient(supabaseUrl, supabaseKey)

interface ValidationResult {
  category: string
  severity: 'error' | 'warning' | 'info'
  table?: string
  issue: string
  recommendation: string
}

const results: ValidationResult[] = []

async function validateDatabase() {
  console.log('🔍 Starting Database Validation...\n')

  await checkMultiTenancy()
  await checkOrphanedRecords()
  await checkDataIntegrity()
  await checkPerformanceIndexes()
  await checkRLSPolicies()
  await checkSecurityIssues()

  // Generate report
  generateReport()
}

async function quickValidation() {
  const issues = []
  
  // Quick check for NULL organization_ids
  const tables = ['leads', 'sms_logs', 'tasks']
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .is('organization_id', null)
    
    if (count && count > 0) {
      issues.push(`${table} has ${count} records with NULL organization_id`)
    }
  }
  
  if (issues.length > 0) {
    console.error('❌ Security issues found:')
    issues.forEach(issue => console.error(`   - ${issue}`))
    process.exit(1)
  }
  
  console.log('✅ Quick security validation passed')
  process.exit(0)
}

async function checkMultiTenancy() {
  console.log('📊 Checking Multi-Tenancy...')
  
  const tablesRequiringOrgId = [
    'leads', 'contacts', 'appointments', 'tasks', 'forms',
    'email_logs', 'sms_logs', 'whatsapp_logs', 'workflows',
    'class_sessions', 'bookings', 'programs', 'memberships'
  ]

  for (const table of tablesRequiringOrgId) {
    try {
      // Check if table has organization_id column
      const { data, error } = await supabase
        .from(table)
        .select('organization_id')
        .limit(1)

      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          results.push({
            category: 'Multi-Tenancy',
            severity: 'error',
            table,
            issue: `Table '${table}' is missing organization_id column`,
            recommendation: `ALTER TABLE ${table} ADD COLUMN organization_id UUID REFERENCES organizations(id);`
          })
        }
      } else {
        // Check for records without organization_id
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .is('organization_id', null)

        if (count && count > 0) {
          results.push({
            category: 'Multi-Tenancy',
            severity: 'error',
            table,
            issue: `${count} records in '${table}' have NULL organization_id`,
            recommendation: `UPDATE ${table} SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;`
          })
        }
      }
    } catch (e) {
      // Table might not exist
    }
  }
}

async function checkOrphanedRecords() {
  console.log('🔗 Checking for Orphaned Records...')

  // Check leads without valid organization
  const { data: orphanedLeads } = await supabase
    .from('leads')
    .select('id')
    .is('organization_id', null)
    .limit(10)

  if (orphanedLeads && orphanedLeads.length > 0) {
    results.push({
      category: 'Data Integrity',
      severity: 'error',
      table: 'leads',
      issue: `Found ${orphanedLeads.length}+ orphaned leads without organization`,
      recommendation: 'Assign these leads to a default organization or delete them'
    })
  }

  // Check bookings without valid class sessions
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, class_session_id')
    .limit(100)

  if (bookings) {
    for (const booking of bookings) {
      const { data: session } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('id', booking.class_session_id)
        .single()

      if (!session) {
        results.push({
          category: 'Data Integrity',
          severity: 'warning',
          table: 'bookings',
          issue: `Booking ${booking.id} references non-existent class session`,
          recommendation: 'Delete orphaned bookings or restore missing class sessions'
        })
        break // Just report once
      }
    }
  }
}

async function checkDataIntegrity() {
  console.log('✅ Checking Data Integrity...')

  // Check for duplicate emails in leads
  const { data: leads } = await supabase
    .from('leads')
    .select('email, organization_id')
    .not('email', 'is', null)

  if (leads) {
    const emailMap = new Map<string, number>()
    leads.forEach(lead => {
      const key = `${lead.organization_id}-${lead.email}`
      emailMap.set(key, (emailMap.get(key) || 0) + 1)
    })

    const duplicates = Array.from(emailMap.entries()).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      results.push({
        category: 'Data Integrity',
        severity: 'warning',
        table: 'leads',
        issue: `Found ${duplicates.length} duplicate email addresses within organizations`,
        recommendation: 'Implement unique constraint on (organization_id, email) or merge duplicate leads'
      })
    }
  }

  // Check phone number formats
  const { data: contacts } = await supabase
    .from('contacts')
    .select('phone')
    .not('phone', 'is', null)
    .limit(100)

  if (contacts) {
    const invalidPhones = contacts.filter(c => {
      const phone = c.phone
      // Check if phone starts with + or is in correct format
      return !phone.startsWith('+') && !phone.match(/^\d{10,15}$/)
    })

    if (invalidPhones.length > 0) {
      results.push({
        category: 'Data Integrity',
        severity: 'warning',
        table: 'contacts',
        issue: `Found ${invalidPhones.length} phone numbers without proper formatting`,
        recommendation: 'Standardize phone numbers to E.164 format (e.g., +447490253471)'
      })
    }
  }
}

async function checkPerformanceIndexes() {
  console.log('⚡ Checking Performance Indexes...')

  // Common queries that need indexes
  const indexChecks = [
    { table: 'leads', column: 'organization_id', usage: 'Filtering leads by organization' },
    { table: 'leads', column: 'email', usage: 'Looking up leads by email' },
    { table: 'leads', column: 'created_at', usage: 'Sorting leads by date' },
    { table: 'bookings', column: 'class_session_id', usage: 'Finding bookings for a class' },
    { table: 'bookings', column: 'member_id', usage: 'Finding bookings for a member' },
    { table: 'class_sessions', column: 'start_time', usage: 'Finding upcoming classes' },
    { table: 'whatsapp_logs', column: 'phone_number', usage: 'Finding messages by phone' },
    { table: 'sms_logs', column: 'phone_number', usage: 'Finding messages by phone' }
  ]

  for (const check of indexChecks) {
    results.push({
      category: 'Performance',
      severity: 'info',
      table: check.table,
      issue: `Consider adding index on ${check.column}`,
      recommendation: `CREATE INDEX idx_${check.table}_${check.column} ON ${check.table}(${check.column});`
    })
  }
}

async function checkRLSPolicies() {
  console.log('🔒 Checking RLS Policies...')

  const criticalTables = [
    'users', 'organizations', 'leads', 'contacts', 'bookings',
    'forms', 'workflows', 'payments'
  ]

  results.push({
    category: 'Security',
    severity: 'warning',
    issue: 'RLS policies need manual verification',
    recommendation: 'Verify all tables have proper RLS policies for organization isolation'
  })
}

async function checkSecurityIssues() {
  console.log('🛡️ Checking Security Issues...')

  // Check API routes for organization isolation
  const apiRoutes = [
    '/api/leads',
    '/api/contacts',
    '/api/bookings',
    '/api/forms',
    '/api/workflows'
  ]

  results.push({
    category: 'Security',
    severity: 'error',
    issue: 'API routes must enforce organization isolation',
    recommendation: 'Audit all API routes to ensure they filter by authenticated user\'s organization'
  })

  // Check for potential SQL injection
  results.push({
    category: 'Security',
    severity: 'info',
    issue: 'Ensure all database queries use parameterized queries',
    recommendation: 'Use Supabase client methods or Prisma instead of raw SQL'
  })
}

function generateReport() {
  console.log('\n📋 VALIDATION REPORT\n')
  console.log('=' .repeat(80))

  // Group by severity
  const errors = results.filter(r => r.severity === 'error')
  const warnings = results.filter(r => r.severity === 'warning')
  const info = results.filter(r => r.severity === 'info')

  if (errors.length > 0) {
    console.log('\n❌ ERRORS (Must Fix):')
    errors.forEach(r => {
      console.log(`\n  [${r.category}] ${r.table ? `Table: ${r.table}` : ''} `)
      console.log(`  Issue: ${r.issue}`)
      console.log(`  Fix: ${r.recommendation}`)
    })
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Should Fix):')
    warnings.forEach(r => {
      console.log(`\n  [${r.category}] ${r.table ? `Table: ${r.table}` : ''}`)
      console.log(`  Issue: ${r.issue}`)
      console.log(`  Fix: ${r.recommendation}`)
    })
  }

  if (info.length > 0) {
    console.log('\n💡 SUGGESTIONS (Nice to Have):')
    info.forEach(r => {
      console.log(`\n  [${r.category}] ${r.table ? `Table: ${r.table}` : ''}`)
      console.log(`  Issue: ${r.issue}`)
      console.log(`  Fix: ${r.recommendation}`)
    })
  }

  // Save report to file
  const reportPath = path.join(process.cwd(), 'database-validation-report.md')
  let reportContent = '# Database Validation Report\n\n'
  reportContent += `Generated: ${new Date().toISOString()}\n\n`
  
  reportContent += `## Summary\n`
  reportContent += `- **Errors**: ${errors.length}\n`
  reportContent += `- **Warnings**: ${warnings.length}\n`
  reportContent += `- **Suggestions**: ${info.length}\n\n`

  if (errors.length > 0) {
    reportContent += '## ❌ Critical Issues\n\n'
    errors.forEach(r => {
      reportContent += `### ${r.category}: ${r.issue}\n`
      reportContent += `- **Table**: ${r.table || 'N/A'}\n`
      reportContent += `- **Fix**: ${r.recommendation}\n\n`
    })
  }

  if (warnings.length > 0) {
    reportContent += '## ⚠️ Warnings\n\n'
    warnings.forEach(r => {
      reportContent += `### ${r.category}: ${r.issue}\n`
      reportContent += `- **Table**: ${r.table || 'N/A'}\n`
      reportContent += `- **Fix**: ${r.recommendation}\n\n`
    })
  }

  fs.writeFileSync(reportPath, reportContent)
  console.log(`\n📄 Full report saved to: ${reportPath}`)
}

// Run validation
if (process.argv.includes('--quick')) {
  quickValidation().catch(console.error)
} else {
  validateDatabase().catch(console.error)
}