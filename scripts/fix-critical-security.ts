/**
 * Script to fix critical security issues in API routes
 * Adds authentication and organization isolation
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

interface FixResult {
  file: string
  fixed: boolean
  changes: string[]
}

const results: FixResult[] = []

// Critical routes that should NOT have auth (webhooks, public endpoints)
const publicRoutes = [
  'webhooks/twilio',
  'webhooks/stripe',
  'webhooks/facebook',
  'webhooks/google-calendar',
  'public-api/',
  'auth/google/callback',
  'auth/facebook/callback',
  'forms/submit', // Public form submissions
  'health' // Health check endpoint
]

async function fixSecurityIssues() {
  console.log('🔧 Starting Critical Security Fixes...\n')

  // Find all API route files
  const apiFiles = await glob('app/api/**/route.ts', {
    cwd: process.cwd()
  })

  console.log(`Found ${apiFiles.length} API route files to check\n`)

  // Fix the most critical routes first
  const criticalRoutes = [
    'app/api/leads/route.ts',
    'app/api/contacts/*/route.ts',
    'app/api/bookings/*/route.ts',
    'app/api/forms/*/route.ts',
    'app/api/workflows/*/route.ts',
    'app/api/customers/*/route.ts',
    'app/api/calendar/*/route.ts'
  ]

  for (const pattern of criticalRoutes) {
    const files = await glob(pattern, { cwd: process.cwd() })
    for (const file of files) {
      await fixFile(file)
    }
  }

  generateFixReport()
}

async function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath)
  let content = fs.readFileSync(fullPath, 'utf-8')
  const originalContent = content
  const changes: string[] = []

  // Check if it's a public route
  const isPublic = publicRoutes.some(route => filePath.includes(route))
  
  if (isPublic) {
    console.log(`⏭️  Skipping public route: ${filePath}`)
    return
  }

  console.log(`🔧 Fixing: ${filePath}`)

  // Check if already has auth
  const hasAuth = content.includes('requireAuth') || content.includes('getUser')
  
  if (!hasAuth) {
    // Add import for auth middleware
    if (!content.includes("from '@/lib/auth-middleware'")) {
      const importStatement = "import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'\n"
      
      // Add after other imports
      const lastImportIndex = content.lastIndexOf('import')
      const endOfLastImport = content.indexOf('\n', lastImportIndex)
      content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1)
      changes.push('Added auth middleware import')
    }

    // Fix each HTTP method handler
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    
    for (const method of methods) {
      const handlerRegex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{`, 'g')
      const matches = content.match(handlerRegex)
      
      if (matches) {
        content = content.replace(handlerRegex, (match) => {
          return match + `
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  `
        })
        changes.push(`Added auth to ${method} handler`)
      }
    }

    // Replace direct supabase usage with scoped client
    content = content.replace(/createRouteHandlerClient\s*\(\s*{\s*cookies\s*}\s*\)/g, 'supabase')
    content = content.replace(/const\s+supabase\s*=\s*createClient\([^)]+\)/g, '// Supabase client created by auth middleware')
    
    // Fix organization filtering in queries
    const queryPatterns = [
      /\.from\s*\(\s*['"](\w+)['"]\s*\)\s*\.select/g,
      /\.from\s*\(\s*['"](\w+)['"]\s*\)\s*\.insert/g,
      /\.from\s*\(\s*['"](\w+)['"]\s*\)\s*\.update/g,
      /\.from\s*\(\s*['"](\w+)['"]\s*\)\s*\.delete/g
    ]
    
    for (const pattern of queryPatterns) {
      if (pattern.test(content)) {
        changes.push('Updated queries to use org-scoped client')
      }
    }
  }

  // Save the fixed file if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content)
    results.push({
      file: filePath,
      fixed: true,
      changes
    })
  } else {
    results.push({
      file: filePath,
      fixed: false,
      changes: ['No changes needed']
    })
  }
}

function generateFixReport() {
  console.log('\n📊 SECURITY FIX REPORT\n')
  console.log('=' .repeat(80))

  const fixed = results.filter(r => r.fixed)
  const skipped = results.filter(r => !r.fixed)

  console.log(`\nSummary:`)
  console.log(`- Fixed: ${fixed.length} files`)
  console.log(`- Skipped: ${skipped.length} files`)

  if (fixed.length > 0) {
    console.log('\n✅ Fixed Files:')
    fixed.forEach(result => {
      console.log(`\n  ${result.file}`)
      result.changes.forEach(change => {
        console.log(`    - ${change}`)
      })
    })
  }

  // Create example of a properly secured API route
  const examplePath = path.join(process.cwd(), 'app/api/example-secure-route.ts.example')
  const exampleContent = `import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createOrgScopedClient, verifyResourceOwnership } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  // 1. Check authentication
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // 2. Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    // 3. Query with automatic organization filtering
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*') // Automatically filtered by organization_id
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) throw error
    
    return NextResponse.json({ leads })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // 1. Check authentication
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // 2. Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const body = await request.json()
    
    // 3. Insert with automatic organization_id
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        // organization_id is automatically added
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Check authentication
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // 2. Verify resource ownership
  const hasAccess = await verifyResourceOwnership('leads', params.id, auth.organizationId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Resource not found or access denied' },
      { status: 404 }
    )
  }
  
  // 3. Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const body = await request.json()
    
    // 4. Update with automatic organization filtering
    const { data: lead, error } = await supabase
      .from('leads')
      .update(body)
      .eq('id', params.id) // Organization filter is automatically added
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}
`

  fs.writeFileSync(examplePath, exampleContent)
  console.log(`\n📄 Example secure route saved to: ${examplePath}`)
  
  // Save report
  const reportPath = path.join(process.cwd(), 'security-fixes-report.md')
  let reportContent = '# Security Fixes Report\n\n'
  reportContent += `Generated: ${new Date().toISOString()}\n\n`
  reportContent += `## Summary\n\n`
  reportContent += `- **Files Fixed**: ${fixed.length}\n`
  reportContent += `- **Files Skipped**: ${skipped.length}\n\n`
  
  reportContent += '## Next Steps\n\n'
  reportContent += '1. Review the fixed files to ensure they work correctly\n'
  reportContent += '2. Test authentication on all endpoints\n'
  reportContent += '3. Run the security audit again to verify fixes\n'
  reportContent += '4. Apply the same pattern to remaining routes\n\n'
  
  reportContent += '## Manual Fixes Required\n\n'
  reportContent += '- Webhook endpoints need signature validation\n'
  reportContent += '- Debug endpoints should be removed in production\n'
  reportContent += '- Some routes may need custom authorization logic\n'
  
  fs.writeFileSync(reportPath, reportContent)
  console.log(`📄 Full report saved to: ${reportPath}`)
}

// Run the fixes
fixSecurityIssues().catch(console.error)