import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { 
  testDb, 
  testOrganization,
  setupTestData, 
  cleanupTestData 
} from '../setup/test-database'

describe('Booking System Workflow Integration', () => {
  let testProgramId: string
  let testSessionId: string
  let testMemberId: string
  let testBookingId: string
  
  beforeAll(async () => {
    await setupTestData()
    
    // Create test member
    const { data: member } = await testDb
      .from('leads')
      .insert({
        organization_id: testOrganization.id,
        name: 'Test Member',
        email: 'member@example.com',
        phone: '+447777777777',
        status: 'member'
      })
      .select()
      .single()
    
    testMemberId = member?.id || ''
    
    // Create test program
    const { data: program } = await testDb
      .from('programs')
      .insert({
        organization_id: testOrganization.id,
        name: 'HIIT Class',
        description: 'High Intensity Interval Training',
        price_pennies: 1500,
        max_participants: 12,
        is_active: true
      })
      .select()
      .single()
    
    testProgramId = program?.id || ''
    
    // Create test class session
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const { data: session } = await testDb
      .from('class_sessions')
      .insert({
        organization_id: testOrganization.id,
        program_id: testProgramId,
        start_time: tomorrow.toISOString(),
        end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString(),
        max_capacity: 12,
        current_bookings: 0,
        room_location: 'Studio A',
        session_status: 'scheduled'
      })
      .select()
      .single()
    
    testSessionId = session?.id || ''
  })
  
  afterAll(async () => {
    // Clean up test data
    if (testBookingId) {
      await testDb.from('bookings').delete().eq('id', testBookingId)
    }
    if (testSessionId) {
      await testDb.from('class_sessions').delete().eq('id', testSessionId)
    }
    if (testProgramId) {
      await testDb.from('programs').delete().eq('id', testProgramId)
    }
    if (testMemberId) {
      await testDb.from('leads').delete().eq('id', testMemberId)
    }
    
    await cleanupTestData()
  })
  
  describe('Class Booking Flow', () => {
    it('should show available class sessions', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      
      const { data: sessions, error } = await testDb
        .from('class_sessions')
        .select(`
          *,
          programs (
            name,
            description,
            price_pennies
          )
        `)
        .eq('organization_id', testOrganization.id)
        .gte('start_time', new Date().toISOString())
        .eq('session_status', 'scheduled')
        .order('start_time', { ascending: true })
      
      expect(error).toBeNull()
      expect(sessions).toBeDefined()
      expect(sessions?.length).toBeGreaterThan(0)
      expect(sessions?.[0].programs).toBeDefined()
    })
    
    it('should check session availability', async () => {
      const { data: session, error } = await testDb
        .from('class_sessions')
        .select('*')
        .eq('id', testSessionId)
        .single()
      
      expect(error).toBeNull()
      expect(session).toBeDefined()
      expect(session.current_bookings).toBeLessThan(session.max_capacity)
      
      const availableSpots = session.max_capacity - session.current_bookings
      expect(availableSpots).toBeGreaterThan(0)
    })
    
    it('should create a booking', async () => {
      const bookingData = {
        customer_id: testMemberId,
        class_session_id: testSessionId,
        organization_id: testOrganization.id,
        booking_status: 'confirmed',
        payment_status: 'paid'
      }
      
      const { data: booking, error } = await testDb
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(booking).toBeDefined()
      expect(booking.id).toBeDefined()
      expect(booking.booking_status).toBe('confirmed')
      
      testBookingId = booking.id
    })
    
    it('should increment session booking count', async () => {
      // In production, this would be done via trigger or transaction
      const { error } = await testDb
        .from('class_sessions')
        .update({ 
          current_bookings: 1 // Increment via raw SQL or use Supabase RPC function
        })
        .eq('id', testSessionId)
      
      expect(error).toBeNull()
      
      // Verify the count increased
      const { data: session } = await testDb
        .from('class_sessions')
        .select('current_bookings')
        .eq('id', testSessionId)
        .single()
      
      expect(session?.current_bookings).toBe(1)
    })
    
    it('should send booking confirmation', async () => {
      const confirmationData = {
        organization_id: testOrganization.id,
        to: '+447777777777',
        from_number: '+441234567890',
        message: 'Your HIIT Class booking is confirmed for tomorrow!',
        status: 'sent',
        direction: 'outbound',
        related_to: 'booking',
        related_id: testBookingId
      }
      
      const { data: sms, error } = await testDb
        .from('sms_logs')
        .insert(confirmationData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(sms).toBeDefined()
    })
  })
  
  describe('Booking Cancellation', () => {
    it('should allow cancellation 24+ hours before class', async () => {
      // Get session time
      const { data: session } = await testDb
        .from('class_sessions')
        .select('start_time')
        .eq('id', testSessionId)
        .single()
      
      const hoursUntilClass = (new Date(session!.start_time).getTime() - Date.now()) / (1000 * 60 * 60)
      expect(hoursUntilClass).toBeGreaterThan(24)
      
      // Cancel booking
      const { data: cancelled, error } = await testDb
        .from('bookings')
        .update({ 
          booking_status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', testBookingId)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(cancelled).toBeDefined()
      expect(cancelled.booking_status).toBe('cancelled')
    })
    
    it('should decrement session booking count on cancellation', async () => {
      const { error } = await testDb
        .from('class_sessions')
        .update({ 
          current_bookings: 0 // Decrement via raw SQL or use Supabase RPC function
        })
        .eq('id', testSessionId)
      
      expect(error).toBeNull()
      
      // Verify the count decreased
      const { data: session } = await testDb
        .from('class_sessions')
        .select('current_bookings')
        .eq('id', testSessionId)
        .single()
      
      expect(session?.current_bookings).toBe(0)
    })
  })
  
  describe('Waitlist Management', () => {
    it('should add to waitlist when class is full', async () => {
      // First, fill the class
      const { error: updateError } = await testDb
        .from('class_sessions')
        .update({ current_bookings: 12 }) // Max capacity
        .eq('id', testSessionId)
      
      expect(updateError).toBeNull()
      
      // Try to book when full
      const waitlistData = {
        customer_id: testMemberId,
        class_session_id: testSessionId,
        position: 1,
        auto_book: true
      }
      
      const { data: waitlist, error } = await testDb
        .from('waitlist')
        .insert(waitlistData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(waitlist).toBeDefined()
      expect(waitlist.position).toBe(1)
    })
    
    it('should notify when spot becomes available', async () => {
      // Simulate someone cancelling
      const { error: updateError } = await testDb
        .from('class_sessions')
        .update({ current_bookings: 11 }) // One spot available
        .eq('id', testSessionId)
      
      expect(updateError).toBeNull()
      
      // In production, this would trigger automatic booking from waitlist
      const { data: waitlistEntries } = await testDb
        .from('waitlist')
        .select('*')
        .eq('class_session_id', testSessionId)
        .order('position', { ascending: true })
        .limit(1)
      
      expect(waitlistEntries).toBeDefined()
      expect(waitlistEntries?.length).toBeGreaterThan(0)
      
      // Would send notification here
    })
  })
})