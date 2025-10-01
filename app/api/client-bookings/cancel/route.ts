import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 },
      );
    }

    // Get client info
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (clientError || !clientData) {
      // Try by email
      const { data: clientByEmail, error: emailError } = await supabase
        .from("clients")
        .select("id")
        .eq("email", user.email)
        .single();

      if (emailError || !clientByEmail) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 },
        );
      }

      // Try to cancel in bookings table
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .eq("client_id", clientByEmail.id)
        .select();

      if (error || !data || data.length === 0) {
        // Try class_bookings table
        const { data: altData, error: altError } = await supabase
          .from("class_bookings")
          .update({ booking_status: "cancelled" })
          .eq("id", bookingId)
          .eq("client_id", clientByEmail.id)
          .select();

        if (altError || !altData || altData.length === 0) {
          // Try class_bookings with customer_id via leads table
          const { data: leadData } = await supabase
            .from("leads")
            .select("id")
            .eq("client_id", clientByEmail.id)
            .single();

          if (leadData) {
            const { data: customerBookingData, error: customerBookingError } =
              await supabase
                .from("class_bookings")
                .update({ booking_status: "cancelled" })
                .eq("id", bookingId)
                .eq("customer_id", leadData.id)
                .select();

            if (
              !customerBookingError &&
              customerBookingData &&
              customerBookingData.length > 0
            ) {
              return NextResponse.json({ success: true });
            }
          }

          return NextResponse.json(
            { error: "Booking not found or unauthorized" },
            { status: 404 },
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    // Try to cancel in bookings table
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("client_id", clientData.id)
      .select();

    if (error || !data || data.length === 0) {
      // Try class_bookings table
      const { data: altData, error: altError } = await supabase
        .from("class_bookings")
        .update({ booking_status: "cancelled" })
        .eq("id", bookingId)
        .eq("client_id", clientData.id)
        .select();

      if (altError || !altData || altData.length === 0) {
        // Try class_bookings with customer_id via leads table
        const { data: leadData } = await supabase
          .from("leads")
          .select("id")
          .eq("client_id", clientData.id)
          .single();

        if (leadData) {
          const { data: customerBookingData, error: customerBookingError } =
            await supabase
              .from("class_bookings")
              .update({ booking_status: "cancelled" })
              .eq("id", bookingId)
              .eq("customer_id", leadData.id)
              .select();

          if (
            !customerBookingError &&
            customerBookingData &&
            customerBookingData.length > 0
          ) {
            return NextResponse.json({ success: true });
          }
        }

        return NextResponse.json(
          { error: "Booking not found or unauthorized" },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/client-bookings/cancel:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
