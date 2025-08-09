import { createAdminClient } from '@/app/lib/supabase/admin'
import { googleCalendarService } from './google-calendar-enhanced'

export interface AvailabilitySlot {
  start: string
  end: string
  duration: number
  staff_id?: string
  staff_name?: string
  appointment_type_id?: string
}

export interface AvailabilityOptions {
  date?: string
  dateRange?: { start: string; end: string }
  duration?: number
  appointmentTypeId?: string
  staffId?: string
  timezone?: string
  bufferMinutes?: number
}

export interface WorkingHours {
  day_of_week: number
  start_time: string
  end_time: string
  buffer_before: number
  buffer_after: number
  timezone: string
}

export interface AvailabilityOverride {
  date: string
  start_time?: string
  end_time?: string
  type: 'unavailable' | 'available' | 'modified_hours'
  reason?: string
}

export interface Holiday {
  date: string
  name: string
  affects_all_staff: boolean
  staff_ids?: string[]
}

export interface BusyTime {
  start: string
  end: string
  source: 'booking' | 'google_calendar' | 'override'
}

export class AvailabilityEngine {
  private adminSupabase = createAdminClient()

  /**
   * Get availability slots for a user or team
   */
  async getAvailability(
    organizationId: string,
    options: AvailabilityOptions = {}
  ): Promise<AvailabilitySlot[]> {
    const {
      date,
      dateRange,
      duration = 30,
      appointmentTypeId,
      staffId,
      timezone = 'Europe/London',
      bufferMinutes = 15
    } = options

    // Determine date range
    let startDate: string
    let endDate: string

    if (dateRange) {
      startDate = dateRange.start
      endDate = dateRange.end
    } else if (date) {
      startDate = date
      endDate = date
    } else {
      // Default to next 30 days
      const now = new Date()
      startDate = now.toISOString().split('T')[0]
      const future = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
      endDate = future.toISOString().split('T')[0]
    }

    // Get appointment type details if specified
    let appointmentType: any = null
    if (appointmentTypeId) {
      const { data } = await this.adminSupabase
        .from('appointment_types')
        .select('*')
        .eq('id', appointmentTypeId)
        .single()
      appointmentType = data
    }

    // Get staff members to check
    let staffIds: string[] = []
    if (staffId) {
      staffIds = [staffId]
    } else {
      // Get all active staff in the organization
      const { data: orgMembers } = await this.adminSupabase
        .from('organization_members')
        .select('user_id')
        .eq('org_id', organizationId)
        .in('role', ['owner', 'admin', 'coach', 'staff'])

      staffIds = orgMembers?.map(m => m.user_id) || []
    }

    // Generate availability slots for each staff member
    const allSlots: AvailabilitySlot[] = []

    for (const userId of staffIds) {
      const userSlots = await this.getUserAvailabilitySlots(
        userId,
        organizationId,
        startDate,
        endDate,
        duration,
        timezone,
        bufferMinutes,
        appointmentType
      )
      allSlots.push(...userSlots)
    }

    // Sort slots by date and time
    return allSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  /**
   * Get availability slots for a specific user
   */
  private async getUserAvailabilitySlots(
    userId: string,
    organizationId: string,
    startDate: string,
    endDate: string,
    duration: number,
    timezone: string,
    bufferMinutes: number,
    appointmentType: any
  ): Promise<AvailabilitySlot[]> {
    // Get user's working hours
    const workingHours = await this.getUserWorkingHours(userId)
    
    // Get availability overrides
    const overrides = await this.getUserAvailabilityOverrides(userId, startDate, endDate)
    
    // Get holidays
    const holidays = await this.getOrganizationHolidays(organizationId, startDate, endDate, userId)
    
    // Get busy times (existing bookings + Google Calendar)
    const busyTimes = await this.getUserBusyTimes(userId, startDate, endDate, timezone)

    const slots: AvailabilitySlot[] = []

    // Generate slots for each date in the range
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)

    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayOfWeek = currentDate.getUTCDay()

      // Check if this date is a holiday
      const isHoliday = holidays.some(h => h.date === dateStr)
      if (isHoliday) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        continue
      }

      // Get working hours for this day
      const dayWorkingHours = workingHours.find(wh => wh.day_of_week === dayOfWeek)
      if (!dayWorkingHours) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
        continue
      }

      // Check for availability overrides
      const dayOverride = overrides.find(o => o.date === dateStr)
      let availableStart: string
      let availableEnd: string

      if (dayOverride) {
        if (dayOverride.type === 'unavailable') {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1)
          continue
        } else if (dayOverride.type === 'modified_hours') {
          availableStart = dayOverride.start_time || dayWorkingHours.start_time
          availableEnd = dayOverride.end_time || dayWorkingHours.end_time
        } else {
          availableStart = dayOverride.start_time || dayWorkingHours.start_time
          availableEnd = dayOverride.end_time || dayWorkingHours.end_time
        }
      } else {
        availableStart = dayWorkingHours.start_time
        availableEnd = dayWorkingHours.end_time
      }

      // Generate time slots for the day
      const daySlots = this.generateDaySlots(
        dateStr,
        availableStart,
        availableEnd,
        duration,
        bufferMinutes,
        timezone,
        busyTimes,
        userId,
        appointmentType?.id
      )

      slots.push(...daySlots)

      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    return slots
  }

  /**
   * Generate available time slots for a specific day
   */
  private generateDaySlots(
    date: string,
    startTime: string,
    endTime: string,
    duration: number,
    bufferMinutes: number,
    timezone: string,
    busyTimes: BusyTime[],
    staffId: string,
    appointmentTypeId?: string
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = []

    // Convert to full datetime strings
    const dayStart = new Date(`${date}T${startTime}:00`)
    const dayEnd = new Date(`${date}T${endTime}:00`)

    // Generate potential slots
    const current = new Date(dayStart)
    
    while (current.getTime() + (duration * 60 * 1000) <= dayEnd.getTime()) {
      const slotStart = new Date(current)
      const slotEnd = new Date(current.getTime() + (duration * 60 * 1000))

      // Check if this slot conflicts with any busy times
      const hasConflict = busyTimes.some(busy => {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)

        return (
          (slotStart >= busyStart && slotStart < busyEnd) ||
          (slotEnd > busyStart && slotEnd <= busyEnd) ||
          (slotStart <= busyStart && slotEnd >= busyEnd)
        )
      })

      if (!hasConflict) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          duration,
          staff_id: staffId,
          appointment_type_id: appointmentTypeId
        })
      }

      // Move to next slot (with buffer)
      current.setTime(current.getTime() + ((duration + bufferMinutes) * 60 * 1000))
    }

    return slots
  }

  /**
   * Get user's working hours
   */
  private async getUserWorkingHours(userId: string): Promise<WorkingHours[]> {
    const { data } = await this.adminSupabase
      .from('availability_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)

    return data || []
  }

  /**
   * Get user's availability overrides for date range
   */
  private async getUserAvailabilityOverrides(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<AvailabilityOverride[]> {
    const { data } = await this.adminSupabase
      .from('availability_overrides')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)

    return data || []
  }

  /**
   * Get organization holidays for date range
   */
  private async getOrganizationHolidays(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<Holiday[]> {
    let query = this.adminSupabase
      .from('holidays')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lte('date', endDate)

    // Filter for holidays that affect this user
    if (userId) {
      query = query.or(`affects_all_staff.eq.true,staff_ids.cs.{${userId}}`)
    }

    const { data } = await query
    return data || []
  }

  /**
   * Get user's busy times from bookings and Google Calendar
   */
  private async getUserBusyTimes(
    userId: string,
    startDate: string,
    endDate: string,
    timezone: string
  ): Promise<BusyTime[]> {
    const busyTimes: BusyTime[] = []

    // Get existing bookings
    const { data: bookings } = await this.adminSupabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('assigned_to', userId)
      .in('booking_status', ['confirmed', 'attended'])
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`)

    if (bookings) {
      bookings.forEach(booking => {
        if (booking.start_time && booking.end_time) {
          busyTimes.push({
            start: booking.start_time,
            end: booking.end_time,
            source: 'booking'
          })
        }
      })
    }

    // Get Google Calendar busy times
    try {
      const googleBusyTimes = await googleCalendarService.getGoogleCalendarBusyTimes(
        userId,
        `${startDate}T00:00:00.000Z`,
        `${endDate}T23:59:59.000Z`
      )

      googleBusyTimes.forEach(busy => {
        busyTimes.push({
          start: busy.start,
          end: busy.end,
          source: 'google_calendar'
        })
      })
    } catch (error) {
      console.error('Failed to get Google Calendar busy times:', error)
    }

    return busyTimes
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(
    userId: string,
    organizationId: string,
    startTime: string,
    endTime: string,
    appointmentTypeId?: string
  ): Promise<boolean> {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const date = start.toISOString().split('T')[0]
    const dayOfWeek = start.getUTCDay()

    // Check working hours
    const workingHours = await this.getUserWorkingHours(userId)
    const dayWorkingHours = workingHours.find(wh => wh.day_of_week === dayOfWeek)
    
    if (!dayWorkingHours) {
      return false
    }

    // Check if time falls within working hours
    const workingStart = new Date(`${date}T${dayWorkingHours.start_time}:00`)
    const workingEnd = new Date(`${date}T${dayWorkingHours.end_time}:00`)

    if (start < workingStart || end > workingEnd) {
      return false
    }

    // Check for overrides
    const overrides = await this.getUserAvailabilityOverrides(userId, date, date)
    const dayOverride = overrides.find(o => o.date === date)

    if (dayOverride && dayOverride.type === 'unavailable') {
      return false
    }

    // Check for holidays
    const holidays = await this.getOrganizationHolidays(organizationId, date, date, userId)
    if (holidays.length > 0) {
      return false
    }

    // Check for conflicts
    const busyTimes = await this.getUserBusyTimes(userId, date, date, 'Europe/London')
    const hasConflict = busyTimes.some(busy => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)

      return (
        (start >= busyStart && start < busyEnd) ||
        (end > busyStart && end <= busyEnd) ||
        (start <= busyStart && end >= busyEnd)
      )
    })

    return !hasConflict
  }

  /**
   * Find the next available slot for a user
   */
  async findNextAvailableSlot(
    userId: string,
    organizationId: string,
    duration: number = 30,
    appointmentTypeId?: string,
    fromDate?: string
  ): Promise<AvailabilitySlot | null> {
    const startDate = fromDate || new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const slots = await this.getUserAvailabilitySlots(
      userId,
      organizationId,
      startDate,
      endDate,
      duration,
      'Europe/London',
      15,
      appointmentTypeId ? { id: appointmentTypeId } : null
    )

    return slots.length > 0 ? slots[0] : null
  }

  /**
   * Get team availability (round-robin style)
   */
  async getTeamAvailability(
    organizationId: string,
    teamMemberIds: string[],
    options: AvailabilityOptions = {}
  ): Promise<AvailabilitySlot[]> {
    const allSlots: AvailabilitySlot[] = []

    for (const memberId of teamMemberIds) {
      const memberSlots = await this.getAvailability(organizationId, {
        ...options,
        staffId: memberId
      })
      allSlots.push(...memberSlots)
    }

    // Sort by time and distribute evenly among team members
    return allSlots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }

  /**
   * Block time slot (create override)
   */
  async blockTimeSlot(
    userId: string,
    organizationId: string,
    startTime: string,
    endTime: string,
    reason?: string
  ): Promise<boolean> {
    const date = new Date(startTime).toISOString().split('T')[0]
    const start = new Date(startTime).toTimeString().split(' ')[0].slice(0, 5)
    const end = new Date(endTime).toTimeString().split(' ')[0].slice(0, 5)

    const { error } = await this.adminSupabase
      .from('availability_overrides')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        date,
        start_time: start,
        end_time: end,
        type: 'unavailable',
        reason
      })

    return !error
  }
}

// Export singleton instance
export const availabilityEngine = new AvailabilityEngine()