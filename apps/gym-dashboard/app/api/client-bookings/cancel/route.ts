import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Create admin client for updates (bypasses RLS after auth check)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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

      // Try to cancel in bookings table (use admin client to bypass RLS)
      const { data, error } = await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .eq("client_id", clientByEmail.id)
        .select();

      if (error || !data || data.length === 0) {
        // Try class_bookings table
        const { data: altData, error: altError } = await supabaseAdmin
          .from("class_bookings")
          .update({ booking_status: "cancelled" })
          .eq("id", bookingId)
          .eq("client_id", clientByEmail.id)
          .select();

        if (altError || !altData || altData.length === 0) {
          // Try class_bookings by ID only and verify ownership via customer_id
          console.log("[Cancel] Checking booking by ID for customer_id field");
          const { data: bookingData } = await supabase
            .from("class_bookings")
            .select("customer_id")
            .eq("id", bookingId)
            .single();

          if (bookingData?.customer_id) {
            // Booking has customer_id, verify it belongs to this client via leads
            const { data: leadData } = await supabase
              .from("leads")
              .select("id")
              .eq("id", bookingData.customer_id)
              .eq("client_id", clientByEmail.id)
              .single();

            if (leadData) {
              // Verified ownership, cancel the booking
              const { data: cancelledData, error: cancelError } =
                await supabaseAdmin
                  .from("class_bookings")
                  .update({ booking_status: "cancelled" })
                  .eq("id", bookingId)
                  .select();

              if (!cancelError && cancelledData && cancelledData.length > 0) {
                return NextResponse.json({ success: true });
              }
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

    // Try to cancel in bookings table (use admin client to bypass RLS)
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("client_id", clientData.id)
      .select();

    if (error || !data || data.length === 0) {
      // Try class_bookings table
      const { data: altData, error: altError } = await supabaseAdmin
        .from("class_bookings")
        .update({ booking_status: "cancelled" })
        .eq("id", bookingId)
        .eq("client_id", clientData.id)
        .select();

      if (altError || !altData || altData.length === 0) {
        // Try class_bookings by ID only and verify ownership via customer_id
        const { data: bookingData } = await supabase
          .from("class_bookings")
          .select("customer_id")
          .eq("id", bookingId)
          .single();

        if (bookingData?.customer_id) {
          // Booking has customer_id, verify it belongs to this client via leads
          const { data: leadData } = await supabase
            .from("leads")
            .select("id")
            .eq("id", bookingData.customer_id)
            .eq("client_id", clientData.id)
            .single();

          if (leadData) {
            // Verified ownership, cancel the booking
            const { data: cancelledData, error: cancelError } =
              await supabaseAdmin
                .from("class_bookings")
                .update({ booking_status: "cancelled" })
                .eq("id", bookingId)
                .select();

            if (!cancelError && cancelledData && cancelledData.length > 0) {
              return NextResponse.json({ success: true });
            }
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
