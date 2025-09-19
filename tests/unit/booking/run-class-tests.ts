#!/usr/bin/env tsx

/**
 * Comprehensive Test Runner for Class Creation and Display Tests
 *
 * This script demonstrates how to run all the class-related tests
 * and provides example scenarios for verifying the bug fixes.
 *
 * Usage:
 * - npm run test:unit:booking
 * - npx tsx tests/unit/booking/run-class-tests.ts
 * - jest tests/unit/booking/
 */

import { execSync } from 'child_process'
import { TestDataFactory } from './test-data-factory'

interface TestSuite {
  name: string
  file: string
  description: string
  expectedBehavior: string[]
}

const CLASS_TEST_SUITES: TestSuite[] = [
  {
    name: 'Recurring Class Creation',
    file: 'tests/unit/classes/recurring-creation.test.ts',
    description: 'Tests bulk class creation with proper capacity inheritance',
    expectedBehavior: [
      'Creates sessions with max_capacity from program.max_participants',
      'Falls back to default_capacity when max_participants is null',
      'Includes all required session fields',
      'Handles multiple time slots correctly',
      'Validates program existence and handles errors',
      'Creates UTC timestamps correctly for time zones'
    ]
  },
  {
    name: 'Class Display and Filtering',
    file: 'tests/unit/booking/classes-display.test.ts',
    description: 'Tests class retrieval and display logic',
    expectedBehavior: [
      'Filters out cancelled classes at database level',
      'Resolves capacity priority: max_capacity > max_participants > default_capacity > capacity > 20',
      'Includes all required fields for calendar display',
      'Counts unique bookings and adds membership status',
      'Handles empty bookings gracefully',
      'Applies organization security filtering',
      'Supports date range filtering'
    ]
  },
  {
    name: 'End-to-End Integration',
    file: 'tests/unit/booking/classes-integration.test.ts',
    description: 'Tests complete data flow from creation to display',
    expectedBehavior: [
      'Maintains data consistency between creation and display APIs',
      'Correctly handles the 6am classes with max_participants=8 scenario',
      'Filters cancelled sessions in display after creation',
      'Resolves capacity correctly across the entire flow',
      'Maintains data integrity across multiple retrievals'
    ]
  },
  {
    name: 'Edge Cases and Error Handling',
    file: 'tests/unit/booking/classes-edge-cases.test.ts',
    description: 'Tests boundary conditions and error scenarios',
    expectedBehavior: [
      'Handles missing required fields gracefully',
      'Processes sessions with no capacity information',
      'Manages mixed session statuses correctly',
      'Handles malformed booking data',
      'Validates invalid time slots appropriately',
      'Manages database constraint violations',
      'Handles large booking counts efficiently'
    ]
  }
]

/**
 * Display the bug report scenario that these tests verify
 */
function displayBugReportScenario() {
  console.log('\n🐛 BUG REPORT SCENARIO BEING TESTED:')
  console.log('=====================================')

  const scenario = TestDataFactory.createBugReportScenario()

  console.log('Program Details:')
  console.log(`  Name: ${scenario.program.name}`)
  console.log(`  max_participants: ${scenario.program.max_participants} (should be final capacity)`)
  console.log(`  default_capacity: ${scenario.program.default_capacity} (should NOT be used)`)

  console.log('\nGenerated Sessions:')
  scenario.sessions.forEach((session, index) => {
    const date = new Date(session.start_time).toLocaleDateString()
    const time = new Date(session.start_time).toLocaleTimeString()
    console.log(`  ${index + 1}. ${date} at ${time} - Status: ${session.session_status} - Capacity: ${session.max_capacity}`)
  })

  const activeSessionsCount = scenario.sessions.filter(s => s.session_status !== 'cancelled').length
  const cancelledSessionsCount = scenario.sessions.filter(s => s.session_status === 'cancelled').length

  console.log('\nExpected Test Results:')
  console.log(`  ✓ Total sessions created: ${scenario.sessions.length}`)
  console.log(`  ✓ Active sessions displayed: ${activeSessionsCount}`)
  console.log(`  ✓ Cancelled sessions filtered: ${cancelledSessionsCount}`)
  console.log(`  ✓ All displayed sessions have capacity: 8 (NOT 12)`)
  console.log(`  ✓ All sessions at 6:00 AM UTC`)
}

/**
 * Display capacity resolution test scenarios
 */
function displayCapacityResolutionScenario() {
  console.log('\n📊 CAPACITY RESOLUTION TEST SCENARIOS:')
  console.log('======================================')

  const sessions = TestDataFactory.createCapacityResolutionScenario()

  sessions.forEach((session, index) => {
    console.log(`\nScenario ${index + 1}: ${session.id}`)
    console.log(`  max_capacity: ${session.max_capacity}`)
    console.log(`  capacity: ${session.capacity}`)
    console.log(`  program.max_participants: ${session.program?.max_participants}`)
    console.log(`  program.default_capacity: ${session.program?.default_capacity}`)

    // Show expected resolution
    const expectedCapacity =
      session.max_capacity ||
      session.program?.max_participants ||
      session.program?.default_capacity ||
      session.capacity ||
      20

    console.log(`  → Expected final capacity: ${expectedCapacity}`)
  })
}

/**
 * Run a specific test suite
 */
function runTestSuite(suite: TestSuite) {
  console.log(`\n🧪 Running: ${suite.name}`)
  console.log(`📄 File: ${suite.file}`)
  console.log(`📝 Description: ${suite.description}`)

  try {
    const result = execSync(`npx jest ${suite.file} --verbose`, {
      encoding: 'utf8',
      stdio: 'pipe'
    })

    console.log('✅ PASSED')
    console.log('\nExpected Behaviors Verified:')
    suite.expectedBehavior.forEach(behavior => {
      console.log(`  ✓ ${behavior}`)
    })

    return true
  } catch (error: any) {
    console.log('❌ FAILED')
    console.error('Error output:', error.stdout || error.message)
    return false
  }
}

/**
 * Run all class-related tests
 */
function runAllTests() {
  console.log('🚀 ATLAS FITNESS CLASS TESTING SUITE')
  console.log('====================================')
  console.log('Testing bulk class creation and display fixes')

  displayBugReportScenario()
  displayCapacityResolutionScenario()

  console.log('\n📋 TEST SUITES TO RUN:')
  console.log('======================')

  let passedCount = 0
  let totalCount = CLASS_TEST_SUITES.length

  for (const suite of CLASS_TEST_SUITES) {
    if (runTestSuite(suite)) {
      passedCount++
    }
  }

  console.log('\n📊 TEST SUMMARY:')
  console.log('================')
  console.log(`Passed: ${passedCount}/${totalCount}`)
  console.log(`Failed: ${totalCount - passedCount}/${totalCount}`)

  if (passedCount === totalCount) {
    console.log('\n🎉 ALL TESTS PASSED!')
    console.log('✅ Bulk class creation and display issues are fixed')
    console.log('✅ Capacity resolution works correctly')
    console.log('✅ Cancelled sessions are properly filtered')
    console.log('✅ 6am classes show capacity of 8, not 12')
  } else {
    console.log('\n❌ SOME TESTS FAILED!')
    console.log('Please review the failed tests and fix any issues.')
    process.exit(1)
  }
}

/**
 * Show available test commands
 */
function showTestCommands() {
  console.log('\n📖 AVAILABLE TEST COMMANDS:')
  console.log('===========================')
  console.log('Run all class tests:')
  console.log('  npm run test:unit:booking')
  console.log('  jest tests/unit/booking/ tests/unit/classes/')
  console.log('')
  console.log('Run specific test suites:')
  CLASS_TEST_SUITES.forEach(suite => {
    const fileName = suite.file.split('/').pop()
    console.log(`  jest ${suite.file}  # ${suite.name}`)
  })
  console.log('')
  console.log('Run with coverage:')
  console.log('  jest --coverage tests/unit/booking/ tests/unit/classes/')
  console.log('')
  console.log('Run in watch mode:')
  console.log('  jest --watch tests/unit/booking/')
  console.log('')
  console.log('Run specific test patterns:')
  console.log('  jest --testNamePattern="capacity" tests/unit/booking/')
  console.log('  jest --testNamePattern="cancelled" tests/unit/booking/')
  console.log('  jest --testNamePattern="6am" tests/unit/booking/')
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    showTestCommands()
    return
  }

  if (args.includes('--scenario') || args.includes('-s')) {
    displayBugReportScenario()
    displayCapacityResolutionScenario()
    return
  }

  if (args.includes('--commands') || args.includes('-c')) {
    showTestCommands()
    return
  }

  // Run all tests by default
  runAllTests()
}

// Execute if run directly
if (require.main === module) {
  main()
}

export { CLASS_TEST_SUITES, runAllTests, displayBugReportScenario, displayCapacityResolutionScenario }