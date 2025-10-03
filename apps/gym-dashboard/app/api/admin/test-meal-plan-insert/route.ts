import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    console.log("Testing simple meal plan insert...");

    // Test 1: Check if meal_data column exists
    const { data: columnTest, error: columnError } = await supabaseAdmin
      .from("meal_plans")
      .select("meal_data")
      .limit(1);

    const hasMealDataColumn =
      !columnError || !columnError.message?.includes("column");

    // Test 2: Get a nutrition profile to use
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("nutrition_profiles")
      .select("id, organization_id")
      .limit(1);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: false,
        message:
          "No nutrition profiles found - create a nutrition profile first",
        hasMealDataColumn,
      });
    }

    const profile = profiles[0];

    // First, let's check what the clients table expects
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .limit(1);

    // If no clients exist, try to create one or find an alternative
    let clientId = null;

    if (clients && clients.length > 0) {
      clientId = clients[0].id;
      console.log("Found existing client:", clientId);
    } else {
      // Check if we can use NULL for client_id or if we need to create a client
      console.log("No clients found, checking if client_id can be null...");

      // Try getting a user/profile that might work
      const { data: users } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .limit(1);

      if (users && users.length > 0) {
        // Try to find if this user exists in clients table
        const { data: userClient } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("id", users[0].id)
          .single();

        if (userClient) {
          clientId = userClient.id;
          console.log("Found user in clients table:", clientId);
        } else {
          // Create a client record if possible
          console.log(
            "Attempting to create client record for user:",
            users[0].id,
          );
          const { data: newClient, error: createError } = await supabaseAdmin
            .from("clients")
            .insert({
              id: users[0].id,
              organization_id: profile.organization_id,
            })
            .select()
            .single();

          if (newClient) {
            clientId = newClient.id;
            console.log("Created new client:", clientId);
          } else if (createError) {
            console.log("Failed to create client:", createError.message);
            // Try without client_id (it might be nullable)
            clientId = null;
          }
        }
      }
    }

    // Test 3: Try to insert a simple meal plan - using correct column names
    const testDate = new Date().toISOString().split("T")[0];

    const testPlan: any = {
      profile_id: profile.id, // Changed from nutrition_profile_id
      organization_id: profile.organization_id,
      name: `Test Plan ${Date.now()}`,
      meal_data: {
        test: true,
        created: new Date().toISOString(),
      },
      status: "active", // Changed from is_active
      total_calories: 2000, // Changed from daily_calories
      total_protein: 150, // Changed from daily_protein
      total_carbs: 250, // Changed from daily_carbs
      total_fat: 67, // Changed from daily_fat
      start_date: testDate,
      end_date: testDate,
    };

    // Only add client_id if we have one
    if (clientId) {
      testPlan.client_id = clientId;
    }

    console.log("Attempting to insert:", JSON.stringify(testPlan, null, 2));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("meal_plans")
      .insert(testPlan)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        success: false,
        message: "Failed to insert meal plan",
        error: {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          details: insertError.details,
        },
        testData: testPlan,
        hasMealDataColumn,
      });
    }

    // Clean up test data
    if (inserted) {
      await supabaseAdmin.from("meal_plans").delete().eq("id", inserted.id);
    }

    return NextResponse.json({
      success: true,
      message: "Meal plan insert successful!",
      insertedId: inserted.id,
      hasMealDataColumn,
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
