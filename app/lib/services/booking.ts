import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/database.types';

export class BookingService {
  private supabase;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async getAvailableClasses(
    organizationId: string,
    programId?: string,
    startDate?: string,
    endDate?: string
  ) {
    let query = this.supabase
      .from('class_sessions')
      .select(`
        *,
        programs!inner(name, price_pennies, duration_weeks),
        users!class_sessions_trainer_id_fkey(id, name, email)
      `)
      .eq('organization_id', organizationId)
      .eq('session_status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (programId) {
      query = query.eq('program_id', programId);
    }

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate spaces available and get waitlist count
    const classesWithAvailability = await Promise.all(
      (data || []).map(async (classSession) => {
        const { count: waitlistCount } = await this.supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true })
          .eq('class_session_id', classSession.id);

        return {
          ...classSession,
          spaces_available: classSession.max_capacity - classSession.current_bookings,
          waitlist_count: waitlistCount || 0,
          program_name: classSession.programs?.name,
          price_pennies: classSession.programs?.price_pennies,
          trainer_name: classSession.users?.name || classSession.users?.email,
        };
      })
    );

    return classesWithAvailability;
  }

  async createBooking(
    customerId: string,
    classSessionId: string,
    paymentMethodId?: string
  ) {
    // Start a transaction
    const { data: classData, error: classError } = await this.supabase
      .from('class_sessions')
      .select(`
        *,
        programs!inner(price_pennies, name)
      `)
      .eq('id', classSessionId)
      .single();

    if (classError || !classData) {
      throw new Error('Class not found');
    }

    // Check capacity
    if (classData.current_bookings >= classData.max_capacity) {
      throw new Error('Class is full');
    }

    // Check if customer already booked
    const { data: existingBooking } = await this.supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('class_session_id', classSessionId)
      .in('booking_status', ['confirmed', 'waitlist'])
      .single();

    if (existingBooking) {
      throw new Error('Already booked for this class');
    }

    // Create booking
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        class_session_id: classSessionId,
        booking_status: 'confirmed',
        payment_status: paymentMethodId ? 'pending' : 'paid',
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Process payment if required
    if (paymentMethodId && classData.programs?.price_pennies && classData.programs.price_pennies > 0) {
      // TODO: Implement Stripe payment processing
      // await this.processPayment(booking, paymentMethodId, classData.programs.price_pennies);
    }

    // Send confirmation
    await this.sendBookingConfirmation(booking, classData);

    return booking;
  }

  async addToWaitlist(customerId: string, classSessionId: string) {
    // Get next position in waitlist
    const { data: waitlistData, error: waitlistError } = await this.supabase
      .from('waitlist')
      .select('position')
      .eq('class_session_id', classSessionId)
      .order('position', { ascending: false })
      .limit(1);

    if (waitlistError) throw waitlistError;

    const nextPosition = waitlistData && waitlistData.length > 0 
      ? waitlistData[0].position + 1 
      : 1;

    // Add to waitlist
    const { data: waitlistEntry, error: insertError } = await this.supabase
      .from('waitlist')
      .insert({
        customer_id: customerId,
        class_session_id: classSessionId,
        position: nextPosition,
        auto_book: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Send waitlist notification
    await this.sendWaitlistConfirmation(waitlistEntry);

    return waitlistEntry;
  }

  async cancelBooking(bookingId: string, reason?: string) {
    // Get booking details
    const { data: booking, error: bookingError } = await this.supabase
      .from('bookings')
      .select(`
        *,
        class_sessions!inner(start_time, max_capacity)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    // Check cancellation policy (24 hours before class)
    const hoursUntilClass = 
      (new Date(booking.class_sessions.start_time).getTime() - new Date().getTime()) / 
      (1000 * 60 * 60);
    
    if (hoursUntilClass < 24) {
      throw new Error('Cannot cancel within 24 hours of class start time');
    }

    // Update booking status
    const { error: updateError } = await this.supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        notes: reason,
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Process waitlist
    await this.processWaitlist(booking.class_session_id);
  }

  async processWaitlist(classSessionId: string) {
    // Check if there's space available
    const { data: classData, error: classError } = await this.supabase
      .from('class_sessions')
      .select('current_bookings, max_capacity')
      .eq('id', classSessionId)
      .single();

    if (classError || !classData) return;

    const availableSpaces = classData.max_capacity - classData.current_bookings;

    if (availableSpaces > 0) {
      // Get next person on waitlist who wants auto-booking
      const { data: waitlistEntries, error: waitlistError } = await this.supabase
        .from('waitlist')
        .select(`
          *,
          leads!inner(id, name, email, phone)
        `)
        .eq('class_session_id', classSessionId)
        .eq('auto_book', true)
        .order('position', { ascending: true })
        .limit(availableSpaces);

      if (waitlistError || !waitlistEntries) return;

      for (const waitlistEntry of waitlistEntries) {
        // Auto-book from waitlist
        const { error: bookingError } = await this.supabase
          .from('bookings')
          .insert({
            customer_id: waitlistEntry.customer_id,
            class_session_id: classSessionId,
            booking_status: 'confirmed',
          });

        if (!bookingError) {
          // Remove from waitlist
          await this.supabase
            .from('waitlist')
            .delete()
            .eq('id', waitlistEntry.id);

          // Send auto-booking confirmation
          await this.sendAutoBookingConfirmation(waitlistEntry, classSessionId);
        }
      }

      // Update remaining waitlist positions
      const { data: remainingWaitlist } = await this.supabase
        .from('waitlist')
        .select('id, position')
        .eq('class_session_id', classSessionId)
        .order('position', { ascending: true });

      if (remainingWaitlist) {
        for (let i = 0; i < remainingWaitlist.length; i++) {
          await this.supabase
            .from('waitlist')
            .update({ position: i + 1 })
            .eq('id', remainingWaitlist[i].id);
        }
      }
    }
  }

  async getCustomerBookings(customerId: string) {
    const { data, error } = await this.supabase
      .from('bookings')
      .select(`
        *,
        class_sessions!inner(
          name,
          start_time,
          end_time,
          room_location,
          programs!inner(name),
          users!class_sessions_trainer_id_fkey(id, name, email)
        )
      `)
      .eq('customer_id', customerId)
      .order('class_sessions.start_time', { ascending: false });

    if (error) throw error;

    return (data || []).map((booking) => ({
      ...booking,
      class_name: booking.class_sessions.name,
      start_time: booking.class_sessions.start_time,
      end_time: booking.class_sessions.end_time,
      room_location: booking.class_sessions.room_location,
      program_name: booking.class_sessions.programs?.name,
      trainer_name: booking.class_sessions.users?.name || booking.class_sessions.users?.email,
    }));
  }

  async markAttendance(bookingId: string, attended: boolean) {
    const status = attended ? 'attended' : 'no_show';
    const attendedAt = attended ? new Date().toISOString() : null;

    const { error } = await this.supabase
      .from('bookings')
      .update({
        booking_status: status,
        attended_at: attendedAt,
      })
      .eq('id', bookingId);

    if (error) throw error;
  }

  // Communication methods
  private async sendBookingConfirmation(booking: any, classData: any) {
    // Get customer details
    const { data: customer } = await this.supabase
      .from('leads')
      .select('email, phone, name')
      .eq('id', booking.customer_id)
      .single();

    if (!customer) return;

    const message = `Your booking for ${classData.programs?.name} on ${new Date(
      classData.start_time
    ).toLocaleDateString()} is confirmed!`;

    // Send SMS if phone number exists
    if (customer.phone) {
      try {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customer.phone,
            message,
          }),
        });
      } catch (error) {
        console.error('Failed to send SMS confirmation:', error);
      }
    }

    // TODO: Send email confirmation
  }

  private async sendWaitlistConfirmation(waitlistEntry: any) {
    // Get customer details
    const { data: customer } = await this.supabase
      .from('leads')
      .select('email, phone, name')
      .eq('id', waitlistEntry.customer_id)
      .single();

    if (!customer) return;

    const message = `You're #${waitlistEntry.position} on the waitlist. We'll automatically book you when space becomes available!`;

    // Send SMS if phone number exists
    if (customer.phone) {
      try {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customer.phone,
            message,
          }),
        });
      } catch (error) {
        console.error('Failed to send SMS waitlist confirmation:', error);
      }
    }
  }

  private async sendAutoBookingConfirmation(waitlistEntry: any, classSessionId: string) {
    // Get class details
    const { data: classData } = await this.supabase
      .from('class_sessions')
      .select(`
        *,
        programs!inner(name)
      `)
      .eq('id', classSessionId)
      .single();

    if (!classData) return;

    const message = `Great news! A space opened up and you've been automatically booked for ${
      classData.programs?.name
    } on ${new Date(classData.start_time).toLocaleDateString()}!`;

    // Send SMS if phone number exists
    if (waitlistEntry.leads?.phone) {
      try {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: waitlistEntry.leads.phone,
            message,
          }),
        });
      } catch (error) {
        console.error('Failed to send SMS auto-booking confirmation:', error);
      }
    }
  }
}

export const bookingService = new BookingService();