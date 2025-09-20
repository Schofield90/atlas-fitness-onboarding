import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    // Use admin client to bypass RLS
    const adminSupabase = await createAdminClient();
    const regularSupabase = await createClient();

    // Test 1: Direct booking count
    const { data: directCount, error: countError } = await adminSupabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq(
        "class_session_id",
        classId || "00000000-0000-0000-0000-000000000000",
      );

    // Test 2: Get bookings with admin client
    const { data: adminBookings, error: adminError } = await adminSupabase
      .from("bookings")
      .select("*")
      .eq(
        "class_session_id",
        classId || "00000000-0000-0000-0000-000000000000",
      );

    // Test 3: Get bookings with regular client (RLS applied)
    const { data: regularBookings, error: regularError } = await regularSupabase
      .from("bookings")
      .select("*")
      .eq(
        "class_session_id",
        classId || "00000000-0000-0000-0000-000000000000",
      );

    // Test 4: Get class with bookings using admin
    const { data: classWithBookingsAdmin } = await adminSupabase
      .from("class_sessions")
      .select(
        `
        *,
        bookings(*)
      `,
      )
      .eq("id", classId || "00000000-0000-0000-0000-000000000000")
      .single();

    // Test 5: Get class with bookings using regular client
    const { data: classWithBookingsRegular } = await regularSupabase
      .from("class_sessions")
      .select(
        `
        *,
        bookings(*)
      `,
      )
      .eq("id", classId || "00000000-0000-0000-0000-000000000000")
      .single();

    // Test 6: Check current user context
    const {
      data: { user },
    } = await regularSupabase.auth.getUser();

    return NextResponse.json({
      classId,
      tests: {
        directBookingCount: directCount,
        adminBookings: {
          count: adminBookings?.length || 0,
          data: adminBookings,
          error: adminError,
        },
        regularBookings: {
          count: regularBookings?.length || 0,
          data: regularBookings,
          error: regularError,
        },
        classWithBookingsAdmin: {
          bookingsCount: classWithBookingsAdmin?.bookings?.length || 0,
          data: classWithBookingsAdmin,
        },
        classWithBookingsRegular: {
          bookingsCount: classWithBookingsRegular?.bookings?.length || 0,
          data: classWithBookingsRegular,
        },
        currentUser: user
          ? {
              id: user.id,
              email: user.email,
            }
          : null,
      },
      diagnosis: {
        rlsBlockingBookings:
          (adminBookings?.length || 0) > (regularBookings?.length || 0),
        bookingsExist: (adminBookings?.length || 0) > 0,
        apiCanSeeBookings:
          (classWithBookingsRegular?.bookings?.length || 0) > 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
