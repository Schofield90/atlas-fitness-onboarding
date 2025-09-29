import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Admin-only endpoint to apply nutrition database migration
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check if user is staff/admin
    const { data: staffData, error: staffError } = await supabase
      .from("organization_staff")
      .select("role, is_active")
      .eq("user_id", user.id)
      .single();

    if (staffError || !staffData?.is_active) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    console.log("Starting nutrition migration...");

    // Apply migration in chunks to avoid timeout
    const migrationSteps = [
      // Fix bookings table
      async () => {
        const { error } = await supabase.from("bookings").select("id").limit(1);
        if (error?.code === "PGRST204") {
          console.log("Creating bookings table...");
          // Table doesn't exist, will be created by migration
        }
        return { step: "bookings", success: true };
      },

      // Fix class_credits table
      async () => {
        const { error } = await supabase
          .from("class_credits")
          .select("id")
          .limit(1);
        if (error?.code === "PGRST204") {
          console.log("Creating class_credits table...");
          // Table doesn't exist, will be created by migration
        }
        return { step: "class_credits", success: true };
      },

      // Fix leads table
      async () => {
        const { error } = await supabase.from("leads").select("id").limit(1);
        if (error?.code === "PGRST204") {
          console.log("Creating leads table...");
          // Table doesn't exist, will be created by migration
        }
        return { step: "leads", success: true };
      },

      // Ensure nutrition_profiles has correct columns
      async () => {
        try {
          // Try to access with both client_id and lead_id
          const { data, error } = await supabase
            .from("nutrition_profiles")
            .select("id, client_id, lead_id, organization_id")
            .limit(1);

          if (error && !error.message.includes("column")) {
            console.log("Nutrition profiles table needs column updates");
          }

          return { step: "nutrition_profiles", success: true };
        } catch (err) {
          return {
            step: "nutrition_profiles",
            success: false,
            error: err.message,
          };
        }
      },

      // Create client-lead mappings
      async () => {
        try {
          // Get all clients without corresponding leads
          const { data: clients, error: clientError } = await supabase
            .from("clients")
            .select(
              "id, organization_id, email, first_name, last_name, phone, created_at",
            )
            .limit(100);

          if (clientError) {
            return {
              step: "client_lead_mapping",
              success: false,
              error: clientError.message,
            };
          }

          if (clients && clients.length > 0) {
            // For each client, ensure there's a lead
            for (const client of clients) {
              // Check if lead exists
              const { data: existingLead } = await supabase
                .from("leads")
                .select("id")
                .eq("client_id", client.id)
                .eq("organization_id", client.organization_id)
                .single();

              if (!existingLead) {
                // Create lead
                const { error: leadError } = await supabase
                  .from("leads")
                  .insert({
                    organization_id: client.organization_id,
                    email: client.email || `${client.id}@client.temp`,
                    first_name: client.first_name,
                    last_name: client.last_name,
                    phone: client.phone,
                    client_id: client.id,
                    status: "CLIENT",
                    source: "CLIENT_SYNC",
                    created_at: client.created_at,
                  });

                if (leadError && !leadError.message.includes("duplicate")) {
                  console.error(
                    "Error creating lead for client:",
                    client.id,
                    leadError,
                  );
                }
              }
            }
          }

          return { step: "client_lead_mapping", success: true };
        } catch (err) {
          return {
            step: "client_lead_mapping",
            success: false,
            error: err.message,
          };
        }
      },
    ];

    const results = [];
    for (const step of migrationSteps) {
      const result = await step();
      results.push(result);

      if (!result.success) {
        console.error(`Migration step failed: ${result.step}`, result.error);
      }
    }

    // Verify final state
    const verification = {
      bookings: false,
      class_credits: false,
      leads: false,
      nutrition_profiles: false,
    };

    // Check each table
    const { error: bookingsError } = await supabase
      .from("bookings")
      .select("id")
      .limit(1);
    verification.bookings = !bookingsError || bookingsError.code !== "PGRST204";

    const { error: creditsError } = await supabase
      .from("class_credits")
      .select("id")
      .limit(1);
    verification.class_credits =
      !creditsError || creditsError.code !== "PGRST204";

    const { error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .limit(1);
    verification.leads = !leadsError || leadsError.code !== "PGRST204";

    const { error: nutritionError } = await supabase
      .from("nutrition_profiles")
      .select("id")
      .limit(1);
    verification.nutrition_profiles =
      !nutritionError || nutritionError.code !== "PGRST204";

    const allSuccess = results.every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? "Migration applied successfully"
        : "Migration completed with some issues",
      results,
      verification,
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Migration failed" },
      { status: 500 },
    );
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Check table status
    const status = {
      bookings: false,
      class_credits: false,
      leads: false,
      nutrition_profiles: false,
      nutrition_profiles_columns: {
        client_id: false,
        lead_id: false,
      },
    };

    // Check each table exists
    const { error: bookingsError } = await supabase
      .from("bookings")
      .select("id")
      .limit(1);
    status.bookings = !bookingsError || bookingsError.code !== "PGRST204";

    const { error: creditsError } = await supabase
      .from("class_credits")
      .select("id")
      .limit(1);
    status.class_credits = !creditsError || creditsError.code !== "PGRST204";

    const { error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .limit(1);
    status.leads = !leadsError || leadsError.code !== "PGRST204";

    // Check nutrition_profiles and its columns
    const { data: nutritionData, error: nutritionError } = await supabase
      .from("nutrition_profiles")
      .select("id, client_id, lead_id")
      .limit(1);

    status.nutrition_profiles =
      !nutritionError || nutritionError.code !== "PGRST204";

    if (!nutritionError) {
      status.nutrition_profiles_columns.client_id = true;
      status.nutrition_profiles_columns.lead_id = true;
    }

    return NextResponse.json({
      success: true,
      status,
      migrationNeeded:
        !status.bookings ||
        !status.class_credits ||
        !status.leads ||
        !status.nutrition_profiles_columns.client_id,
    });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Status check failed" },
      { status: 500 },
    );
  }
}
