import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { customerId, organizationId, selectedSessions, startDate, endDate } =
      body;

    if (
      !customerId ||
      !organizationId ||
      !selectedSessions?.length ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if the customer is in clients or leads table
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", organizationId)
      .single();

    const isClient = !!clientCheck;

    // Generate all booking dates for the 3-month period
    const bookingDates: Array<{
      dayOfWeek: number;
      timeSlot: string;
      date: Date;
      programId: string;
      instructor?: string;
      location?: string;
    }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    selectedSessions.forEach((session: any) => {
      let current = new Date(start);

      // Find the first occurrence of this day of week
      while (current.getDay() !== session.dayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      // Add all occurrences until end date
      while (current <= end) {
        bookingDates.push({
          dayOfWeek: session.dayOfWeek,
          timeSlot: session.timeSlot,
          date: new Date(current),
          programId: session.programId,
          instructor: session.instructor,
          location: session.location,
        });
        current.setDate(current.getDate() + 7); // Move to next week
      }
    });

    // Sort by date
    bookingDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(
      `Creating ${bookingDates.length} recurring bookings for customer ${customerId}`,
    );

    // For each booking date, find or create the class session
    const bookingsToCreate = [];

    for (const booking of bookingDates) {
      // Create datetime from date and time slot
      const [hours, minutes] = booking.timeSlot.split(":").map(Number);
      const sessionStartTime = new Date(booking.date);
      sessionStartTime.setHours(hours, minutes, 0, 0);

      const sessionEndTime = new Date(sessionStartTime);
      sessionEndTime.setHours(sessionEndTime.getHours() + 1); // Default 1 hour duration

      // Check if session exists for this exact date/time
      const { data: existingSession } = await supabase
        .from("class_sessions")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("program_id", booking.programId)
        .gte("start_time", sessionStartTime.toISOString())
        .lt(
          "start_time",
          new Date(sessionStartTime.getTime() + 60000).toISOString(),
        ) // Within 1 minute
        .maybeSingle();

      let sessionId: string;

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        // Create new class session for this date
        const { data: newSession, error: sessionError } = await supabase
          .from("class_sessions")
          .insert({
            organization_id: organizationId,
            program_id: booking.programId,
            instructor_name: booking.instructor,
            room_location: booking.location,
            start_time: sessionStartTime.toISOString(),
            end_time: sessionEndTime.toISOString(),
            max_capacity: 15,
            current_bookings: 0,
            status: "scheduled",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (sessionError || !newSession) {
          console.error(
            `Failed to create session for ${sessionStartTime}:`,
            sessionError,
          );
          continue;
        }

        sessionId = newSession.id;
      }

      // Add booking for this session with correct field
      const bookingData: any = {
        organization_id: organizationId,
        class_session_id: sessionId,
        booking_status: "confirmed",
        booking_type: "membership",
        payment_status: "succeeded",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Use client_id if it's a client, customer_id if it's a lead
      // IMPORTANT: Only set the field that corresponds to the actual table
      if (isClient) {
        bookingData.client_id = customerId;
        bookingData.customer_id = null; // Explicitly set to null
      } else {
        bookingData.customer_id = customerId;
        bookingData.client_id = null; // Explicitly set to null
      }

      bookingsToCreate.push(bookingData);
    }

    if (bookingsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: "No bookings could be created" },
        { status: 400 },
      );
    }

    console.log(
      `Inserting ${bookingsToCreate.length} bookings into class_bookings table`,
    );

    // Insert all bookings (skip duplicates)
    const { data: createdBookings, error: bookingError } = await supabase
      .from("class_bookings")
      .insert(bookingsToCreate)
      .select();

    if (bookingError) {
      // Check if it's a duplicate key error
      if (bookingError.message?.includes("duplicate")) {
        // Try to insert non-duplicate bookings one by one
        const successfulBookings = [];
        for (const booking of bookingsToCreate) {
          const { data, error } = await supabase
            .from("class_bookings")
            .insert(booking)
            .select()
            .single();

          if (data) {
            successfulBookings.push(data);
          }
        }

        if (successfulBookings.length > 0) {
          return NextResponse.json({
            success: true,
            data: successfulBookings,
            message: `Created ${successfulBookings.length} bookings (${bookingsToCreate.length - successfulBookings.length} were duplicates)`,
          });
        }
      }

      console.error("Error creating bookings:", bookingError);
      return NextResponse.json(
        { success: false, error: bookingError.message },
        { status: 500 },
      );
    }

    // Update current_bookings count for all affected sessions
    const sessionIds = [
      ...new Set(bookingsToCreate.map((b) => b.class_session_id)),
    ];
    for (const sessionId of sessionIds) {
      const { count } = await supabase
        .from("class_bookings")
        .select("*", { count: "exact", head: true })
        .eq("class_session_id", sessionId)
        .eq("booking_status", "confirmed");

      await supabase
        .from("class_sessions")
        .update({ current_bookings: count || 0 })
        .eq("id", sessionId);
    }

    return NextResponse.json({
      success: true,
      data: createdBookings,
      message: `Successfully created ${createdBookings?.length || 0} recurring bookings`,
    });
  } catch (error) {
    console.error("Error in recurring booking:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
