import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { availabilityEngine } from '@/app/lib/availability-engine'
import { aiBookingTools } from '@/app/lib/ai-booking-tools'

export const runtime = 'nodejs'

// GET /api/test/booking-system - Test the complete booking system integration
export async function GET(request: NextRequest) {
  const results: any[] = []
  let allTestsPassed = true

  try {
    const adminSupabase = createAdminClient()

    // Test 1: Database connectivity and table structure
    results.push(await testDatabaseStructure(adminSupabase))

    // Test 2: Create test organization and user
    const { organizationId, userId } = await createTestData(adminSupabase)
    results.push({ test: 'create_test_data', passed: true, data: { organizationId, userId } })

    // Test 3: Availability engine
    results.push(await testAvailabilityEngine(organizationId, userId))

    // Test 4: AI Booking Tools
    results.push(await testAIBookingTools(organizationId, userId))

    // Test 5: Cleanup test data
    await cleanupTestData(adminSupabase, organizationId, userId)
    results.push({ test: 'cleanup_test_data', passed: true })

  } catch (error) {
    allTestsPassed = false
    results.push({
      test: 'system_error',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Determine overall test result
  allTestsPassed = results.every(result => result.passed)

  return NextResponse.json({
    success: allTestsPassed,
    message: allTestsPassed ? 'All tests passed!' : 'Some tests failed',
    results,
    timestamp: new Date().toISOString()
  })
}

// Test database structure and connectivity
async function testDatabaseStructure(adminSupabase: any) {
  try {
    const tables = [
      'organizations',
      'users',
      'calendar_connections',
      'calendars',
      'availability_rules',
      'availability_overrides',
      'holidays',
      'appointment_types',
      'booking_links',
      'link_branding',
      'bookings',
      'booking_audit',
      'notifications'
    ]

    const missingTables = []

    for (const table of tables) {
      try {
        await adminSupabase.from(table).select('id').limit(1)
      } catch (error) {
        missingTables.push(table)
      }
    }

    return {
      test: 'database_structure',
      passed: missingTables.length === 0,
      data: {
        expectedTables: tables.length,
        missingTables
      }
    }
  } catch (error) {
    return {
      test: 'database_structure',
      passed: false,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

// Create test organization and user
async function createTestData(adminSupabase: any) {
  // Create test organization
  const { data: org, error: orgError } = await adminSupabase
    .from('organizations')
    .insert({
      slug: `test-org-${Date.now()}`,
      name: 'Test Organization',
      plan: 'pro'
    })
    .select('id')
    .single()

  if (orgError || !org) {
    throw new Error('Failed to create test organization')
  }

  // Create test user (simulated)
  const userId = 'test-user-' + Date.now()

  // Create availability rules for the test user
  const availabilityRules = []
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) { // Monday to Friday
    availabilityRules.push({
      user_id: userId,
      organization_id: org.id,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '17:00',
      is_enabled: true,
      timezone: 'Europe/London',
      buffer_before: 0,
      buffer_after: 15
    })
  }

  await adminSupabase
    .from('availability_rules')
    .insert(availabilityRules)

  // Create test appointment type
  await adminSupabase
    .from('appointment_types')
    .insert({
      organization_id: org.id,
      name: 'Test Consultation',
      description: 'Test appointment type',
      duration_minutes: 30,
      buffer_after_minutes: 15,
      is_active: true
    })

  return {
    organizationId: org.id,
    userId
  }
}

// Test availability engine functionality
async function testAvailabilityEngine(organizationId: string, userId: string) {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Test getting availability
    const availability = await availabilityEngine.getAvailability(organizationId, {
      date: tomorrowStr,
      staffId: userId,
      duration: 30
    })

    // Test slot availability check
    const testStartTime = `${tomorrowStr}T10:00:00.000Z`
    const testEndTime = `${tomorrowStr}T10:30:00.000Z`

    const isAvailable = await availabilityEngine.isSlotAvailable(
      userId,
      organizationId,
      testStartTime,
      testEndTime
    )

    return {
      test: 'availability_engine',
      passed: true,
      data: {
        availableSlots: availability.length,
        testSlotAvailable: isAvailable
      }
    }
  } catch (error) {
    return {
      test: 'availability_engine',
      passed: false,
      error: error instanceof Error ? error.message : 'Availability engine test failed'
    }
  }
}

// Test AI Booking Tools functionality
async function testAIBookingTools(organizationId: string, userId: string) {
  try {
    const context = { organizationId, userId }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Test finding availability
    const availabilityResult = await aiBookingTools.findAvailability(context, {
      date: tomorrowStr,
      duration: 30,
      limit: 5
    })

    if (!availabilityResult.success || availabilityResult.slots.length === 0) {
      return {
        test: 'ai_booking_tools',
        passed: false,
        error: 'No availability found for testing'
      }
    }

    // Get appointment type for booking test
    const adminSupabase = createAdminClient()
    const { data: appointmentType } = await adminSupabase
      .from('appointment_types')
      .select('id')
      .eq('organization_id', organizationId)
      .single()

    if (!appointmentType) {
      return {
        test: 'ai_booking_tools',
        passed: false,
        error: 'No appointment type found for testing'
      }
    }

    // Test booking a slot
    const testSlot = availabilityResult.slots[0]
    const bookingResult = await aiBookingTools.bookSlot(context, {
      staffId: testSlot.staff_id,
      appointmentTypeId: appointmentType.id,
      startTime: testSlot.start,
      endTime: testSlot.end,
      attendeeName: 'Test Customer',
      attendeeEmail: 'test@example.com',
      title: 'Test Booking'
    })

    let bookingId = null
    if (bookingResult.success) {
      bookingId = bookingResult.booking.id

      // Test getting booking details
      const getBookingResult = await aiBookingTools.getBooking(context, bookingId)

      if (!getBookingResult.success) {
        return {
          test: 'ai_booking_tools',
          passed: false,
          error: 'Failed to get booking details'
        }
      }

      // Test cancelling booking
      const cancelResult = await aiBookingTools.cancelBooking(context, {
        bookingId,
        reason: 'Test cancellation'
      })

      if (!cancelResult.success) {
        return {
          test: 'ai_booking_tools',
          passed: false,
          error: 'Failed to cancel booking'
        }
      }
    }

    return {
      test: 'ai_booking_tools',
      passed: true,
      data: {
        availabilityFound: availabilityResult.success,
        bookingCreated: bookingResult.success,
        bookingId: bookingId,
        bookingCancelled: true
      }
    }
  } catch (error) {
    return {
      test: 'ai_booking_tools',
      passed: false,
      error: error instanceof Error ? error.message : 'AI booking tools test failed'
    }
  }
}

// Clean up test data
async function cleanupTestData(adminSupabase: any, organizationId: string, userId: string) {
  // Delete availability rules
  await adminSupabase
    .from('availability_rules')
    .delete()
    .eq('user_id', userId)

  // Delete appointment types
  await adminSupabase
    .from('appointment_types')
    .delete()
    .eq('organization_id', organizationId)

  // Delete bookings
  await adminSupabase
    .from('bookings')
    .delete()
    .eq('organization_id', organizationId)

  // Delete organization
  await adminSupabase
    .from('organizations')
    .delete()
    .eq('id', organizationId)
}

// POST /api/test/booking-system - Run specific tests
export async function POST(request: NextRequest) {
  const { testName } = await request.json()

  const adminSupabase = createAdminClient()

  try {
    let result

    switch (testName) {
      case 'database':
        result = await testDatabaseStructure(adminSupabase)
        break

      case 'availability':
        // Create minimal test data
        const { organizationId, userId } = await createTestData(adminSupabase)
        result = await testAvailabilityEngine(organizationId, userId)
        await cleanupTestData(adminSupabase, organizationId, userId)
        break

      case 'ai_tools':
        const { organizationId: orgId, userId: usrId } = await createTestData(adminSupabase)
        result = await testAIBookingTools(orgId, usrId)
        await cleanupTestData(adminSupabase, orgId, usrId)
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown test name'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: result.passed,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}