/**
 * Security Audit Script
 * Checks all API routes for proper organization isolation
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface SecurityIssue {
  file: string
  line: number
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
}

const issues: SecurityIssue[] = []

async function auditAPISecurity() {
  console.log('🔒 Starting Security Audit of API Routes...\n')

  // Find all API route files
  const apiFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd()
  })

  console.log(`Found ${apiFiles.length} API route files to audit\n`)

  for (const file of apiFiles) {
    await auditFile(file)
  }

  generateSecurityReport()
}

async function auditFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const lines = content.split('\n')

  console.log(`Auditing: ${filePath}`)

  // Check for organization isolation
  checkOrganizationIsolation(filePath, content, lines)
  
  // Check for SQL injection vulnerabilities
  checkSQLInjection(filePath, content, lines)
  
  // Check for authentication
  checkAuthentication(filePath, content, lines)
  
  // Check for proper error handling
  checkErrorHandling(filePath, content, lines)
}

function checkOrganizationIsolation(filePath: string, content: string, lines: string[]) {
  const hasSupabaseQuery = content.includes('.from(') || content.includes('supabase.')
  const hasOrgFilter = content.includes('organization_id') || content.includes('organizationId')
  
  // Check if this is a data-fetching endpoint
  const fetchingPatterns = [
    /\.from\(['"]\w+['"]\)/,
    /\.select\(/,
    /\.insert\(/,
    /\.update\(/,
    /\.delete\(/
  ]
  
  const isFetchingData = fetchingPatterns.some(pattern => pattern.test(content))
  
  if (isFetchingData && !hasOrgFilter) {
    // Find the line with the query
    lines.forEach((line, index) => {
      if (line.includes('.from(') && !line.includes('organization')) {
        issues.push({
          file: filePath,
          line: index + 1,
          issue: 'Database query without organization filtering',
          severity: 'critical',
          recommendation: 'Add .eq("organization_id", user.organizationId) to filter by organization'
        })
      }
    })
  }

  // Check for direct ID access from params
  if (content.includes('params.') && !content.includes('verifyOwnership')) {
    lines.forEach((line, index) => {
      if (line.includes('params.') && (line.includes('.eq(') || line.includes('.match('))) {
        issues.push({
          file: filePath,
          line: index + 1,
          issue: 'Direct resource access without ownership verification',
          severity: 'high',
          recommendation: 'Verify the resource belongs to the user\'s organization before accessing'
        })
      }
    })
  }
}

function checkAuthentication(filePath: string, content: string, lines: string[]) {
  const hasAuthCheck = content.includes('getUser') || content.includes('auth.') || content.includes('requireAuth')
  const isPublicRoute = filePath.includes('/public/') || filePath.includes('/webhook/')
  
  if (!hasAuthCheck && !isPublicRoute) {
    issues.push({
      file: filePath,
      line: 1,
      issue: 'API route without authentication check',
      severity: 'critical',
      recommendation: 'Add authentication check at the beginning of the route handler'
    })
  }
}

function checkSQLInjection(filePath: string, content: string, lines: string[]) {
  // Check for string concatenation in queries
  const sqlPatterns = [
    /\$\{.*\}/,  // Template literals in queries
    /\+\s*['"].*['"]\s*\+/,  // String concatenation
    /\.raw\(/,  // Raw SQL queries
  ]
  
  lines.forEach((line, index) => {
    sqlPatterns.forEach(pattern => {
      if (pattern.test(line) && (line.includes('sql') || line.includes('query'))) {
        issues.push({
          file: filePath,
          line: index + 1,
          issue: 'Potential SQL injection vulnerability',
          severity: 'critical',
          recommendation: 'Use parameterized queries or Supabase query builder methods'
        })
      }
    })
  })
}

function checkErrorHandling(filePath: string, content: string, lines: string[]) {
  // Check if errors expose sensitive information
  lines.forEach((line, index) => {
    if (line.includes('console.log') && line.includes('error')) {
      issues.push({
        file: filePath,
        line: index + 1,
        issue: 'Error logged to console (may expose sensitive data in production)',
        severity: 'low',
        recommendation: 'Use proper error logging service and sanitize error messages'
      })
    }
    
    if (line.includes('error.message') && line.includes('Response')) {
      issues.push({
        file: filePath,
        line: index + 1,
        issue: 'Raw error message exposed to client',
        severity: 'medium',
        recommendation: 'Return generic error messages to clients, log detailed errors server-side'
      })
    }
  })
}

function generateSecurityReport() {
  console.log('\n🔒 SECURITY AUDIT REPORT\n')
  console.log('=' .repeat(80))

  const critical = issues.filter(i => i.severity === 'critical')
  const high = issues.filter(i => i.severity === 'high')
  const medium = issues.filter(i => i.severity === 'medium')
  const low = issues.filter(i => i.severity === 'low')

  console.log(`\nSummary:`)
  console.log(`- Critical: ${critical.length}`)
  console.log(`- High: ${high.length}`)
  console.log(`- Medium: ${medium.length}`)
  console.log(`- Low: ${low.length}`)

  if (critical.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:')
    critical.forEach(issue => {
      console.log(`\n  File: ${issue.file}:${issue.line}`)
      console.log(`  Issue: ${issue.issue}`)
      console.log(`  Fix: ${issue.recommendation}`)
    })
  }

  if (high.length > 0) {
    console.log('\n❗ HIGH PRIORITY:')
    high.forEach(issue => {
      console.log(`\n  File: ${issue.file}:${issue.line}`)
      console.log(`  Issue: ${issue.issue}`)
      console.log(`  Fix: ${issue.recommendation}`)
    })
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'security-audit-report.md')
  let reportContent = '# API Security Audit Report\n\n'
  reportContent += `Generated: ${new Date().toISOString()}\n\n`
  
  reportContent += '## Summary\n\n'
  reportContent += `- **Critical Issues**: ${critical.length}\n`
  reportContent += `- **High Priority**: ${high.length}\n`
  reportContent += `- **Medium Priority**: ${medium.length}\n`
  reportContent += `- **Low Priority**: ${low.length}\n\n`

  if (critical.length > 0) {
    reportContent += '## 🚨 Critical Security Issues\n\n'
    reportContent += 'These must be fixed immediately as they pose significant security risks.\n\n'
    
    critical.forEach(issue => {
      reportContent += `### ${issue.file}\n`
      reportContent += `- **Line**: ${issue.line}\n`
      reportContent += `- **Issue**: ${issue.issue}\n`
      reportContent += `- **Recommendation**: ${issue.recommendation}\n\n`
    })
  }

  reportContent += '\n## Recommended Security Middleware\n\n'
  reportContent += '```typescript\n'
  reportContent += `// middleware/requireAuth.ts
export async function requireAuth(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()
    
  return { user, organizationId: userData?.organization_id }
}

// Use in API routes:
const auth = await requireAuth(request)
if (auth instanceof NextResponse) return auth

// Now you have auth.user and auth.organizationId
`
  reportContent += '```\n\n'

  fs.writeFileSync(reportPath, reportContent)
  console.log(`\n📄 Full security report saved to: ${reportPath}`)
}

// Run audit
auditAPISecurity().catch(console.error)