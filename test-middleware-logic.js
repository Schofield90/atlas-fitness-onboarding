/**
 * Test script for middleware path-based routing logic
 * Run with: node test-middleware-logic.js
 */

// Helper functions (copied from middleware)
function extractOrgSlugFromPath(pathname) {
  const orgSlugMatch = pathname.match(/^\/org\/([a-z0-9-]+)\//)
  return orgSlugMatch?.[1] || null
}

function extractOrgSlugFromApiPath(pathname) {
  const apiOrgMatch = pathname.match(/^\/api\/org\/([a-z0-9-]+)\//)
  return apiOrgMatch?.[1] || null
}

function isProtectedPath(pathname) {
  const protectedPathPatterns = [
    /^\/org\/[^\/]+\/dashboard/,
    /^\/org\/[^\/]+\/customers/,
    /^\/org\/[^\/]+\/leads/,
    /^\/org\/[^\/]+\/settings/,
  ]
  return protectedPathPatterns.some(pattern => pattern.test(pathname))
}

// Test cases
const testCases = [
  {
    name: "Path-based dashboard URL",
    pathname: "/org/atlas-fitness-harrogate-fr72ma/dashboard",
    expectedSlug: "atlas-fitness-harrogate-fr72ma",
    expectedProtected: true,
    expectedMode: "path-based"
  },
  {
    name: "Path-based customers URL",
    pathname: "/org/gymleadhub-admin/customers",
    expectedSlug: "gymleadhub-admin",
    expectedProtected: true,
    expectedMode: "path-based"
  },
  {
    name: "Legacy dashboard URL",
    pathname: "/dashboard",
    expectedSlug: null,
    expectedProtected: false,
    expectedMode: "session-based"
  },
  {
    name: "API path-based URL",
    pathname: "/api/org/atlas-fitness-harrogate-fr72ma/clients",
    expectedSlug: "atlas-fitness-harrogate-fr72ma",
    expectedProtected: false,
    expectedMode: "path-based"
  },
  {
    name: "Legacy API URL",
    pathname: "/api/clients",
    expectedSlug: null,
    expectedProtected: false,
    expectedMode: "session-based"
  },
  {
    name: "Public route",
    pathname: "/login",
    expectedSlug: null,
    expectedProtected: false,
    expectedMode: "public"
  },
  {
    name: "Invalid org slug format (uppercase)",
    pathname: "/org/Atlas-Fitness/dashboard",
    expectedSlug: null, // Pattern only matches lowercase
    expectedProtected: true, // Pattern matches, but slug extraction fails - will 404
    expectedMode: "invalid"
  },
  {
    name: "Nested path-based URL",
    pathname: "/org/test-gym-123/settings/integrations",
    expectedSlug: "test-gym-123",
    expectedProtected: true,
    expectedMode: "path-based"
  }
]

// Run tests
console.log("🧪 Testing Middleware Path Detection Logic\n")
console.log("=" .repeat(80))

let passed = 0
let failed = 0

testCases.forEach((test, index) => {
  const pageSlug = extractOrgSlugFromPath(test.pathname)
  const apiSlug = extractOrgSlugFromApiPath(test.pathname)
  const slug = pageSlug || apiSlug
  const protected_ = isProtectedPath(test.pathname)

  const slugMatch = slug === test.expectedSlug
  const protectedMatch = protected_ === test.expectedProtected

  const success = slugMatch && protectedMatch

  console.log(`\nTest ${index + 1}: ${test.name}`)
  console.log(`  Path: ${test.pathname}`)
  console.log(`  Extracted Slug: ${slug || '(none)'} ${slugMatch ? '✅' : '❌ Expected: ' + test.expectedSlug}`)
  console.log(`  Protected: ${protected_} ${protectedMatch ? '✅' : '❌ Expected: ' + test.expectedProtected}`)
  console.log(`  Mode: ${test.expectedMode}`)

  if (success) {
    console.log(`  Result: ✅ PASS`)
    passed++
  } else {
    console.log(`  Result: ❌ FAIL`)
    failed++
  }
})

console.log("\n" + "=".repeat(80))
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`)

if (failed === 0) {
  console.log("\n🎉 All tests passed! Middleware logic is correct.")
  process.exit(0)
} else {
  console.log("\n⚠️  Some tests failed. Review the middleware implementation.")
  process.exit(1)
}
