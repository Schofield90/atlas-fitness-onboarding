import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    // Get client info
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id, organization_id")
      .eq("user_id", user.id)
      .single();

    if (clientError || !clientData) {
      // Try by email
      const { data: clientByEmail, error: emailError } = await supabase
        .from("clients")
        .select("id, organization_id")
        .eq("email", user.email)
        .single();

      if (emailError || !clientByEmail) {
        return NextResponse.json(
          { error: "Client profile not found" },
          { status: 404 },
        );
      }

      // Fetch bookings for this client
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          class_sessions (
            *,
            programs (
              name,
              description
            )
          )
        `,
        )
        .eq("client_id", clientByEmail.id)
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        return NextResponse.json(
          { error: "Failed to fetch bookings" },
          { status: 500 },
        );
      }

      return NextResponse.json({ bookings: bookings || [] });
    }

    // Fetch bookings for this client
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        `
        *,
        class_sessions (
          *,
          programs (
            name,
            description
          )
        )
      `,
      )
      .eq("client_id", clientData.id)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error("Error in GET /api/client-bookings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
