import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function DELETE(request: Request) {
  try {
    const { classSessionId, customerId } = await request.json();

    if (!classSessionId || !customerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Try admin client first, fall back to regular client
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client for removing attendee");
    } catch (adminError) {
      console.log("Admin client not available, using regular server client");
      supabase = createClient();
    }

    // Delete the booking from class_bookings table
    const { error } = await supabase.from("class_bookings").delete().match({
      class_session_id: classSessionId,
      customer_id: customerId,
    });

    let bookingDeleted = !error;

    if (error) {
      console.error("Error removing attendee:", error);

      // Try with client_id if customer_id fails
      const { error: clientError } = await supabase
        .from("class_bookings")
        .delete()
        .match({
          class_session_id: classSessionId,
          client_id: customerId,
        });

      if (clientError) {
        console.error("Error removing attendee with client_id:", clientError);
        return NextResponse.json(
          { error: clientError.message },
          { status: 400 },
        );
      }
      bookingDeleted = true;
    }

    // Update the current_bookings count in class_sessions if booking was deleted
    if (bookingDeleted) {
      const { data: currentSession } = await supabase
        .from("class_sessions")
        .select("current_bookings")
        .eq("id", classSessionId)
        .single();

      const newBookingCount = Math.max(
        (currentSession?.current_bookings || 1) - 1,
        0,
      );

      await supabase
        .from("class_sessions")
        .update({ current_bookings: newBookingCount })
        .eq("id", classSessionId);

      console.log("Updated booking count to:", newBookingCount);
    }

    return NextResponse.json({
      success: true,
      message: "Attendee removed successfully",
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
