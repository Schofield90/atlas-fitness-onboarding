import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Step 1: Check current table structure
    const { data: checkData, error: checkError } = await supabase
      .from("nutrition_profiles")
      .select("*")
      .limit(0);

    if (checkError) {
      console.log("Table might not exist, will be handled by migration");
    }

    // Step 2: Apply migration via RPC (if we have the function)
    // For now, we'll handle this at the application level

    // Step 3: Test that the table accepts client_id
    const testProfile = {
      client_id: "00000000-0000-0000-0000-000000000000", // Test UUID
      organization_id: "00000000-0000-0000-0000-000000000000",
      age: 25,
      gender: "MALE",
      height_cm: 180,
      weight_kg: 75,
      goal: "MAINTAIN",
      activity_level: "MODERATELY_ACTIVE",
      bmr: 1800,
      tdee: 2500,
      target_calories: 2500,
      protein_grams: 150,
      carbs_grams: 300,
      fat_grams: 80,
    };

    // Try to insert and immediately delete (just to test schema)
    const { error: testError } = await supabase
      .from("nutrition_profiles")
      .insert(testProfile);

    let schemaSupportsClientId = false;

    if (testError) {
      if (testError.message.includes("client_id")) {
        console.log("Schema does not support client_id yet");
      } else if (testError.code === "23503") {
        // Foreign key constraint - this is expected with test UUIDs
        schemaSupportsClientId = true;
        console.log(
          "Schema supports client_id (FK constraint triggered as expected)",
        );
      }
    } else {
      schemaSupportsClientId = true;
      // Clean up test insert
      await supabase
        .from("nutrition_profiles")
        .delete()
        .eq("client_id", "00000000-0000-0000-0000-000000000000");
    }

    return NextResponse.json({
      success: true,
      message: "Migration check complete",
      schemaSupportsClientId,
      details: {
        checkError: checkError?.message,
        testError: testError?.message,
      },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error,
      },
      { status: 500 },
    );
  }
}
