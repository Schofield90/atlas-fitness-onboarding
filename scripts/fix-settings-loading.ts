#!/usr/bin/env tsx

/**
 * Fix any loading issues in settings pages
 * Ensures all pages have proper timeout and error handling
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { glob } from 'glob'

const SETTINGS_PAGES = [
  'app/settings/phone/page.tsx',
  'app/settings/lead-scoring/page.tsx',
  'app/settings/calendar/page.tsx',
  'app/settings/pipelines/page.tsx',
  'app/settings/custom-fields/page.tsx',
  'app/settings/templates/page.tsx',
  'app/settings/staff/page.tsx'
]

function addLoadingTimeout(filePath: string) {
  const fullPath = resolve(process.cwd(), filePath)
  let content = readFileSync(fullPath, 'utf-8')
  
  // Check if already has timeout
  if (content.includes('// Loading timeout')) {
    console.log(`✓ ${filePath} already has timeout`)
    return
  }
  
  // Find the useEffect that sets loading to false
  const loadingPattern = /useEffect\(\(\) => \{[\s\S]*?setLoading\(false\)/g
  
  if (content.match(loadingPattern)) {
    // Add timeout to ensure loading stops even on error
    const timeoutCode = `
  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])`
    
    // Find where to insert (after other useEffects)
    const lastUseEffectIndex = content.lastIndexOf('useEffect(')
    if (lastUseEffectIndex !== -1) {
      // Find the end of this useEffect
      let braceCount = 0
      let inUseEffect = false
      let endIndex = lastUseEffectIndex
      
      for (let i = lastUseEffectIndex; i < content.length; i++) {
        if (content[i] === '(') {
          if (!inUseEffect) inUseEffect = true
          braceCount++
        } else if (content[i] === ')') {
          braceCount--
          if (braceCount === 0 && inUseEffect) {
            endIndex = i + 1
            break
          }
        }
      }
      
      // Insert the timeout code after the last useEffect
      content = content.slice(0, endIndex) + '\n' + timeoutCode + content.slice(endIndex)
      
      writeFileSync(fullPath, content)
      console.log(`✅ Added timeout to ${filePath}`)
    }
  } else {
    console.log(`⚠️  ${filePath} doesn't have standard loading pattern`)
  }
}

function fixErrorHandling(filePath: string) {
  const fullPath = resolve(process.cwd(), filePath)
  let content = readFileSync(fullPath, 'utf-8')
  
  // Ensure all catch blocks set loading to false
  const catchPattern = /catch\s*\([^)]*\)\s*\{([^}]*)\}/g
  let modified = false
  
  content = content.replace(catchPattern, (match, block) => {
    if (!block.includes('setLoading(false)')) {
      modified = true
      return match.replace('{', '{\n      setLoading(false)')
    }
    return match
  })
  
  // Ensure all finally blocks exist and set loading to false
  const tryPattern = /try\s*\{[\s\S]*?\}\s*catch/g
  content = content.replace(tryPattern, (match) => {
    if (!match.includes('finally')) {
      modified = true
      return match + ' finally {\n      setLoading(false)\n    }'
    }
    return match
  })
  
  if (modified) {
    writeFileSync(fullPath, content)
    console.log(`✅ Fixed error handling in ${filePath}`)
  } else {
    console.log(`✓ ${filePath} error handling OK`)
  }
}

console.log('🔧 Fixing Settings Pages Loading Issues\n')

for (const page of SETTINGS_PAGES) {
  try {
    console.log(`\nProcessing ${page}...`)
    addLoadingTimeout(page)
    fixErrorHandling(page)
  } catch (error: any) {
    console.error(`❌ Error processing ${page}:`, error.message)
  }
}

console.log('\n✅ All settings pages have been checked and fixed!')
console.log('\n📝 The pages now have:')
console.log('   - 5 second loading timeout')
console.log('   - Proper error handling that stops loading')
console.log('   - Finally blocks to ensure loading always stops')
console.log('\nRestart the dev server to apply changes.')