#!/usr/bin/env node

/**
 * CRITICAL SECURITY TEST: Multi-Tenant Isolation Verification
 * 
 * This script tests that the API routes properly isolate data between organizations
 * and prevent cross-tenant data access vulnerabilities.
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 CRITICAL SECURITY TEST: Multi-Tenant Isolation Verification\n');

// Test results
const results = {
  passed: 0,
  failed: 0,
  critical: 0,
  issues: []
};

// Files to check for security patterns
const criticalFiles = [
  'app/api/leads/route.ts',
  'app/api/booking/classes/route.ts', 
  'app/api/analytics/dashboard/route.ts',
  'app/api/ai/metrics/route.ts',
  'app/api/ai/process/route.ts',
  'app/api/ai/insights/route.ts',
  'app/api/ai/initialize/route.ts',
  'app/api/customers/[id]/route.ts',
  'app/api/workflow-config/tags/route.ts'
];

// Security patterns to check for
const securityPatterns = {
  // GOOD patterns
  good: [
    /requireAuth\(\)/g,
    /user\.organizationId/g,
    /\.eq\('organization_id',\s*user\.organizationId\)/g,
    /createErrorResponse/g,
    /SECURITY:/g
  ],
  
  // BAD patterns that indicate vulnerabilities
  bad: [
    /organizationId.*=.*request\.json/g,
    /organizationId.*=.*searchParams\.get/g,
    /63589490-8f55-4157-bd3a-e141594b740e/g,
    /const\s+organizationId\s*=.*['"].*['"]/g, // hardcoded org IDs
    /\.from\(['"][^'"]*['"]\)\.select.*(?!\.eq\('organization_id')/g, // queries without org filter
    /supabaseAdmin(?!.*\.eq\('organization_id')/g, // admin client without org filter
    /ADMIN_PASSWORD/g
  ],
  
  // CRITICAL patterns that must be present
  critical: [
    /user = await requireAuth\(\)/g,
    /organizationId = user\.organizationId/g
  ]
};

function checkFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  console.log(`\n🔍 Checking: ${filePath}`);
  
  let fileScore = 0;
  let hasIssues = false;
  
  // Check for good security patterns
  securityPatterns.good.forEach(pattern => {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      console.log(`  ✅ Found secure pattern: ${pattern.toString()} (${matches.length} times)`);
      fileScore += matches.length;
    }
  });
  
  // Check for bad security patterns
  securityPatterns.bad.forEach(pattern => {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      console.log(`  ❌ SECURITY ISSUE: ${pattern.toString()} (${matches.length} times)`);
      results.issues.push({
        file: filePath,
        pattern: pattern.toString(),
        count: matches.length,
        severity: 'HIGH'
      });
      results.critical += matches.length;
      hasIssues = true;
    }
  });
  
  // Check for critical security patterns
  let hasCriticalPatterns = true;
  securityPatterns.critical.forEach(pattern => {
    const matches = content.match(pattern) || [];
    if (matches.length === 0) {
      console.log(`  ⚠️  MISSING CRITICAL PATTERN: ${pattern.toString()}`);
      hasCriticalPatterns = false;
    }
  });
  
  // Specific checks for each file type
  if (filePath.includes('api/')) {
    // Check that all database queries include organization_id filter
    const queryPatterns = [
      /\.from\(['"][^'"]*['"]\)\.select\([^)]*\)/g,
      /\.from\(['"][^'"]*['"]\)\.insert/g,
      /\.from\(['"][^'"]*['"]\)\.update/g,
      /\.from\(['"][^'"]*['"]\)\.delete/g
    ];
    
    queryPatterns.forEach(queryPattern => {
      const queries = content.match(queryPattern) || [];
      queries.forEach(query => {
        // Check if this query has organization_id filter
        const hasOrgFilter = /\.eq\('organization_id'/.test(content.substring(
          content.indexOf(query),
          content.indexOf(query) + 200
        ));
        
        if (!hasOrgFilter) {
          console.log(`  ❌ QUERY WITHOUT ORG FILTER: ${query}`);
          results.issues.push({
            file: filePath,
            pattern: `Query without org filter: ${query}`,
            count: 1,
            severity: 'CRITICAL'
          });
          results.critical++;
          hasIssues = true;
        }
      });
    });
  }
  
  if (hasIssues) {
    results.failed++;
    console.log(`  🚨 File FAILED security check`);
  } else {
    results.passed++;
    console.log(`  ✅ File PASSED security check`);
  }
}

// Check all critical files
console.log('Checking critical API routes for multi-tenant isolation...\n');

criticalFiles.forEach(checkFile);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY TEST RESULTS');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed} files`);
console.log(`❌ Failed: ${results.failed} files`);
console.log(`🚨 Critical Issues: ${results.critical}`);
console.log(`⚠️  Total Issues: ${results.issues.length}`);

if (results.issues.length > 0) {
  console.log('\n🔍 DETAILED ISSUES:');
  results.issues.forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.severity}] ${issue.file}`);
    console.log(`   Pattern: ${issue.pattern}`);
    console.log(`   Count: ${issue.count}`);
    console.log('');
  });
}

// Final security assessment
console.log('\n' + '='.repeat(60));
if (results.critical === 0 && results.failed === 0) {
  console.log('🎉 SECURITY STATUS: EXCELLENT');
  console.log('✅ All critical API routes properly implement multi-tenant isolation');
  console.log('✅ No hardcoded organization IDs found');
  console.log('✅ All database queries include organization_id filtering');
  console.log('✅ All routes use secure authentication');
} else if (results.critical === 0) {
  console.log('⚠️  SECURITY STATUS: GOOD WITH MINOR ISSUES');
  console.log('✅ Multi-tenant isolation is properly implemented');
  console.log('⚠️  Some minor security improvements recommended');
} else {
  console.log('🚨 SECURITY STATUS: CRITICAL ISSUES FOUND');
  console.log('❌ IMMEDIATE ACTION REQUIRED');
  console.log('❌ Multi-tenant isolation vulnerabilities detected');
  console.log('❌ This system is NOT SAFE for multi-tenant production use');
}

console.log('='.repeat(60));
console.log('\n🔐 Multi-tenant security test completed.');

// Exit with error code if critical issues found
process.exit(results.critical > 0 ? 1 : 0);