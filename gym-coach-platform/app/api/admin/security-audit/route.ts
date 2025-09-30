import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import * as fs from 'fs'
import * as path from 'path'

const SUPER_ADMIN_EMAIL = 'sam@gymleadhub.co.uk'

interface SecurityIssue {
  file: string
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  line?: number
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const issues: SecurityIssue[] = []
    const apiDir = path.join(process.cwd(), 'app', 'api')

    // Recursively find all route.ts files
    const findRouteFiles = (dir: string): string[] => {
      const files: string[] = []

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)

          if (entry.isDirectory()) {
            files.push(...findRouteFiles(fullPath))
          } else if (entry.name === 'route.ts') {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Directory might not exist
      }

      return files
    }

    const routeFiles = findRouteFiles(apiDir)
    const stats = {
      total_routes: routeFiles.length,
      with_auth_check: 0,
      with_org_check: 0,
      missing_auth: 0,
      missing_org: 0,
      admin_routes: 0,
      public_routes: 0
    }

    for (const file of routeFiles) {
      const relativePath = file.replace(process.cwd(), '')
      const content = fs.readFileSync(file, 'utf-8')

      // Skip admin routes (they have different security requirements)
      if (relativePath.includes('/api/admin/')) {
        stats.admin_routes++
        continue
      }

      // Skip public/webhook routes
      if (relativePath.includes('/api/public/') ||
          relativePath.includes('/api/facebook/webhook') ||
          relativePath.includes('/api/webhooks/')) {
        stats.public_routes++
        continue
      }

      const hasAuthCheck = content.includes('auth.getUser()') || content.includes('getUser()')
      const hasOrgCheck = content.includes('organization_id') &&
                         (content.includes('.eq(\'organization_id\'') ||
                          content.includes('.eq("organization_id"'))

      if (hasAuthCheck) {
        stats.with_auth_check++
      } else {
        stats.missing_auth++
        issues.push({
          file: relativePath,
          issue: 'Missing authentication check (auth.getUser())',
          severity: 'critical'
        })
      }

      if (hasOrgCheck) {
        stats.with_org_check++
      } else {
        // Check if it's a route that should have org filtering
        const needsOrgCheck = content.includes('supabase.from(') &&
                             !relativePath.includes('/api/auth/')

        if (needsOrgCheck) {
          stats.missing_org++
          issues.push({
            file: relativePath,
            issue: 'Missing organization_id filter in database query',
            severity: 'critical'
          })
        }
      }

      // Check for service role key usage (should only be in admin routes)
      if (content.includes('SUPABASE_SERVICE_ROLE_KEY') && !relativePath.includes('/api/admin/')) {
        issues.push({
          file: relativePath,
          issue: 'Service role key used outside admin routes',
          severity: 'critical'
        })
      }

      // Check for missing error handling
      const hasExportedFunction = content.match(/export async function (GET|POST|PUT|DELETE|PATCH)/g)
      const hasTryCatch = content.includes('try {') && content.includes('catch')

      if (hasExportedFunction && !hasTryCatch) {
        issues.push({
          file: relativePath,
          issue: 'Missing try/catch error handling',
          severity: 'medium'
        })
      }

      // Check for missing input validation
      if ((content.includes('request.json()') || content.includes('request.nextUrl.searchParams')) &&
          !content.includes('z.')) {
        issues.push({
          file: relativePath,
          issue: 'Missing input validation (Zod schema)',
          severity: 'high'
        })
      }
    }

    // Get RLS policy status
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('pg_tables')
      .select('tablename')
      .limit(1)

    const critical_issues = issues.filter(i => i.severity === 'critical')
    const high_issues = issues.filter(i => i.severity === 'high')
    const medium_issues = issues.filter(i => i.severity === 'medium')

    return NextResponse.json({
      summary: {
        ...stats,
        total_issues: issues.length,
        critical_issues: critical_issues.length,
        high_issues: high_issues.length,
        medium_issues: medium_issues.length,
        security_score: Math.round(
          ((stats.with_auth_check + stats.with_org_check) /
           ((stats.total_routes - stats.admin_routes - stats.public_routes) * 2)) * 100
        )
      },
      issues: {
        critical: critical_issues,
        high: high_issues,
        medium: medium_issues
      },
      rls_status: {
        enabled: !rlsError,
        error: rlsError?.message
      },
      recommendations: [
        'All non-admin, non-public routes MUST have auth.getUser() check',
        'All database queries MUST filter by organization_id',
        'Service role key should ONLY be used in /api/admin routes',
        'All routes should have try/catch error handling',
        'All user inputs should be validated with Zod schemas'
      ],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Security audit error:', error)
    return NextResponse.json({
      error: 'Internal server error during security audit',
      details: String(error)
    }, { status: 500 })
  }
}