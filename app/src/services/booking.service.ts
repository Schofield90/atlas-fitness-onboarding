import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { addDays, startOfWeek, endOfWeek, format, isBefore, isAfter } from 'date-fns';

// Booking schemas
export const createBookingSchema = z.object({
  sessionId: z.string().uuid(),
  clientId: z.string().uuid(),
  notes: z.string().optional(),
  source: z.enum(['web', 'mobile', 'admin', 'api']).default('web')
});

export const bulkBookingSchema = z.object({
  sessionIds: z.array(z.string().uuid()),
  clientId: z.string().uuid()
});

export interface BookingFilter {
  status?: string[];
  clientId?: string;
  instructorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  classId?: string;
}

export interface SessionAvailability {
  sessionId: string;
  totalCapacity: number;
  bookedCount: number;
  waitlistCount: number;
  availableSpots: number;
  isAvailable: boolean;
  isWaitlistAvailable: boolean;
}

export interface BookingNotification {
  type: 'confirmation' | 'reminder' | 'cancellation' | 'waitlist_promotion';
  booking: any;
  session: any;
  client: any;
}

class BookingService {
  // Create a booking
  async createBooking(
    orgId: string,
    data: z.infer<typeof createBookingSchema>
  ): Promise<string> {
    const supabase = await createClient();
    
    // Check session availability
    const availability = await this.getSessionAvailability(data.sessionId);
    
    if (!availability.isAvailable && !availability.isWaitlistAvailable) {
      throw new Error('Session is fully booked');
    }

    const status = availability.isAvailable ? 'booked' : 'waitlisted';

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        org_id: orgId,
        session_id: data.sessionId,
        client_id: data.clientId,
        status,
        metadata: { notes: data.notes, source: data.source }
      })
      .select('id')
      .single();

    if (error) throw error;

    // Send confirmation notification
    await this.sendBookingNotification({
      type: 'confirmation',
      booking: { id: booking.id, status },
      session: await this.getSessionDetails(data.sessionId),
      client: await this.getClientDetails(data.clientId)
    });

    // If someone canceled and this was on waitlist, check for promotions
    if (status === 'booked') {
      await this.processWaitlistPromotions(data.sessionId);
    }

    return booking.id;
  }

  // Bulk booking for multiple sessions
  async createBulkBookings(
    orgId: string,
    data: z.infer<typeof bulkBookingSchema>
  ): Promise<string[]> {
    const bookingIds: string[] = [];
    
    for (const sessionId of data.sessionIds) {
      try {
        const bookingId = await this.createBooking(orgId, {
          sessionId,
          clientId: data.clientId
        });
        bookingIds.push(bookingId);
      } catch (error) {
        // Continue with other bookings even if one fails
        console.error(`Failed to book session ${sessionId}:`, error);
      }
    }

    return bookingIds;
  }

  // Cancel booking
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    const supabase = await createClient();
    
    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        session:class_sessions(*)
      `)
      .eq('id', bookingId)
      .single();

    if (!booking) throw new Error('Booking not found');

    // Update booking status
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        metadata: { ...booking.metadata, cancel_reason: reason }
      })
      .eq('id', bookingId);

    if (error) throw error;

    // Send cancellation notification
    await this.sendBookingNotification({
      type: 'cancellation',
      booking,
      session: booking.session,
      client: await this.getClientDetails(booking.client_id)
    });

    // Process waitlist promotions if applicable
    if (booking.status === 'booked') {
      await this.processWaitlistPromotions(booking.session_id);
    }
  }

  // Get bookings with filters
  async getBookings(
    orgId: string,
    filter: BookingFilter = {},
    page = 1,
    limit = 50
  ) {
    const supabase = await createClient();
    
    let query = supabase
      .from('bookings')
      .select(`
        *,
        client:clients!inner(id, first_name, last_name, email),
        session:class_sessions!inner(
          id, start_at, end_at,
          class:classes!inner(id, name, category),
          instructor:users!instructor_id(id, full_name)
        )
      `, { count: 'exact' })
      .eq('org_id', orgId);

    // Apply filters
    if (filter.status?.length) {
      query = query.in('status', filter.status);
    }

    if (filter.clientId) {
      query = query.eq('client_id', filter.clientId);
    }

    if (filter.instructorId) {
      query = query.eq('session.instructor_id', filter.instructorId);
    }

    if (filter.classId) {
      query = query.eq('session.class_id', filter.classId);
    }

    if (filter.dateFrom) {
      query = query.gte('session.start_at', filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query = query.lte('session.start_at', filter.dateTo.toISOString());
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  // Get session availability
  async getSessionAvailability(sessionId: string): Promise<SessionAvailability> {
    const supabase = await createClient();
    
    const { data } = await supabase
      .rpc('get_session_availability', { session_uuid: sessionId })
      .single();

    if (!data) {
      throw new Error('Session not found');
    }

    return {
      sessionId,
      totalCapacity: (data as any).total_capacity,
      bookedCount: (data as any).booked_count,
      waitlistCount: (data as any).waitlist_count,
      availableSpots: (data as any).available_spots,
      isAvailable: (data as any).available_spots > 0,
      isWaitlistAvailable: true // Could add waitlist capacity logic
    };
  }

  // Get schedule for a date range
  async getSchedule(
    orgId: string,
    startDate: Date,
    endDate: Date,
    filters?: {
      instructorId?: string;
      classId?: string;
      locationId?: string;
    }
  ) {
    const supabase = await createClient();
    
    let query = supabase
      .from('class_sessions')
      .select(`
        *,
        class:classes!inner(*),
        instructor:users!instructor_id(id, full_name),
        bookings!inner(id, status)
      `)
      .eq('org_id', orgId)
      .gte('start_at', startDate.toISOString())
      .lte('start_at', endDate.toISOString())
      .eq('status', 'scheduled');

    if (filters?.instructorId) {
      query = query.eq('instructor_id', filters.instructorId);
    }

    if (filters?.classId) {
      query = query.eq('class_id', filters.classId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by date for calendar view
    const schedule = data?.reduce((acc, session) => {
      const date = format(new Date(session.start_at), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      
      acc[date].push({
        ...session,
        availability: {
          total: session.capacity,
          booked: session.bookings?.filter((b: any) => b.status === 'booked').length || 0,
          available: session.capacity - (session.bookings?.filter((b: any) => b.status === 'booked').length || 0)
        }
      });
      
      return acc;
    }, {} as Record<string, any[]>) || {};

    return schedule;
  }

  // Create recurring sessions
  async createRecurringSessions(
    orgId: string,
    classId: string,
    schedule: {
      startDate: Date;
      endDate: Date;
      daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
      startTime: string; // HH:mm format
      duration: number; // minutes
      instructorId?: string;
      capacity?: number;
    }
  ): Promise<string[]> {
    const supabase = await createClient();
    const sessionIds: string[] = [];

    // Get class details
    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (!classData) throw new Error('Class not found');

    const sessions = [];
    let currentDate = new Date(schedule.startDate);

    while (currentDate <= schedule.endDate) {
      if (schedule.daysOfWeek.includes(currentDate.getDay())) {
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        const startAt = new Date(currentDate);
        startAt.setHours(hours, minutes, 0, 0);
        
        const endAt = new Date(startAt);
        endAt.setMinutes(endAt.getMinutes() + (schedule.duration || classData.duration_minutes));

        sessions.push({
          org_id: orgId,
          class_id: classId,
          instructor_id: schedule.instructorId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          capacity: schedule.capacity || classData.capacity,
          status: 'scheduled'
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }

    // Insert all sessions
    if (sessions.length > 0) {
      const { data, error } = await supabase
        .from('class_sessions')
        .insert(sessions)
        .select('id');

      if (error) throw error;
      
      sessionIds.push(...(data?.map(s => s.id) || []));
    }

    return sessionIds;
  }

  // Check-in client for a booking
  async checkInBooking(bookingId: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'attended',
        attended_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('status', 'booked');

    if (error) throw error;
  }

  // Mark as no-show
  async markNoShow(bookingId: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'no_show',
        metadata: { marked_no_show_at: new Date().toISOString() }
      })
      .eq('id', bookingId)
      .eq('status', 'booked');

    if (error) throw error;
  }

  // Process waitlist promotions
  private async processWaitlistPromotions(sessionId: string): Promise<void> {
    const supabase = await createClient();
    
    // Check if there are available spots
    const availability = await this.getSessionAvailability(sessionId);
    if (availability.availableSpots <= 0) return;

    // Get waitlisted bookings in order
    const { data: waitlistBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'waitlisted')
      .order('created_at', { ascending: true })
      .limit(availability.availableSpots);

    if (!waitlistBookings?.length) return;

    // Promote waitlisted bookings
    for (const booking of waitlistBookings) {
      await supabase
        .from('bookings')
        .update({ status: 'booked' })
        .eq('id', booking.id);

      // Send promotion notification
      await this.sendBookingNotification({
        type: 'waitlist_promotion',
        booking,
        session: await this.getSessionDetails(sessionId),
        client: await this.getClientDetails(booking.client_id)
      });
    }
  }

  // Send booking notifications
  private async sendBookingNotification(notification: BookingNotification): Promise<void> {
    // This would integrate with the message service
    console.log('Sending booking notification:', notification);
  }

  // Helper methods
  private async getSessionDetails(sessionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('class_sessions')
      .select(`
        *,
        class:classes(*),
        instructor:users!instructor_id(id, full_name)
      `)
      .eq('id', sessionId)
      .single();
    return data;
  }

  private async getClientDetails(clientId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    return data;
  }

  // Get instructor schedule
  async getInstructorSchedule(
    instructorId: string,
    startDate: Date,
    endDate: Date
  ) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('class_sessions')
      .select(`
        *,
        class:classes(*),
        bookings(id, status)
      `)
      .eq('instructor_id', instructorId)
      .gte('start_at', startDate.toISOString())
      .lte('end_at', endDate.toISOString())
      .order('start_at', { ascending: true });

    if (error) throw error;

    return data;
  }

  // Get booking statistics
  async getBookingStats(orgId: string, period: 'day' | 'week' | 'month' = 'week') {
    const supabase = await createClient();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = startOfWeek(now);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data } = await supabase
      .from('bookings')
      .select('status, created_at, cancelled_at')
      .eq('org_id', orgId)
      .gte('created_at', startDate.toISOString());

    const stats = {
      total: data?.length || 0,
      booked: data?.filter(b => b.status === 'booked').length || 0,
      cancelled: data?.filter(b => b.status === 'cancelled').length || 0,
      attended: data?.filter(b => b.status === 'attended').length || 0,
      noShows: data?.filter(b => b.status === 'no_show').length || 0,
      cancellationRate: 0,
      attendanceRate: 0
    };

    if (stats.total > 0) {
      stats.cancellationRate = (stats.cancelled / stats.total) * 100;
      const completedSessions = stats.attended + stats.noShows;
      if (completedSessions > 0) {
        stats.attendanceRate = (stats.attended / completedSessions) * 100;
      }
    }

    return stats;
  }
}

export const bookingService = new BookingService();