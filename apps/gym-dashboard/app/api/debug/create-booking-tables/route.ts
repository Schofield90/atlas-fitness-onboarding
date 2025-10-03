import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user (admin check)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: userError,
        },
        { status: 401 },
      );
    }

    console.log("Creating booking system tables...");

    const results = [];

    // Create booking_links table
    const createBookingLinksQuery = `
      CREATE TABLE IF NOT EXISTS booking_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        team_ids UUID[],
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'team', 'round_robin', 'collective')),
        appointment_type_ids UUID[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    try {
      await supabase.rpc("exec_sql", { query: createBookingLinksQuery });
      results.push({ table: "booking_links", status: "created" });
    } catch (e: any) {
      results.push({
        table: "booking_links",
        status: "failed",
        error: e.message,
      });
    }

    // Create appointment_types table
    const createAppointmentTypesQuery = `
      CREATE TABLE IF NOT EXISTS appointment_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    try {
      await supabase.rpc("exec_sql", { query: createAppointmentTypesQuery });
      results.push({ table: "appointment_types", status: "created" });
    } catch (e: any) {
      results.push({
        table: "appointment_types",
        status: "failed",
        error: e.message,
      });
    }

    // Create indexes
    const indexQueries = [
      "CREATE INDEX IF NOT EXISTS idx_booking_links_organization_id ON booking_links(organization_id);",
      "CREATE INDEX IF NOT EXISTS idx_booking_links_user_id ON booking_links(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON booking_links(slug);",
      "CREATE INDEX IF NOT EXISTS idx_appointment_types_organization_id ON appointment_types(organization_id);",
    ];

    for (const indexQuery of indexQueries) {
      try {
        await supabase.rpc("exec_sql", { query: indexQuery });
        results.push({ action: "index_created", status: "success" });
      } catch (e: any) {
        results.push({ action: "index_failed", error: e.message });
      }
    }

    // Insert default appointment types
    const { error: insertError } = await supabase
      .from("appointment_types")
      .insert([
        {
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          name: "Personal Training",
          description: "One-on-one personal training session",
          duration_minutes: 60,
        },
        {
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          name: "Consultation",
          description: "Initial fitness consultation and assessment",
          duration_minutes: 30,
        },
        {
          organization_id: "63589490-8f55-4157-bd3a-e141594b748e",
          name: "Group Training",
          description: "Small group training session",
          duration_minutes: 45,
        },
      ]);

    if (insertError) {
      results.push({
        action: "insert_appointment_types",
        status: "failed",
        error: insertError.message,
      });
    } else {
      results.push({ action: "insert_appointment_types", status: "success" });
    }

    // Test table access
    const { data: testBookingLinks, error: testBookingError } = await supabase
      .from("booking_links")
      .select("id")
      .limit(1);

    const { data: testAppointmentTypes, error: testAppointmentError } =
      await supabase.from("appointment_types").select("*").limit(3);

    return NextResponse.json({
      message: "Booking system tables setup completed",
      results,
      tests: {
        booking_links: {
          accessible: !testBookingError,
          error: testBookingError?.message,
        },
        appointment_types: {
          accessible: !testAppointmentError,
          error: testAppointmentError?.message,
          count: testAppointmentTypes?.length || 0,
          sample: testAppointmentTypes,
        },
      },
    });
  } catch (error: any) {
    console.error("Error creating booking tables:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error?.message || error,
      },
      { status: 500 },
    );
  }
}
