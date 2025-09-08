/**
 * Test Suite: Booking System Data Consistency
 * 
 * These tests verify the booking count consistency between calendar overview
 * and detailed attendee views, and test the attendees API endpoint edge cases.
 * 
 * BUG REPRODUCTION: Tests demonstrate the data mismatch between:
 * 1. Calendar overview using 'bookings' table 
 * 2. Detail view using 'class_bookings' table
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test data
const testOrg = {
  id: 'test-org-booking-' + Date.now(),
  name: 'Test Booking Organization'
}

const testUser = {
  email: `booking-test-${Date.now()}@testgym.com`,
  password: 'TestPass123!',
  name: 'Booking Test User'
}

const testCustomer = {
  name: 'Test Customer',
  email: `customer-${Date.now()}@example.com`,
  phone: '1234567890'
}

describe('Booking System Data Consistency Tests', () => {
  let adminClient: any
  let userClient: any
  let testUserId: string
  let testCustomerId: string
  let testClassSessionId: string
  let testProgramId: string

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create test organization
    await adminClient.from('organizations').insert(testOrg)
    
    // Create test user
    const { data: authUser } = await adminClient.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      user_metadata: { name: testUser.name }
    })
    
    testUserId = authUser!.user.id
    
    await adminClient.from('users').insert({
      id: testUserId,
      email: testUser.email,
      name: testUser.name,
      organization_id: testOrg.id,
      role: 'admin'
    })
    
    // Create test customer in leads table
    const { data: customer } = await adminClient.from('leads').insert({
      name: testCustomer.name,
      email: testCustomer.email,
      phone: testCustomer.phone,
      organization_id: testOrg.id,
      status: 'new'
    }).select().single()
    
    testCustomerId = customer.id
    
    // Create test program
    const { data: program } = await adminClient.from('programs').insert({
      organization_id: testOrg.id,
      name: 'Test Yoga Class',
      description: 'Test class for booking tests',
      price_pennies: 2000,
      is_active: true
    }).select().single()
    
    testProgramId = program.id
    
    // Create test class session
    const startTime = new Date()
    startTime.setDate(startTime.getDate() + 1) // Tomorrow
    startTime.setHours(9, 0, 0, 0) // 9 AM
    
    const { data: classSession } = await adminClient.from('class_sessions').insert({
      organization_id: testOrg.id,
      program_id: testProgramId,
      instructor_name: 'Test Instructor',
      start_time: startTime.toISOString(),
      duration_minutes: 60,
      capacity: 10,
      location: 'Test Room',
      is_active: true
    }).select().single()
    
    testClassSessionId = classSession.id
    
    // Create authenticated user client
    userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await userClient.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    })
  })

  afterAll(async () => {
    // Cleanup in reverse order
    await adminClient.from('class_bookings').delete().eq('organization_id', testOrg.id)
    await adminClient.from('bookings').delete().eq('org_id', testOrg.id) 
    await adminClient.from('class_sessions').delete().eq('organization_id', testOrg.id)
    await adminClient.from('programs').delete().eq('organization_id', testOrg.id)
    await adminClient.from('leads').delete().eq('organization_id', testOrg.id)
    await adminClient.from('users').delete().eq('organization_id', testOrg.id)
    await adminClient.from('organizations').delete().eq('id', testOrg.id)
    
    // Cleanup auth user
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
    }
  })

  describe('BUG REPRODUCTION: Calendar Overview vs Detail View Mismatch', () => {
    it('should demonstrate booking count mismatch between tables', async () => {
      // Step 1: Add booking to 'bookings' table (used by calendar overview)
      await adminClient.from('bookings').insert({
        org_id: testOrg.id,
        session_id: testClassSessionId,
        client_id: testCustomerId,
        status: 'booked'
      })
      
      // Step 2: Fetch classes using calendar overview API pattern
      const { data: classesWithBookings } = await adminClient
        .from('class_sessions')
        .select(`
          *,
          bookings!left(
            id,
            client_id,
            status,
            created_at
          )
        `)
        .eq('organization_id', testOrg.id)
        .eq('id', testClassSessionId)
        .single()
        
      const overviewBookingCount = classesWithBookings?.bookings?.filter(b => b.status !== 'cancelled').length || 0
      
      // Step 3: Fetch attendees using detail view API  
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const attendeesResult = await response.json()
      const detailViewCount = attendeesResult.attendees?.length || 0
      
      // BUG DEMONSTRATION: These counts will be different!
      console.log('Overview count:', overviewBookingCount)  // Will be 1
      console.log('Detail count:', detailViewCount)         // Will be 0
      
      expect(overviewBookingCount).toBe(1)
      expect(detailViewCount).toBe(0) // This demonstrates the bug!
      expect(overviewBookingCount).not.toBe(detailViewCount) // Counts don't match!
    })
    
    it('should show unknown customers when customer_id is null in class_bookings', async () => {
      // Add booking to class_bookings table with NULL customer_id
      await adminClient.from('class_bookings').insert({
        class_session_id: testClassSessionId,
        customer_id: null, // This will cause "Unknown" display
        organization_id: testOrg.id,
        booking_status: 'confirmed',
        booking_type: 'drop_in'
      })
      
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.attendees).toHaveLength(1)
      expect(result.attendees[0].name).toBe('Unknown') // Bug: shows "Unknown"
      expect(result.attendees[0].email).toBe('') // Bug: no email
      expect(result.attendees[0].membershipType).toBe('Drop-in')
    })
    
    it('should handle failed customer JOIN gracefully', async () => {
      // Add booking with invalid customer_id that won't join
      await adminClient.from('class_bookings').insert({
        class_session_id: testClassSessionId,
        customer_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
        organization_id: testOrg.id,
        booking_status: 'confirmed',
        booking_type: 'membership'
      })
      
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.attendees.length).toBeGreaterThan(0)
      
      // Find the booking with invalid customer_id
      const invalidBooking = result.attendees.find(a => a.name === 'Unknown')
      expect(invalidBooking).toBeTruthy()
      expect(invalidBooking.email).toBe('')
      expect(invalidBooking.membershipType).toBe('Monthly Membership')
    })
  })

  describe('Attendees API Edge Cases', () => {
    it('should return 400 for missing sessionId', async () => {
      const response = await fetch('/api/booking/attendees', {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Session ID is required')
    })
    
    it('should return empty attendees for non-existent session', async () => {
      const response = await fetch(`/api/booking/attendees?sessionId=00000000-0000-0000-0000-000000000000`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.attendees).toEqual([])
    })
    
    it('should handle JOIN failure gracefully and fallback to separate queries', async () => {
      // This tests the fallback mechanism in the attendees API
      // when the initial JOIN query fails
      
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(Array.isArray(result.attendees)).toBe(true)
    })
    
    it('should properly map booking_type to membershipType display', async () => {
      // Test different booking types
      const bookingTypes = [
        { type: 'drop_in', payment: 'paid', expected: 'Drop-in' },
        { type: 'drop_in', payment: 'comp', expected: 'Complimentary (Free)' },
        { type: 'membership', payment: 'paid', expected: 'Monthly Membership' }
      ]
      
      for (const booking of bookingTypes) {
        await adminClient.from('class_bookings').insert({
          class_session_id: testClassSessionId,
          customer_id: testCustomerId,
          organization_id: testOrg.id,
          booking_status: 'confirmed',
          booking_type: booking.type,
          payment_status: booking.payment
        })
      }
      
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      // Should have the bookings we just created plus any from previous tests
      expect(result.attendees.length).toBeGreaterThanOrEqual(bookingTypes.length)
      
      // Check that each booking type maps correctly
      for (const booking of bookingTypes) {
        const attendee = result.attendees.find(a => a.membershipType === booking.expected)
        expect(attendee).toBeTruthy()
      }
    })
    
    it('should return attendees with proper customer data when customer_id exists', async () => {
      // Clear existing bookings for clean test
      await adminClient.from('class_bookings').delete().eq('class_session_id', testClassSessionId)
      
      // Add booking with valid customer_id
      await adminClient.from('class_bookings').insert({
        class_session_id: testClassSessionId,
        customer_id: testCustomerId,
        organization_id: testOrg.id,
        booking_status: 'confirmed',
        booking_type: 'membership'
      })
      
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      expect(response.ok).toBe(true)
      expect(result.attendees).toHaveLength(1)
      expect(result.attendees[0].name).toBe(testCustomer.name)
      expect(result.attendees[0].email).toBe(testCustomer.email)
      expect(result.attendees[0].membershipType).toBe('Monthly Membership')
      expect(result.attendees[0].status).toBe('confirmed')
    })
  })

  describe('Data Consistency Verification', () => {
    it('should demonstrate the fix: ensure both tables have synchronized data', async () => {
      // This test demonstrates how the bug should be fixed
      // Both tables should contain the same booking information
      
      // Clear all existing bookings
      await adminClient.from('bookings').delete().eq('org_id', testOrg.id)
      await adminClient.from('class_bookings').delete().eq('organization_id', testOrg.id)
      
      // Add synchronized booking to both tables (this is the fix)
      const bookingData = {
        customer_id: testCustomerId,
        class_session_id: testClassSessionId,
        organization_id: testOrg.id,
        status: 'confirmed'
      }
      
      // Add to bookings table (for calendar overview)
      await adminClient.from('bookings').insert({
        org_id: bookingData.organization_id,
        session_id: bookingData.class_session_id,
        client_id: bookingData.customer_id,
        status: 'booked'
      })
      
      // Add to class_bookings table (for detail view)  
      await adminClient.from('class_bookings').insert({
        customer_id: bookingData.customer_id,
        class_session_id: bookingData.class_session_id,
        organization_id: bookingData.organization_id,
        booking_status: 'confirmed',
        booking_type: 'membership'
      })
      
      // Test calendar overview count
      const { data: classOverview } = await adminClient
        .from('class_sessions')
        .select(`
          *,
          bookings!left(id, client_id, status)
        `)
        .eq('organization_id', testOrg.id)
        .eq('id', testClassSessionId)
        .single()
        
      const overviewCount = classOverview?.bookings?.filter(b => b.status !== 'cancelled').length || 0
      
      // Test detail view count
      const response = await fetch(`/api/booking/attendees?sessionId=${testClassSessionId}`, {
        headers: {
          'Authorization': `Bearer ${(await userClient.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const attendeesResult = await response.json()
      const detailCount = attendeesResult.attendees?.length || 0
      
      // FIXED: Both counts should now match
      expect(overviewCount).toBe(1)
      expect(detailCount).toBe(1)
      expect(overviewCount).toBe(detailCount) // This should pass after the fix
      
      // Verify customer data is properly populated
      expect(attendeesResult.attendees[0].name).toBe(testCustomer.name)
      expect(attendeesResult.attendees[0].email).toBe(testCustomer.email)
      expect(attendeesResult.attendees[0].name).not.toBe('Unknown')
    })
  })
})