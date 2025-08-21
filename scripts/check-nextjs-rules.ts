#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

interface Violation {
  file: string
  line: number
  rule: string
  message: string
  fix?: string
}

const violations: Violation[] = []

// Recursively find all TypeScript/JavaScript files
function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = []
  
  function walk(currentDir: string) {
    const entries = readdirSync(currentDir)
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry)
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== '.next') {
          walk(fullPath)
        }
      } else if (pattern.test(entry)) {
        files.push(fullPath)
      }
    }
  }
  
  walk(dir)
  return files
}

// Check for useSearchParams without Suspense
function checkUseSearchParams(content: string, filePath: string) {
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (line.includes('useSearchParams()') || line.includes('useSearchParams(')) {
      // Check if file has 'use client' directive
      const hasUseClient = lines.some(l => l.includes("'use client'") || l.includes('"use client"'))
      
      if (!hasUseClient) {
        violations.push({
          file: relative(process.cwd(), filePath),
          line: i + 1,
          rule: 'missing-use-client',
          message: 'useSearchParams() requires "use client" directive',
          fix: 'Add "use client" at the top of the file'
        })
      }
      
      // Check for Suspense wrapper
      const hasSuspense = content.includes('<Suspense') || content.includes('Suspense>')
      
      if (!hasSuspense) {
        violations.push({
          file: relative(process.cwd(), filePath),
          line: i + 1,
          rule: 'missing-suspense',
          message: 'useSearchParams() must be wrapped in <Suspense>',
          fix: 'Wrap the component using useSearchParams in <Suspense fallback={...}>'
        })
      }
    }
  }
}

// Check for browser APIs in server components
function checkBrowserAPIs(content: string, filePath: string) {
  const lines = content.split('\n')
  const hasUseClient = lines.some(l => l.includes("'use client'") || l.includes('"use client"'))
  
  // Skip if it's a client component
  if (hasUseClient) return
  
  // Skip test files and config files
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('.config.')) return
  
  const browserAPIs = [
    { pattern: /\bwindow\./g, name: 'window' },
    { pattern: /\bdocument\./g, name: 'document' },
    { pattern: /\blocalStorage\./g, name: 'localStorage' },
    { pattern: /\bsessionStorage\./g, name: 'sessionStorage' },
    { pattern: /\bnavigator\./g, name: 'navigator' },
    { pattern: /\blocation\./g, name: 'location' }
  ]
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
    
    for (const api of browserAPIs) {
      if (api.pattern.test(line)) {
        // Check if it's wrapped in a typeof check
        if (!line.includes(`typeof ${api.name} !== 'undefined'`)) {
          violations.push({
            file: relative(process.cwd(), filePath),
            line: i + 1,
            rule: 'browser-api-in-server',
            message: `${api.name} API used in server component`,
            fix: `Either add "use client" directive or wrap in: if (typeof ${api.name} !== 'undefined')`
          })
        }
      }
    }
  }
}

// Check for direct database calls in client components
function checkDatabaseCalls(content: string, filePath: string) {
  const lines = content.split('\n')
  const hasUseClient = lines.some(l => l.includes("'use client'") || l.includes('"use client"'))
  
  // Only check client components
  if (!hasUseClient) return
  
  const dbPatterns = [
    /createClient\(\)/g,
    /supabase\./g,
    /prisma\./g,
    /SELECT.*FROM/gi,
    /INSERT.*INTO/gi,
    /UPDATE.*SET/gi,
    /DELETE.*FROM/gi
  ]
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    for (const pattern of dbPatterns) {
      if (pattern.test(line)) {
        violations.push({
          file: relative(process.cwd(), filePath),
          line: i + 1,
          rule: 'database-in-client',
          message: 'Database operations not allowed in client components',
          fix: 'Move database operations to Server Components or API routes'
        })
      }
    }
  }
}

// Main execution
function main() {
  const appDir = join(process.cwd(), 'app')
  const files = findFiles(appDir, /\.(ts|tsx|js|jsx)$/)
  
  console.log(`🔍 Checking ${files.length} files for Next.js App Router violations...\n`)
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      
      checkUseSearchParams(content, file)
      checkBrowserAPIs(content, file)
      checkDatabaseCalls(content, file)
    } catch (error) {
      console.error(`Error reading ${file}:`, error)
    }
  }
  
  // Report violations
  if (violations.length === 0) {
    console.log('✅ No Next.js App Router violations found!')
    process.exit(0)
  } else {
    console.log(`❌ Found ${violations.length} violations:\n`)
    
    // Group by rule
    const byRule = violations.reduce((acc, v) => {
      if (!acc[v.rule]) acc[v.rule] = []
      acc[v.rule].push(v)
      return acc
    }, {} as Record<string, Violation[]>)
    
    for (const [rule, items] of Object.entries(byRule)) {
      console.log(`\n📋 ${rule} (${items.length} violations):`)
      console.log('─'.repeat(50))
      
      for (const item of items) {
        console.log(`  ${item.file}:${item.line}`)
        console.log(`    ⚠️  ${item.message}`)
        if (item.fix) {
          console.log(`    💡 ${item.fix}`)
        }
      }
    }
    
    console.log('\n')
    console.log('Fix these violations and run the check again.')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { checkUseSearchParams, checkBrowserAPIs, checkDatabaseCalls, findFiles }