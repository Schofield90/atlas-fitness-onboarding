import { 
  cacheService, 
  getCacheKey, 
  CACHE_TTL, 
  CACHE_PREFIXES,
  getOrSet,
  invalidateOrgCache 
} from './cache-utils';
import { createClient } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger/logger';

/**
 * Cached Booking and Class Schedule Service
 * 
 * Cache Strategy:
 * - Class schedules: 5 minute TTL
 * - Availability slots: 2 minute TTL (more dynamic)
 * - Booking details: 5 minute TTL
 * - Class types: 30 minute TTL (less frequently changed)
 * - Instructor schedules: 10 minute TTL
 */
class CachedBookingService {
  private readonly SCHEDULE_TTL = CACHE_TTL.CLASS_SCHEDULES;
  private readonly AVAILABILITY_TTL = CACHE_TTL.CAMPAIGN_PERFORMANCE; // 2 minutes
  private readonly BOOKING_TTL = CACHE_TTL.MEDIUM_TERM;
  private readonly CLASS_TYPES_TTL = CACHE_TTL.LONG_TERM / 2; // 30 minutes
  private readonly INSTRUCTOR_TTL = CACHE_TTL.ORGANIZATION_SETTINGS;

  /**
   * Get class schedule with caching
   */
  async getClassSchedule(
    orgId: string, 
    startDate: Date, 
    endDate: Date,
    locationId?: string
  ) {
    const dateRange = `${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
    const cacheKey = getCacheKey(
      orgId, 
      CACHE_PREFIXES.CLASS, 
      'schedule',
      dateRange,
      locationId || 'all'
    );
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        let query = supabase
          .from('class_sessions')
          .select(`
            *,
            class_types!inner(
              name,
              description,
              duration,
              capacity,
              price_cents,
              color
            ),
            instructors(
              id,
              full_name,
              avatar_url,
              specialties
            ),
            bookings!left(
              id,
              status,
              clients(id, first_name, last_name, email)
            )
          `)
          .eq('org_id', orgId)
          .gte('start_at', startDate.toISOString())
          .lte('end_at', endDate.toISOString())
          .order('start_at', { ascending: true });

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform data to include booking counts and availability
        return data?.map(session => ({
          ...session,
          bookedCount: session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0,
          availableSpots: session.capacity - (session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0),
          isAvailable: (session.capacity - (session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0)) > 0
        })) || [];
      },
      this.SCHEDULE_TTL
    );
  }

  /**
   * Get available time slots for booking
   */
  async getAvailableSlots(
    orgId: string,
    date: Date,
    serviceType?: string,
    instructorId?: string
  ) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = getCacheKey(
      orgId,
      CACHE_PREFIXES.BOOKING,
      'availability',
      dateStr,
      serviceType || 'all',
      instructorId || 'all'
    );

    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        // Get class sessions for the date
        let query = supabase
          .from('class_sessions')
          .select(`
            id,
            start_at,
            end_at,
            capacity,
            class_types!inner(name, duration),
            bookings!left(id, status)
          `)
          .eq('org_id', orgId)
          .gte('start_at', `${dateStr}T00:00:00`)
          .lte('start_at', `${dateStr}T23:59:59`);

        if (serviceType) {
          query = query.eq('class_types.name', serviceType);
        }

        if (instructorId) {
          query = query.eq('instructor_id', instructorId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Calculate availability for each slot
        const availableSlots = data?.map(session => {
          const confirmedBookings = session.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
          const availableSpots = session.capacity - confirmedBookings;
          
          return {
            sessionId: session.id,
            startTime: session.start_at,
            endTime: session.end_at,
            duration: session.class_types.duration,
            serviceName: session.class_types.name,
            capacity: session.capacity,
            booked: confirmedBookings,
            available: availableSpots,
            isBookable: availableSpots > 0
          };
        }).filter(slot => slot.isBookable) || [];

        return availableSlots;
      },
      this.AVAILABILITY_TTL
    );
  }

  /**
   * Get class types with caching
   */
  async getClassTypes(orgId: string) {
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.CLASS, 'types');
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data, error } = await supabase
          .from('class_types')
          .select('*')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        return data || [];
      },
      this.CLASS_TYPES_TTL
    );
  }

  /**
   * Get instructor availability with caching
   */
  async getInstructorAvailability(orgId: string, instructorId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = getCacheKey(
      orgId,
      CACHE_PREFIXES.CLASS,
      'instructor-availability',
      instructorId,
      dateStr
    );

    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        // Get instructor's scheduled classes
        const { data: sessions, error } = await supabase
          .from('class_sessions')
          .select('start_at, end_at, class_types!inner(name)')
          .eq('org_id', orgId)
          .eq('instructor_id', instructorId)
          .gte('start_at', `${dateStr}T00:00:00`)
          .lte('start_at', `${dateStr}T23:59:59`)
          .order('start_at');

        if (error) throw error;

        // Get instructor's general availability rules
        const { data: availability, error: availError } = await supabase
          .from('instructor_availability')
          .select('*')
          .eq('instructor_id', instructorId)
          .eq('day_of_week', date.getDay());

        if (availError) throw availError;

        return {
          scheduledSessions: sessions || [],
          generalAvailability: availability || [],
          date: dateStr
        };
      },
      this.INSTRUCTOR_TTL
    );
  }

  /**
   * Get booking details with caching
   */
  async getBooking(bookingId: string) {
    const cacheKey = getCacheKey('', CACHE_PREFIXES.BOOKING, bookingId);
    
    return cacheService.getStaleWhileRevalidate(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            class_sessions!inner(
              start_at,
              end_at,
              class_types!inner(name, duration, description),
              instructors(full_name, email),
              locations(name, address)
            ),
            clients!inner(
              first_name,
              last_name,
              email,
              phone
            )
          `)
          .eq('id', bookingId)
          .single();

        if (error) throw error;
        return data;
      },
      this.BOOKING_TTL,
      this.BOOKING_TTL * 2
    );
  }

  /**
   * Get user's bookings with caching
   */
  async getUserBookings(
    userId: string, 
    orgId: string, 
    status?: string,
    fromDate?: Date
  ) {
    const statusFilter = status || 'all';
    const dateFilter = fromDate ? fromDate.toISOString().split('T')[0] : 'all';
    const cacheKey = getCacheKey(
      orgId,
      CACHE_PREFIXES.BOOKING,
      'user',
      userId,
      statusFilter,
      dateFilter
    );

    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        let query = supabase
          .from('bookings')
          .select(`
            *,
            class_sessions!inner(
              start_at,
              end_at,
              class_types!inner(name, description, duration),
              instructors(full_name),
              locations(name)
            )
          `)
          .eq('client_id', userId)
          .eq('org_id', orgId)
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        if (fromDate) {
          query = query.gte('class_sessions.start_at', fromDate.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      this.BOOKING_TTL
    );
  }

  /**
   * Get class session details with attendee list
   */
  async getClassSession(sessionId: string) {
    const cacheKey = getCacheKey('', CACHE_PREFIXES.CLASS, 'session', sessionId);
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data, error } = await supabase
          .from('class_sessions')
          .select(`
            *,
            class_types!inner(
              name,
              description,
              duration,
              price_cents
            ),
            instructors(
              id,
              full_name,
              email,
              avatar_url,
              bio,
              specialties
            ),
            locations(
              name,
              address,
              facilities
            ),
            bookings!left(
              id,
              status,
              checked_in_at,
              clients!inner(
                id,
                first_name,
                last_name,
                email,
                avatar_url
              )
            )
          `)
          .eq('id', sessionId)
          .single();

        if (error) throw error;
        
        // Separate confirmed and waitlisted bookings
        const confirmedBookings = data.bookings?.filter((b: any) => b.status === 'confirmed') || [];
        const waitlistBookings = data.bookings?.filter((b: any) => b.status === 'waitlisted') || [];
        
        return {
          ...data,
          confirmedBookings,
          waitlistBookings,
          attendeeCount: confirmedBookings.length,
          waitlistCount: waitlistBookings.length,
          availableSpots: data.capacity - confirmedBookings.length,
          checkInCount: confirmedBookings.filter((b: any) => b.checked_in_at).length
        };
      },
      this.SCHEDULE_TTL
    );
  }

  /**
   * Create booking with cache invalidation
   */
  async createBooking(bookingData: any): Promise<string> {
    const supabase = await createClient();
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select('id, org_id, class_session_id, client_id')
      .single();

    if (error) throw error;

    // Invalidate relevant caches
    await this.invalidateBookingCaches(booking.org_id, booking.class_session_id, booking.client_id);
    
    logger.info(`Created booking ${booking.id}, invalidated caches`);
    return booking.id;
  }

  /**
   * Cancel booking with cache invalidation
   */
  async cancelBooking(bookingId: string): Promise<void> {
    const supabase = await createClient();
    
    // Get booking details for cache invalidation
    const { data: booking } = await supabase
      .from('bookings')
      .select('org_id, class_session_id, client_id')
      .eq('id', bookingId)
      .single();

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw error;

    if (booking) {
      await this.invalidateBookingCaches(booking.org_id, booking.class_session_id, booking.client_id);
    }
    
    // Invalidate specific booking cache
    const bookingCacheKey = getCacheKey('', CACHE_PREFIXES.BOOKING, bookingId);
    await cacheService.invalidateCache(bookingCacheKey);
    
    logger.info(`Cancelled booking ${bookingId}, invalidated caches`);
  }

  /**
   * Check in attendee with cache invalidation
   */
  async checkInAttendee(bookingId: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        checked_in_at: new Date().toISOString() 
      })
      .eq('id', bookingId);

    if (error) throw error;

    // Get booking details for cache invalidation
    const { data: booking } = await supabase
      .from('bookings')
      .select('org_id, class_session_id')
      .eq('id', bookingId)
      .single();

    if (booking) {
      // Invalidate class session cache to update check-in counts
      const sessionCacheKey = getCacheKey('', CACHE_PREFIXES.CLASS, 'session', booking.class_session_id);
      await cacheService.invalidateCache(sessionCacheKey);
    }
    
    logger.info(`Checked in booking ${bookingId}`);
  }

  /**
   * Get booking statistics for organization
   */
  async getBookingStats(orgId: string, dateRange: { start: Date; end: Date }) {
    const dateKey = `${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}`;
    const cacheKey = getCacheKey(orgId, CACHE_PREFIXES.BOOKING, 'stats', dateKey);
    
    return getOrSet(
      cacheKey,
      async () => {
        const supabase = await createClient();
        
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            status,
            created_at,
            checked_in_at,
            class_sessions!inner(start_at, class_types!inner(name))
          `)
          .eq('org_id', orgId)
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());

        if (error) throw error;

        const stats = {
          totalBookings: bookings?.length || 0,
          confirmedBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
          cancelledBookings: bookings?.filter(b => b.status === 'cancelled').length || 0,
          noShowBookings: bookings?.filter(b => b.status === 'no-show').length || 0,
          checkInRate: 0,
          byClassType: {} as Record<string, number>
        };

        if (stats.totalBookings > 0) {
          const checkedIn = bookings?.filter(b => b.checked_in_at).length || 0;
          stats.checkInRate = (checkedIn / stats.confirmedBookings) * 100;
        }

        // Group by class type
        bookings?.forEach(booking => {
          const classType = booking.class_sessions?.class_types?.name || 'Unknown';
          stats.byClassType[classType] = (stats.byClassType[classType] || 0) + 1;
        });

        return stats;
      },
      CACHE_TTL.CAMPAIGN_PERFORMANCE // 2 minutes for stats
    );
  }

  /**
   * Warm booking caches for organization
   */
  async warmBookingCaches(orgId: string): Promise<void> {
    logger.info(`Warming booking caches for org ${orgId}`);
    
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const warmTasks = [
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.CLASS, 'types'),
        fetchFunction: () => this.getClassTypes(orgId),
        ttl: this.CLASS_TYPES_TTL
      },
      {
        key: getCacheKey(orgId, CACHE_PREFIXES.CLASS, 'schedule', `${today.toISOString().split('T')[0]}-${weekFromNow.toISOString().split('T')[0]}`, 'all'),
        fetchFunction: () => this.getClassSchedule(orgId, today, weekFromNow),
        ttl: this.SCHEDULE_TTL
      }
    ];

    await cacheService.warmCache(warmTasks);
    logger.info(`Booking cache warming completed for org ${orgId}`);
  }

  /**
   * Invalidate booking-related caches
   */
  private async invalidateBookingCaches(orgId: string, sessionId?: string, clientId?: string): Promise<void> {
    const patterns = [
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.CLASS}:schedule:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.BOOKING}:availability:*`,
      `${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.BOOKING}:stats:*`,
    ];

    if (sessionId) {
      patterns.push(`*:${CACHE_PREFIXES.CLASS}:session:${sessionId}`);
    }

    if (clientId) {
      patterns.push(`${CACHE_PREFIXES.ORG}:${orgId}:${CACHE_PREFIXES.BOOKING}:user:${clientId}:*`);
    }

    for (const pattern of patterns) {
      await cacheService.invalidateCache(pattern);
    }
  }
}

export const cachedBookingService = new CachedBookingService();