import { availabilityEngine } from './availability-engine'
import { googleCalendarService } from './google-calendar-enhanced'
import { notificationService } from './notification-service'
import { createAdminClient } from './supabase/admin'

export interface BookingToolsContext {
  organizationId?: string
  organizationSlug?: string
  userId?: string
  userRole?: string
}

/**
 * AI Booking Tools for Claude Integration
 * These tools allow Claude to interact with the booking system
 */
export class AIBookingTools {
  private adminSupabase = createAdminClient()

  /**
   * Find available appointment slots
   */
  async findAvailability(
    context: BookingToolsContext,
    options: {
      date?: string
      dateRange?: { start: string; end: string }
      duration?: number
      appointmentTypeId?: string
      staffId?: string
      limit?: number
    }
  ) {
    try {
      if (!context.organizationId && !context.organizationSlug) {
        throw new Error('Organization ID or slug is required')
      }

      let organizationId = context.organizationId

      // Get organization ID from slug if needed
      if (!organizationId && context.organizationSlug) {
        const { data: org } = await this.adminSupabase
          .from('organizations')
          .select('id')
          .eq('slug', context.organizationSlug)
          .single()
        
        if (!org) {
          throw new Error('Organization not found')
        }
        organizationId = org.id
      }

      // Get availability slots
      const availabilityOptions = {
        dateRange: options.dateRange || (options.date ? { start: options.date, end: options.date } : undefined),
        duration: options.duration || 30,
        appointmentTypeId: options.appointmentTypeId,
        staffId: options.staffId,
        timezone: 'Europe/London'
      }

      const slots = await availabilityEngine.getAvailability(organizationId!, availabilityOptions)

      // Limit results if specified
      const limitedSlots = options.limit ? slots.slice(0, options.limit) : slots

      // Enhance slots with additional information
      const enhancedSlots = await this.enhanceAvailabilitySlots(limitedSlots, organizationId!)

      return {
        success: true,
        slots: enhancedSlots,
        total: slots.length,
        returned: limitedSlots.length
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find availability'
      }
    }
  }

  /**
   * Book an appointment slot
   */
  async bookSlot(
    context: BookingToolsContext,
    bookingData: {
      staffId: string
      appointmentTypeId: string
      startTime: string
      endTime: string
      attendeeName: string
      attendeeEmail: string
      attendeePhone?: string
      title?: string
      description?: string
      locationDetails?: string
      customFields?: Record<string, any>
      linkSlug?: string
    }
  ) {
    try {
      if (!context.organizationId && !context.organizationSlug) {
        throw new Error('Organization ID or slug is required')
      }

      let organizationId = context.organizationId

      // Get organization ID from slug if needed
      if (!organizationId && context.organizationSlug) {
        const { data: org } = await this.adminSupabase
          .from('organizations')
          .select('id')
          .eq('slug', context.organizationSlug)
          .single()
        
        if (!org) {
          throw new Error('Organization not found')
        }
        organizationId = org.id
      }

      // Check if the slot is still available
      const isAvailable = await availabilityEngine.isSlotAvailable(
        bookingData.staffId,
        organizationId!,
        bookingData.startTime,
        bookingData.endTime,
        bookingData.appointmentTypeId
      )

      if (!isAvailable) {
        return {
          success: false,
          error: 'Time slot is no longer available'
        }
      }

      // Get appointment type details
      const { data: appointmentType } = await this.adminSupabase
        .from('appointment_types')
        .select('*')
        .eq('id', bookingData.appointmentTypeId)
        .single()

      if (!appointmentType) {
        return {
          success: false,
          error: 'Appointment type not found'
        }
      }

      // Check for existing customer
      let customerId: string
      const { data: existingLead } = await this.adminSupabase
        .from('leads')
        .select('id')
        .eq('email', bookingData.attendeeEmail)
        .eq('org_id', organizationId)
        .single()

      if (existingLead) {
        customerId = existingLead.id
      } else {
        // Create new customer
        const { data: newLead, error: leadError } = await this.adminSupabase
          .from('leads')
          .insert({
            org_id: organizationId,
            email: bookingData.attendeeEmail,
            phone: bookingData.attendeePhone,
            first_name: bookingData.attendeeName.split(' ')[0],
            last_name: bookingData.attendeeName.split(' ').slice(1).join(' ') || '',
            status: 'new',
            source: 'ai_assistant',
            tags: ['ai-booking'],
            metadata: {
              booked_by_ai: true,
              custom_fields: bookingData.customFields
            }
          })
          .select('id')
          .single()

        if (leadError || !newLead) {
          return {
            success: false,
            error: 'Failed to create customer record'
          }
        }
        customerId = newLead.id
      }

      // Create the booking
      const bookingTitle = bookingData.title || `${appointmentType.name} with ${bookingData.attendeeName}`

      const { data: booking, error: bookingError } = await this.adminSupabase
        .from('bookings')
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          assigned_to: bookingData.staffId,
          appointment_type_id: bookingData.appointmentTypeId,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          title: bookingTitle,
          description: bookingData.description,
          location_details: bookingData.locationDetails,
          attendee_name: bookingData.attendeeName,
          attendee_email: bookingData.attendeeEmail,
          attendee_phone: bookingData.attendeePhone,
          timezone: 'Europe/London',
          custom_fields: bookingData.customFields || {},
          booking_status: 'confirmed',
          payment_status: 'pending'
        })
        .select('*')
        .single()

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Failed to create booking'
        }
      }

      // Sync with Google Calendar
      try {
        await googleCalendarService.syncBookingWithGoogle(bookingData.staffId, booking, 'create')
      } catch (error) {
        console.error('Failed to sync with Google Calendar:', error)
      }

      // Schedule notifications
      try {
        await notificationService.scheduleBookingConfirmation(booking, appointmentType)
        await notificationService.scheduleBookingReminders(booking, appointmentType)
      } catch (error) {
        console.error('Failed to schedule notifications:', error)
      }

      return {
        success: true,
        booking: {
          id: booking.id,
          title: booking.title,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.booking_status,
          confirmationToken: booking.confirmation_token,
          cancellationToken: booking.cancellation_token,
          attendeeName: booking.attendee_name,
          attendeeEmail: booking.attendee_email
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to book appointment'
      }
    }
  }

  /**
   * Reschedule an existing booking
   */
  async rescheduleBooking(
    context: BookingToolsContext,
    options: {
      bookingId: string
      newStartTime: string
      newEndTime: string
      reason?: string
    }
  ) {
    try {
      // Get the existing booking
      const { data: booking, error: bookingError } = await this.adminSupabase
        .from('bookings')
        .select(`
          *,
          appointment_type:appointment_types(*)
        `)
        .eq('id', options.bookingId)
        .single()

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Booking not found'
        }
      }

      // Check permissions
      if (context.organizationId && booking.organization_id !== context.organizationId) {
        return {
          success: false,
          error: 'Access denied to this booking'
        }
      }

      // Check if booking can be rescheduled
      if (booking.booking_status !== 'confirmed') {
        return {
          success: false,
          error: 'Booking cannot be rescheduled in its current status'
        }
      }

      // Check if new slot is available
      const isAvailable = await availabilityEngine.isSlotAvailable(
        booking.assigned_to,
        booking.organization_id,
        options.newStartTime,
        options.newEndTime,
        booking.appointment_type_id
      )

      if (!isAvailable) {
        return {
          success: false,
          error: 'New time slot is not available'
        }
      }

      // Update the booking
      const { data: updatedBooking, error: updateError } = await this.adminSupabase
        .from('bookings')
        .update({
          start_time: options.newStartTime,
          end_time: options.newEndTime,
          reschedule_count: booking.reschedule_count + 1,
          notes: booking.notes ? 
            `${booking.notes}\n\nRescheduled by AI on ${new Date().toISOString()}: ${options.reason || 'No reason provided'}` :
            `Rescheduled by AI on ${new Date().toISOString()}: ${options.reason || 'No reason provided'}`
        })
        .eq('id', options.bookingId)
        .select('*')
        .single()

      if (updateError || !updatedBooking) {
        return {
          success: false,
          error: 'Failed to reschedule booking'
        }
      }

      // Update Google Calendar
      try {
        if (booking.google_event_id) {
          await googleCalendarService.updateBookingEvent(
            booking.assigned_to,
            booking.google_event_id,
            {
              start_time: options.newStartTime,
              end_time: options.newEndTime,
              timezone: booking.timezone
            }
          )
        }
      } catch (error) {
        console.error('Failed to update Google Calendar:', error)
      }

      // Send notification
      try {
        await notificationService.sendRescheduleNotification(updatedBooking, booking.appointment_type)
      } catch (error) {
        console.error('Failed to send reschedule notification:', error)
      }

      return {
        success: true,
        booking: {
          id: updatedBooking.id,
          title: updatedBooking.title,
          startTime: updatedBooking.start_time,
          endTime: updatedBooking.end_time,
          rescheduleCount: updatedBooking.reschedule_count
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule booking'
      }
    }
  }

  /**
   * Cancel an existing booking
   */
  async cancelBooking(
    context: BookingToolsContext,
    options: {
      bookingId: string
      reason?: string
    }
  ) {
    try {
      // Get the existing booking
      const { data: booking, error: bookingError } = await this.adminSupabase
        .from('bookings')
        .select(`
          *,
          appointment_type:appointment_types(*)
        `)
        .eq('id', options.bookingId)
        .single()

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Booking not found'
        }
      }

      // Check permissions
      if (context.organizationId && booking.organization_id !== context.organizationId) {
        return {
          success: false,
          error: 'Access denied to this booking'
        }
      }

      // Check if booking can be cancelled
      if (booking.booking_status === 'cancelled') {
        return {
          success: false,
          error: 'Booking is already cancelled'
        }
      }

      if (booking.booking_status === 'completed' || booking.booking_status === 'attended') {
        return {
          success: false,
          error: 'Cannot cancel a completed booking'
        }
      }

      // Update booking status
      const { data: cancelledBooking, error: updateError } = await this.adminSupabase
        .from('bookings')
        .update({
          booking_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: options.reason,
          notes: booking.notes ? 
            `${booking.notes}\n\nCancelled by AI on ${new Date().toISOString()}: ${options.reason || 'No reason provided'}` :
            `Cancelled by AI on ${new Date().toISOString()}: ${options.reason || 'No reason provided'}`
        })
        .eq('id', options.bookingId)
        .select('*')
        .single()

      if (updateError || !cancelledBooking) {
        return {
          success: false,
          error: 'Failed to cancel booking'
        }
      }

      // Delete Google Calendar event
      try {
        if (booking.google_event_id) {
          await googleCalendarService.deleteBookingEvent(
            booking.assigned_to,
            booking.google_event_id
          )
        }
      } catch (error) {
        console.error('Failed to delete Google Calendar event:', error)
      }

      // Send notification
      try {
        await notificationService.sendCancellationNotification(cancelledBooking, booking.appointment_type)
      } catch (error) {
        console.error('Failed to send cancellation notification:', error)
      }

      return {
        success: true,
        booking: {
          id: cancelledBooking.id,
          status: cancelledBooking.booking_status,
          cancelledAt: cancelledBooking.cancelled_at
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel booking'
      }
    }
  }

  /**
   * Get booking details
   */
  async getBooking(
    context: BookingToolsContext,
    bookingId: string
  ) {
    try {
      const { data: booking, error } = await this.adminSupabase
        .from('bookings')
        .select(`
          *,
          appointment_type:appointment_types(*),
          customer:leads(*),
          staff:users!assigned_to(*),
          organization:organizations(*)
        `)
        .eq('id', bookingId)
        .single()

      if (error || !booking) {
        return {
          success: false,
          error: 'Booking not found'
        }
      }

      // Check permissions
      if (context.organizationId && booking.organization_id !== context.organizationId) {
        return {
          success: false,
          error: 'Access denied to this booking'
        }
      }

      return {
        success: true,
        booking: {
          id: booking.id,
          title: booking.title,
          description: booking.description,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.booking_status,
          attendeeName: booking.attendee_name,
          attendeeEmail: booking.attendee_email,
          attendeePhone: booking.attendee_phone,
          locationDetails: booking.location_details,
          rescheduleCount: booking.reschedule_count,
          appointmentType: booking.appointment_type,
          staff: booking.staff ? {
            id: booking.staff.id,
            name: booking.staff.full_name
          } : null,
          organization: booking.organization ? {
            id: booking.organization.id,
            name: booking.organization.name,
            slug: booking.organization.slug
          } : null
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get booking'
      }
    }
  }

  /**
   * Get organization bookings
   */
  async getOrganizationBookings(
    context: BookingToolsContext,
    options: {
      status?: string
      startDate?: string
      endDate?: string
      staffId?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    try {
      if (!context.organizationId && !context.organizationSlug) {
        throw new Error('Organization ID or slug is required')
      }

      let organizationId = context.organizationId

      // Get organization ID from slug if needed
      if (!organizationId && context.organizationSlug) {
        const { data: org } = await this.adminSupabase
          .from('organizations')
          .select('id')
          .eq('slug', context.organizationSlug)
          .single()
        
        if (!org) {
          throw new Error('Organization not found')
        }
        organizationId = org.id
      }

      let query = this.adminSupabase
        .from('bookings')
        .select(`
          *,
          appointment_type:appointment_types(*),
          staff:users!assigned_to(id, full_name)
        `)
        .eq('organization_id', organizationId)

      // Apply filters
      if (options.status) {
        query = query.eq('booking_status', options.status)
      }

      if (options.startDate) {
        query = query.gte('start_time', options.startDate)
      }

      if (options.endDate) {
        query = query.lte('start_time', options.endDate)
      }

      if (options.staffId) {
        query = query.eq('assigned_to', options.staffId)
      }

      // Apply pagination
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
      } else if (options.limit) {
        query = query.limit(options.limit)
      }

      // Order by start time
      query = query.order('start_time', { ascending: true })

      const { data: bookings, error } = await query

      if (error) {
        return {
          success: false,
          error: 'Failed to get bookings'
        }
      }

      return {
        success: true,
        bookings: bookings?.map(booking => ({
          id: booking.id,
          title: booking.title,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.booking_status,
          attendeeName: booking.attendee_name,
          attendeeEmail: booking.attendee_email,
          appointmentType: booking.appointment_type?.name,
          staff: booking.staff?.full_name
        })) || []
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get organization bookings'
      }
    }
  }

  /**
   * Helper method to enhance availability slots with additional information
   */
  private async enhanceAvailabilitySlots(slots: any[], organizationId: string) {
    if (slots.length === 0) return slots

    // Get staff information
    const staffIds = [...new Set(slots.map(slot => slot.staff_id).filter(Boolean))]
    const { data: staffInfo } = await this.adminSupabase
      .from('users')
      .select('id, full_name')
      .in('id', staffIds)

    // Get appointment type information
    const appointmentTypeIds = [...new Set(slots.map(slot => slot.appointment_type_id).filter(Boolean))]
    const { data: appointmentTypes } = await this.adminSupabase
      .from('appointment_types')
      .select('id, name, duration_minutes, description')
      .in('id', appointmentTypeIds)

    return slots.map(slot => ({
      ...slot,
      staff_name: staffInfo?.find(staff => staff.id === slot.staff_id)?.full_name,
      appointment_type_name: appointmentTypes?.find(type => type.id === slot.appointment_type_id)?.name
    }))
  }
}

// Export singleton instance
export const aiBookingTools = new AIBookingTools()