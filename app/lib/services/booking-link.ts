import { createClient } from "@/app/lib/supabase/client";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  format,
  parseISO,
  addDays,
  startOfDay,
  endOfDay,
  addMinutes,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";
import { googleCalendarBookingService } from "./google-calendar-booking";

export interface BookingLink {
  id: string;
  organization_id: string;
  user_id?: string;
  team_ids?: string[];
  slug: string;
  name: string;
  description?: string;
  type: "individual" | "team" | "round_robin" | "collective";
  appointment_type_ids: string[];
  is_active: boolean;
  is_public: boolean;
  requires_auth: boolean;
  max_days_in_advance: number;
  timezone: string;
  settings: Record<string, any>;
  meeting_title_template: string;
  assigned_staff_ids?: string[];
  meeting_location: {
    type: "in_person" | "video_call" | "phone" | "custom";
    details?: string;
    zoom_link?: string;
    phone_number?: string;
    address?: string;
  };
  availability_rules: Record<string, any>;
  form_configuration: {
    fields: FormField[];
    consent_text: string;
    additional_questions?: string[];
  };
  confirmation_settings: {
    auto_confirm: boolean;
    redirect_url?: string;
    custom_message?: string;
  };
  notification_settings: {
    email_enabled: boolean;
    sms_enabled: boolean;
    reminder_schedules: string[];
    cancellation_notifications: boolean;
  };
  style_settings: {
    primary_color: string;
    background_color: string;
    text_color?: string;
    custom_css?: string;
    logo_url?: string;
  };
  payment_settings: {
    enabled: boolean;
    amount: number;
    currency: string;
    description?: string;
    stripe_price_id?: string;
  };
  cancellation_policy: {
    allowed: boolean;
    hours_before: number;
    policy_text: string;
  };
  booking_limits: {
    max_per_day?: number;
    max_per_week?: number;
    max_per_month?: number;
  };
  buffer_settings: {
    before_minutes: number;
    after_minutes: number;
  };
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "time";
  options?: string[];
  required: boolean;
  placeholder?: string;
  validation_rules?: Record<string, any>;
  display_order: number;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  staff_id?: string;
  staff_name?: string;
  appointment_type_id: string;
  appointment_type_name: string;
  duration_minutes: number;
}

export interface BookingRequest {
  booking_link_id: string;
  appointment_type_id: string;
  start_time: string;
  end_time: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  custom_fields?: Record<string, any>;
  notes?: string;
  timezone: string;
  staff_id?: string;
}

export class BookingLinkService {
  private supabase: any;
  private adminSupabase: any;

  protected async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = createClient();
    }
    return this.supabase;
  }

  protected async getAdminSupabaseClient() {
    if (!this.adminSupabase) {
      this.adminSupabase = createAdminClient();
    }
    return this.adminSupabase;
  }

  // =============================================
  // BOOKING LINK MANAGEMENT
  // =============================================

  async createBookingLink(data: Partial<BookingLink>): Promise<BookingLink> {
    // Filter out fields that might not exist in the database schema yet
    const {
      assigned_staff_ids,
      meeting_title_template,
      meeting_location,
      availability_rules,
      form_configuration,
      confirmation_settings,
      notification_settings,
      style_settings,
      payment_settings,
      cancellation_policy,
      booking_limits,
      buffer_settings,
      ...baseData
    } = data;

    // Try to insert with all fields first
    let insertData = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabaseClient = await this.getSupabaseClient();
    let { data: result, error } = await supabaseClient
      .from("booking_links")
      .insert(insertData)
      .select("*")
      .single();

    // If error mentions missing columns, try with basic fields only
    if (
      error &&
      error.message.includes("column") &&
      error.message.includes("does not exist")
    ) {
      console.warn(
        "Some booking_links columns missing, falling back to basic fields:",
        error.message,
      );

      // Insert only the basic fields that should exist in the original schema
      insertData = {
        ...baseData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const supabaseClient2 = await this.getSupabaseClient();
      const { data: fallbackResult, error: fallbackError } =
        await supabaseClient2
          .from("booking_links")
          .insert(insertData)
          .select("*")
          .single();

      if (fallbackError) {
        throw new Error(
          `Failed to create booking link: ${fallbackError.message}`,
        );
      }

      result = fallbackResult;
    } else if (error) {
      throw new Error(`Failed to create booking link: ${error.message}`);
    }

    return result;
  }

  async updateBookingLink(
    id: string,
    data: Partial<BookingLink>,
  ): Promise<BookingLink> {
    // Filter out fields that might not exist in the database schema yet
    const {
      assigned_staff_ids,
      meeting_title_template,
      meeting_location,
      availability_rules,
      form_configuration,
      confirmation_settings,
      notification_settings,
      style_settings,
      payment_settings,
      cancellation_policy,
      booking_limits,
      buffer_settings,
      ...baseData
    } = data;

    // Try to update with all fields first
    let updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const supabaseClient = await this.getSupabaseClient();
    let { data: result, error } = await supabaseClient
      .from("booking_links")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    // If error mentions missing columns, try with basic fields only
    if (
      error &&
      error.message.includes("column") &&
      error.message.includes("does not exist")
    ) {
      console.warn(
        "Some booking_links columns missing, falling back to basic fields:",
        error.message,
      );

      // Update only the basic fields that should exist in the original schema
      updateData = {
        ...baseData,
        updated_at: new Date().toISOString(),
      };

      const supabaseClient2 = await this.getSupabaseClient();
      const { data: fallbackResult, error: fallbackError } =
        await supabaseClient2
          .from("booking_links")
          .update(updateData)
          .eq("id", id)
          .select("*")
          .single();

      if (fallbackError) {
        throw new Error(
          `Failed to update booking link: ${fallbackError.message}`,
        );
      }

      result = fallbackResult;
    } else if (error) {
      throw new Error(`Failed to update booking link: ${error.message}`);
    }

    return result;
  }

  async getBookingLink(slug: string): Promise<BookingLink | null> {
    const supabaseClient = await this.getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;
    return data;
  }

  async getBookingLinkById(id: string): Promise<BookingLink | null> {
    const supabaseClient = await this.getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data;
  }

  async listBookingLinks(organizationId: string): Promise<BookingLink[]> {
    const supabaseClient = await this.getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("booking_links")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Failed to fetch booking links: ${error.message}`);
    return data || [];
  }

  async deleteBookingLink(id: string): Promise<void> {
    const supabaseClient = await this.getSupabaseClient();
    const { error } = await supabaseClient
      .from("booking_links")
      .delete()
      .eq("id", id);

    if (error)
      throw new Error(`Failed to delete booking link: ${error.message}`);
  }

  async checkSlugAvailability(
    slug: string,
    excludeId?: string,
  ): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    let query = supabase.from("booking_links").select("id").eq("slug", slug);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error)
      throw new Error(`Failed to check slug availability: ${error.message}`);
    return !data || data.length === 0;
  }

  // =============================================
  // AVAILABILITY MANAGEMENT
  // =============================================

  async setAvailabilityRules(
    bookingLinkId: string,
    staffId: string,
    rules: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_available: boolean;
    }>,
  ): Promise<void> {
    // Delete existing rules for this booking link and staff
    const supabaseClientDel = await this.getSupabaseClient();
    await supabaseClientDel
      .from("booking_availability")
      .delete()
      .eq("booking_link_id", bookingLinkId)
      .eq("staff_id", staffId);

    // Insert new rules
    if (rules.length > 0) {
      const supabase = await this.getSupabaseClient();
      const { error } = await supabase.from("booking_availability").insert(
        rules.map((rule) => ({
          booking_link_id: bookingLinkId,
          staff_id: staffId,
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      );

      if (error)
        throw new Error(`Failed to set availability rules: ${error.message}`);
    }
  }

  async addException(
    bookingLinkId: string,
    exception: {
      staff_id?: string;
      exception_date: string;
      is_available: boolean;
      custom_hours?: Array<{ start_time: string; end_time: string }>;
      reason?: string;
    },
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.from("booking_exceptions").insert({
      booking_link_id: bookingLinkId,
      ...exception,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error)
      throw new Error(`Failed to add booking exception: ${error.message}`);
  }

  async getAvailableSlots(
    slug: string,
    startDate: Date,
    endDate: Date,
    timezone = "Europe/London",
  ): Promise<AvailableSlot[]> {
    try {
      // Get booking link details
      const bookingLink = await this.getBookingLink(slug);
      if (!bookingLink) throw new Error("Booking link not found");

      // Get appointment types
      const supabaseAppt = await this.getSupabaseClient();
      const { data: appointmentTypes, error: atError } = await supabaseAppt
        .from("appointment_types")
        .select("*")
        .in("id", bookingLink.appointment_type_ids)
        .eq("is_active", true);

      if (atError)
        throw new Error(
          `Failed to fetch appointment types: ${atError.message}`,
        );

      // Get staff members
      const staffIds = bookingLink.assigned_staff_ids || [];
      if (staffIds.length === 0) {
        // If no specific staff assigned, get all org staff
        const supabaseStaff = await this.getSupabaseClient();
        const { data: orgStaff, error: staffError } = await supabaseStaff
          .from("organization_members")
          .select("user_id, users:user_id(id, full_name)")
          .eq("org_id", bookingLink.organization_id);

        if (staffError)
          throw new Error(`Failed to fetch staff: ${staffError.message}`);
        staffIds.push(...(orgStaff?.map((s) => (s as any).user_id) || []));
      }

      // Get availability rules
      const supabaseAvail = await this.getSupabaseClient();
      const { data: availabilityRules, error: arError } = await supabaseAvail
        .from("booking_availability")
        .select("*")
        .eq("booking_link_id", bookingLink.id)
        .in("staff_id", staffIds)
        .eq("is_available", true);

      if (arError)
        throw new Error(
          `Failed to fetch availability rules: ${arError.message}`,
        );

      // Get exceptions
      const supabaseExcept = await this.getSupabaseClient();
      const { data: exceptions, error: exError } = await supabaseExcept
        .from("booking_exceptions")
        .select("*")
        .eq("booking_link_id", bookingLink.id)
        .gte("exception_date", format(startDate, "yyyy-MM-dd"))
        .lte("exception_date", format(endDate, "yyyy-MM-dd"));

      if (exError)
        throw new Error(`Failed to fetch exceptions: ${exError.message}`);

      // Get existing bookings
      const supabaseBookings = await this.getSupabaseClient();
      const { data: existingBookings, error: ebError } = await supabaseBookings
        .from("bookings")
        .select("*")
        .in("assigned_to", staffIds)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .in("booking_status", ["confirmed", "attended"]);

      if (ebError)
        throw new Error(
          `Failed to fetch existing bookings: ${ebError.message}`,
        );

      // Generate available slots
      const slots: AvailableSlot[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Check for date-specific exceptions
        const dayExceptions =
          exceptions?.filter((ex) => ex.exception_date === dateStr) || [];

        // Get availability rules for this day
        const dayRules =
          availabilityRules?.filter((rule) => rule.day_of_week === dayOfWeek) ||
          [];

        for (const rule of dayRules) {
          // Check if this staff member has an exception for this date
          const staffException = dayExceptions.find(
            (ex) => ex.staff_id === rule.staff_id || ex.staff_id === null,
          );

          if (staffException && !staffException.is_available) {
            continue; // Skip this staff member for this date
          }

          // Use custom hours if available in exception
          const startTime =
            staffException?.custom_hours?.[0]?.start_time || rule.start_time;
          const endTime =
            staffException?.custom_hours?.[0]?.end_time || rule.end_time;

          // Generate time slots
          for (const appointmentType of appointmentTypes || []) {
            const slotStartTime = new Date(`${dateStr}T${startTime}`);
            const slotEndTime = new Date(`${dateStr}T${endTime}`);

            let currentSlot = slotStartTime;
            while (
              addMinutes(currentSlot, appointmentType.duration_minutes) <=
              slotEndTime
            ) {
              const slotEnd = addMinutes(
                currentSlot,
                appointmentType.duration_minutes,
              );

              // Check for conflicts with existing bookings
              const hasConflict = existingBookings?.some((booking) => {
                const bookingStart = parseISO(booking.start_time);
                const bookingEnd = parseISO(booking.end_time);
                return (
                  booking.assigned_to === rule.staff_id &&
                  ((currentSlot >= bookingStart && currentSlot < bookingEnd) ||
                    (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                    (currentSlot <= bookingStart && slotEnd >= bookingEnd))
                );
              });

              if (!hasConflict && !isBefore(currentSlot, new Date())) {
                // Get staff name
                const supabaseUsers = await this.getSupabaseClient();
                const { data: staff } = await supabaseUsers
                  .from("users")
                  .select("full_name")
                  .eq("id", rule.staff_id)
                  .single();

                slots.push({
                  start_time: currentSlot.toISOString(),
                  end_time: slotEnd.toISOString(),
                  staff_id: rule.staff_id,
                  staff_name: staff?.full_name || "Staff Member",
                  appointment_type_id: appointmentType.id,
                  appointment_type_name: appointmentType.name,
                  duration_minutes: appointmentType.duration_minutes,
                });
              }

              // Move to next slot (add buffer time)
              currentSlot = addMinutes(
                slotEnd,
                bookingLink.buffer_settings?.after_minutes || 15,
              );
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return slots.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    } catch (error) {
      console.error("Error generating available slots:", error);
      throw error;
    }
  }

  // =============================================
  // BOOKING CREATION AND MANAGEMENT
  // =============================================

  async createBooking(request: BookingRequest): Promise<{
    id: string;
    confirmation_token: string;
    cancellation_token: string;
  }> {
    const supabase = await this.getAdminSupabaseClient();

    // Validate the booking request
    const bookingLink = await this.getBookingLink(request.booking_link_id);
    if (!bookingLink) throw new Error("Booking link not found");

    // Check if slot is still available
    const isAvailable = await this.isSlotAvailable(
      request.staff_id!,
      parseISO(request.start_time),
      parseISO(request.end_time),
    );
    if (!isAvailable) throw new Error("This time slot is no longer available");

    // Generate title from template
    const title = this.generateMeetingTitle(
      bookingLink.meeting_title_template,
      {
        contact: { name: request.attendee_name },
        service:
          (await this.getAppointmentType(request.appointment_type_id))?.name ||
          "Appointment",
      },
    );

    // Create the booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        organization_id: bookingLink.organization_id,
        booking_link_id: bookingLink.id,
        appointment_type_id: request.appointment_type_id,
        assigned_to: request.staff_id,
        title,
        start_time: request.start_time,
        end_time: request.end_time,
        attendee_name: request.attendee_name,
        attendee_email: request.attendee_email,
        attendee_phone: request.attendee_phone,
        custom_fields: request.custom_fields || {},
        notes: request.notes,
        timezone: request.timezone,
        booking_status: bookingLink.confirmation_settings.auto_confirm
          ? "confirmed"
          : "pending",
        location_type: bookingLink.meeting_location.type,
        location_details: JSON.stringify(bookingLink.meeting_location),
      })
      .select("id, confirmation_token, cancellation_token")
      .single();

    if (error) throw new Error(`Failed to create booking: ${error.message}`);

    // Send notifications if enabled
    if (bookingLink.notification_settings.email_enabled) {
      await this.sendBookingNotification(booking.id, "booking_created");
    }

    // Create Google Calendar event if connected
    await this.createCalendarEvent(booking.id);

    return booking;
  }

  async cancelBooking(
    cancellationToken: string,
    reason?: string,
  ): Promise<void> {
    const supabase = await this.getAdminSupabaseClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("cancellation_token", cancellationToken)
      .single();

    if (fetchError || !booking) throw new Error("Booking not found");

    // Check cancellation policy
    const bookingLink = await this.getBookingLinkById(booking.booking_link_id);
    if (bookingLink?.cancellation_policy.allowed) {
      const hoursUntil =
        (parseISO(booking.start_time).getTime() - new Date().getTime()) /
        (1000 * 60 * 60);
      if (hoursUntil < bookingLink.cancellation_policy.hours_before) {
        throw new Error(
          `Cancellations must be made at least ${bookingLink.cancellation_policy.hours_before} hours in advance`,
        );
      }
    }

    // Cancel the booking
    const { error } = await supabase
      .from("bookings")
      .update({
        booking_status: "cancelled",
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (error) throw new Error(`Failed to cancel booking: ${error.message}`);

    // Send cancellation notification
    const notificationSettings = bookingLink?.notification_settings;
    if (notificationSettings?.cancellation_notifications) {
      await this.sendBookingNotification(booking.id, "booking_cancelled");
    }

    // Delete Google Calendar event
    await this.deleteCalendarEvent(booking.id);
  }

  async rescheduleBooking(
    bookingId: string,
    newStartTime: string,
    newEndTime: string,
    staffId?: string,
  ): Promise<void> {
    const supabase = await this.getAdminSupabaseClient();

    // Check if new slot is available
    const isAvailable = await this.isSlotAvailable(
      staffId!,
      parseISO(newStartTime),
      parseISO(newEndTime),
    );
    if (!isAvailable) throw new Error("The new time slot is not available");

    // Update the booking
    const { error } = await supabase
      .from("bookings")
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        assigned_to: staffId,
        reschedule_count: supabase.sql`reschedule_count + 1`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error)
      throw new Error(`Failed to reschedule booking: ${error.message}`);

    // Update Google Calendar event
    await this.updateCalendarEvent(bookingId);
  }

  // =============================================
  // FORM FIELD MANAGEMENT
  // =============================================

  async getFormFields(bookingLinkId: string): Promise<FormField[]> {
    const supabaseClient = await this.getSupabaseClient();
    const { data, error } = await supabaseClient
      .from("booking_form_fields")
      .select("*")
      .eq("booking_link_id", bookingLinkId)
      .eq("is_active", true)
      .order("display_order");

    if (error) throw new Error(`Failed to fetch form fields: ${error.message}`);

    return (data || []).map((field) => ({
      id: field.id,
      name: field.field_name,
      label: field.field_label,
      type: field.field_type as FormField["type"],
      options: field.field_options as string[],
      required: field.is_required,
      placeholder: field.placeholder,
      validation_rules: field.validation_rules,
      display_order: field.display_order,
    }));
  }

  async updateFormFields(
    bookingLinkId: string,
    fields: FormField[],
  ): Promise<void> {
    const supabase = await this.getAdminSupabaseClient();

    // Delete existing fields
    await supabase
      .from("booking_form_fields")
      .delete()
      .eq("booking_link_id", bookingLinkId);

    // Insert new fields
    if (fields.length > 0) {
      const { error } = await supabase.from("booking_form_fields").insert(
        fields.map((field) => ({
          booking_link_id: bookingLinkId,
          field_name: field.name,
          field_label: field.label,
          field_type: field.type,
          field_options: field.options,
          is_required: field.required,
          placeholder: field.placeholder,
          validation_rules: field.validation_rules,
          display_order: field.display_order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      );

      if (error)
        throw new Error(`Failed to update form fields: ${error.message}`);
    }
  }

  // =============================================
  // ANALYTICS AND TRACKING
  // =============================================

  async trackEvent(
    bookingLinkSlug: string,
    eventType:
      | "page_view"
      | "form_started"
      | "booking_completed"
      | "booking_cancelled",
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const bookingLink = await this.getBookingLink(bookingLinkSlug);
    if (!bookingLink) return;

    const { error } = await this.getAdminSupabaseClient()
      .from("booking_link_analytics")
      .insert({
        booking_link_id: bookingLink.id,
        organization_id: bookingLink.organization_id,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to track booking link event:", error);
    }
  }

  async getAnalytics(
    bookingLinkId: string,
    days = 30,
  ): Promise<{
    page_views: number;
    form_starts: number;
    bookings_completed: number;
    conversion_rate: number;
    daily_stats: Array<{ date: string; views: number; bookings: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const supabaseAnalytics = await this.getSupabaseClient();
    const { data, error } = await supabaseAnalytics
      .from("booking_link_analytics")
      .select("*")
      .eq("booking_link_id", bookingLinkId)
      .gte("created_at", startDate.toISOString());

    if (error) throw new Error(`Failed to fetch analytics: ${error.message}`);

    const analytics = data || [];
    const pageViews = analytics.filter(
      (a) => a.event_type === "page_view",
    ).length;
    const formStarts = analytics.filter(
      (a) => a.event_type === "form_started",
    ).length;
    const bookingsCompleted = analytics.filter(
      (a) => a.event_type === "booking_completed",
    ).length;

    // Calculate daily stats
    const dailyStats: Record<string, { views: number; bookings: number }> = {};
    analytics.forEach((event) => {
      const date = format(parseISO(event.created_at), "yyyy-MM-dd");
      if (!dailyStats[date]) {
        dailyStats[date] = { views: 0, bookings: 0 };
      }
      if (event.event_type === "page_view") dailyStats[date].views++;
      if (event.event_type === "booking_completed") dailyStats[date].bookings++;
    });

    return {
      page_views: pageViews,
      form_starts: formStarts,
      bookings_completed: bookingsCompleted,
      conversion_rate:
        pageViews > 0 ? (bookingsCompleted / pageViews) * 100 : 0,
      daily_stats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        views: stats.views,
        bookings: stats.bookings,
      })),
    };
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async isSlotAvailable(
    staffId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const supabaseCheck = await this.getSupabaseClient();
    const { data, error } = await supabaseCheck
      .from("bookings")
      .select("id")
      .eq("assigned_to", staffId)
      .in("booking_status", ["confirmed", "attended"])
      .or(
        `start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()}`,
      );

    if (error) {
      console.error("Error checking slot availability:", error);
      return false;
    }

    return !data || data.length === 0;
  }

  private async getAppointmentType(id: string) {
    const supabaseApptType = await this.getSupabaseClient();
    const { data, error } = await supabaseApptType
      .from("appointment_types")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }

  private generateMeetingTitle(
    template: string,
    variables: Record<string, any>,
  ): string {
    let title = template;

    // Replace variables in the format {{variable.property}}
    title = title.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const parts = variable.split(".");
      let value = variables;

      for (const part of parts) {
        value = value?.[part.trim()];
      }

      return value || match;
    });

    return title;
  }

  private async sendBookingNotification(
    bookingId: string,
    type: string,
  ): Promise<void> {
    try {
      // Get booking details
      const supabaseBookingDetails = await this.getSupabaseClient();
      const { data: booking, error } = await supabaseBookingDetails
        .from("bookings")
        .select(
          `
          *,
          appointment_type:appointment_types(*),
          booking_link:booking_links(*)
        `,
        )
        .eq("id", bookingId)
        .single();

      if (error || !booking) {
        console.error("Failed to fetch booking for notification:", error);
        return;
      }

      // Queue notification in the notifications table
      await this.getAdminSupabaseClient()
        .from("notifications")
        .insert({
          organization_id: booking.organization_id,
          booking_id: bookingId,
          type: "email",
          template: type,
          recipient_email: booking.attendee_email,
          recipient_name: booking.attendee_name,
          subject: this.getNotificationSubject(type, booking),
          body: this.getNotificationBody(type, booking),
          send_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error("Error queuing notification:", error);
    }
  }

  private async createCalendarEvent(bookingId: string): Promise<void> {
    try {
      // Get booking details
      const supabaseBookingDetails = await this.getSupabaseClient();
      const { data: booking, error } = await supabaseBookingDetails
        .from("bookings")
        .select(
          `
          *,
          appointment_type:appointment_types(*),
          booking_link:booking_links(*)
        `,
        )
        .eq("id", bookingId)
        .single();

      if (error || !booking || !booking.assigned_to) {
        console.error("Failed to fetch booking for calendar event:", error);
        return;
      }

      // Generate calendar event
      const eventData = await googleCalendarBookingService.generateBookingEvent(
        booking,
        booking.booking_link,
        booking.appointment_type,
      );

      // Create the event
      const eventId = await googleCalendarBookingService.createBookingEvent(
        bookingId,
        booking.assigned_to,
        eventData,
      );

      if (eventId) {
        console.log(
          `Created Google Calendar event ${eventId} for booking ${bookingId}`,
        );
      }
    } catch (error) {
      console.error("Error creating calendar event:", error);
    }
  }

  private async updateCalendarEvent(bookingId: string): Promise<void> {
    try {
      // Get booking details
      const supabaseBookingDetails = await this.getSupabaseClient();
      const { data: booking, error } = await supabaseBookingDetails
        .from("bookings")
        .select(
          `
          *,
          appointment_type:appointment_types(*),
          booking_link:booking_links(*)
        `,
        )
        .eq("id", bookingId)
        .single();

      if (error || !booking || !booking.assigned_to) {
        console.error("Failed to fetch booking for calendar update:", error);
        return;
      }

      // Generate updated event data
      const eventData = await googleCalendarBookingService.generateBookingEvent(
        booking,
        booking.booking_link,
        booking.appointment_type,
      );

      // Update the event
      const success = await googleCalendarBookingService.updateBookingEvent(
        bookingId,
        booking.assigned_to,
        eventData,
      );

      if (success) {
        console.log(`Updated Google Calendar event for booking ${bookingId}`);
      }
    } catch (error) {
      console.error("Error updating calendar event:", error);
    }
  }

  private async deleteCalendarEvent(bookingId: string): Promise<void> {
    try {
      // Get booking details
      const supabaseBookingDetails = await this.getSupabaseClient();
      const { data: booking, error } = await supabaseBookingDetails
        .from("bookings")
        .select("assigned_to")
        .eq("id", bookingId)
        .single();

      if (error || !booking || !booking.assigned_to) {
        console.error("Failed to fetch booking for calendar deletion:", error);
        return;
      }

      // Delete the event
      const success = await googleCalendarBookingService.deleteBookingEvent(
        bookingId,
        booking.assigned_to,
      );

      if (success) {
        console.log(`Deleted Google Calendar event for booking ${bookingId}`);
      }
    } catch (error) {
      console.error("Error deleting calendar event:", error);
    }
  }

  private getNotificationSubject(type: string, booking: any): string {
    switch (type) {
      case "booking_created":
        return `Booking Confirmation - ${booking.title}`;
      case "booking_cancelled":
        return `Booking Cancelled - ${booking.title}`;
      case "booking_reminder":
        return `Reminder: ${booking.title} Tomorrow`;
      default:
        return `Booking Update - ${booking.title}`;
    }
  }

  private getNotificationBody(type: string, booking: any): string {
    const startTime = format(
      parseISO(booking.start_time),
      "EEEE, MMMM d, yyyy at h:mm a",
    );

    switch (type) {
      case "booking_created":
        return `Hi ${booking.attendee_name},\n\nYour booking has been confirmed!\n\nDetails:\n• ${booking.title}\n• ${startTime}\n• Duration: ${booking.appointment_type?.duration_minutes || 60} minutes\n\nWe look forward to seeing you!\n\nBest regards,\nThe Team`;
      case "booking_cancelled":
        return `Hi ${booking.attendee_name},\n\nYour booking for ${startTime} has been cancelled.\n\nIf you need to reschedule, please visit our booking page.\n\nBest regards,\nThe Team`;
      default:
        return `Hi ${booking.attendee_name},\n\nThis is a reminder about your upcoming appointment:\n\n• ${booking.title}\n• ${startTime}\n\nSee you soon!\n\nBest regards,\nThe Team`;
    }
  }

  // =============================================
  // GYM-SPECIFIC METHODS
  // =============================================

  async getTrainerSpecializations(staffId: string): Promise<
    Array<{
      type: string;
      certification: string;
      active: boolean;
    }>
  > {
    const supabaseTrainer = await this.getSupabaseClient();
    const { data, error } = await supabaseTrainer
      .from("trainer_specializations")
      .select("*")
      .eq("staff_id", staffId)
      .eq("is_active", true);

    if (error)
      throw new Error(
        `Failed to fetch trainer specializations: ${error.message}`,
      );

    return (data || []).map((spec) => ({
      type: spec.specialization_type,
      certification: spec.certification_name || "",
      active: spec.is_active,
    }));
  }

  async getEquipmentRequirements(bookingLinkId: string): Promise<
    Array<{
      name: string;
      type: string;
      required: boolean;
      alternatives: string[];
    }>
  > {
    const supabaseEquipment = await this.getSupabaseClient();
    const { data, error } = await supabaseEquipment
      .from("booking_equipment_requirements")
      .select("*")
      .eq("booking_link_id", bookingLinkId);

    if (error)
      throw new Error(
        `Failed to fetch equipment requirements: ${error.message}`,
      );

    return (data || []).map((req) => ({
      name: req.equipment_name,
      type: req.equipment_type,
      required: req.is_required,
      alternatives: req.alternative_options || [],
    }));
  }

  async checkClassCapacity(
    appointmentTypeId: string,
    startTime: string,
  ): Promise<{
    current: number;
    maximum: number;
    available: boolean;
  }> {
    // Get appointment type details
    const appointmentType = await this.getAppointmentType(appointmentTypeId);
    if (!appointmentType) throw new Error("Appointment type not found");

    // Count current bookings for this time slot
    const supabaseCapacity = await this.getSupabaseClient();
    const { data: bookings, error } = await supabaseCapacity
      .from("bookings")
      .select("id")
      .eq("appointment_type_id", appointmentTypeId)
      .eq("start_time", startTime)
      .in("booking_status", ["confirmed", "attended"]);

    if (error) throw new Error(`Failed to check capacity: ${error.message}`);

    const current = bookings?.length || 0;
    const maximum = appointmentType.max_capacity || 1;

    return {
      current,
      maximum,
      available: current < maximum,
    };
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async duplicateBookingLink(
    originalId: string,
    newName: string,
  ): Promise<BookingLink> {
    const original = await this.getBookingLinkById(originalId);
    if (!original) throw new Error("Original booking link not found");

    const duplicate = {
      ...original,
      id: undefined,
      name: newName,
      slug: "", // Will be auto-generated
      created_at: undefined,
      updated_at: undefined,
    };

    return this.createBookingLink(duplicate);
  }

  async getBookingStats(bookingLinkId: string): Promise<{
    total_bookings: number;
    confirmed_bookings: number;
    cancelled_bookings: number;
    no_shows: number;
    this_month: number;
    last_month: number;
  }> {
    const supabaseStats = await this.getSupabaseClient();
    const { data, error } = await supabaseStats
      .from("bookings")
      .select("booking_status, start_time")
      .eq("booking_link_id", bookingLinkId);

    if (error)
      throw new Error(`Failed to fetch booking stats: ${error.message}`);

    const bookings = data || [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      total_bookings: bookings.length,
      confirmed_bookings: bookings.filter(
        (b) => b.booking_status === "confirmed",
      ).length,
      cancelled_bookings: bookings.filter(
        (b) => b.booking_status === "cancelled",
      ).length,
      no_shows: bookings.filter((b) => b.booking_status === "no_show").length,
      this_month: bookings.filter(
        (b) => parseISO(b.start_time) >= thisMonthStart,
      ).length,
      last_month: bookings.filter((b) => {
        const bookingDate = parseISO(b.start_time);
        return bookingDate >= lastMonthStart && bookingDate <= lastMonthEnd;
      }).length,
    };
  }

  async validateBookingLinkConfig(config: Partial<BookingLink>): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check required fields
    if (!config.name || config.name.trim().length === 0) {
      errors.push("Name is required");
    }

    if (!config.slug || config.slug.trim().length === 0) {
      errors.push("URL slug is required");
    }

    // Appointment types are optional now; links can be created without predefining types

    // Check slug format
    if (config.slug && !/^[a-z0-9-]+$/.test(config.slug)) {
      errors.push(
        "URL slug can only contain lowercase letters, numbers, and hyphens",
      );
    }

    // Check slug uniqueness
    if (config.slug) {
      const isAvailable = await this.checkSlugAvailability(
        config.slug,
        config.id,
      );
      if (!isAvailable) {
        errors.push("This URL slug is already in use");
      }
    }

    // Validate availability weekly rules do not overlap per staff per day
    const rules: any = config.availability_rules || {};
    const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);
    Object.keys(rules || {}).forEach((staffId) => {
      const cfg = rules[staffId] || {};
      const weekly = cfg.weekly || {};
      Object.keys(weekly).forEach((dayKey) => {
        const day = weekly[dayKey] || [];
        const intervals = day.map((i: any) => ({ start: i.start, end: i.end }));
        for (const i of intervals) {
          if (!isValidTime(i.start) || !isValidTime(i.end)) {
            errors.push(
              `Invalid time format for staff ${staffId} on day ${dayKey}`,
            );
          } else if (i.start >= i.end) {
            errors.push(
              `Start time must be before end time for staff ${staffId} on day ${dayKey}`,
            );
          }
        }
        const sorted = intervals
          .slice()
          .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].start < sorted[i - 1].end) {
            errors.push(
              `Overlapping intervals for staff ${staffId} on day ${dayKey}`,
            );
            break;
          }
        }
      });
    });

    // Validate custom form fields uniqueness and allowed types
    const fields = config.form_configuration?.fields || [];
    const allowedTypes = new Set([
      "text",
      "email",
      "phone",
      "textarea",
      "select",
      "checkbox",
      "radio",
      "date",
      "time",
    ]);
    const seenIds = new Set<string>();
    for (const f of fields) {
      if (!f.id || !/^[a-z0-9_]+$/.test(f.id)) {
        errors.push(
          "Each custom field must have a valid unique id (a-z,0-9,_)",
        );
      } else if (seenIds.has(f.id)) {
        errors.push(`Duplicate custom field id: ${f.id}`);
      }
      seenIds.add(f.id);
      if (!allowedTypes.has(f.type as any)) {
        errors.push(`Invalid field type for ${f.id}`);
      }
      if (typeof f.required !== "boolean") {
        errors.push(`Required must be boolean for ${f.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const bookingLinkService = new BookingLinkService();
