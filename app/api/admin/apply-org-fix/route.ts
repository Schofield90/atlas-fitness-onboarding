import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    // Check for admin token in query params for simple auth
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    // Simple token check - in production, use proper auth
    if (token !== "fix-org-schema-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log("Starting organizations table fix...");

    // Test current table structure
    const { data: testData, error: testError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, plan, settings, metadata")
      .limit(1);

    if (testError) {
      console.error("Error accessing organizations table:", testError);
    }

    // Try to insert a test organization to verify the schema
    const testOrgData = {
      name: "Test Org Schema Check",
      slug: "test-org-schema-check-" + Date.now(),
      plan: "starter",
      settings: {
        type: "gym",
        features: {
          gym: true,
          coaching: false,
        },
      },
      metadata: {
        created_by: "schema-test",
        owner_id: "schema-test",
      },
    };

    const { data: insertTest, error: insertError } = await supabaseAdmin
      .from("organizations")
      .insert(testOrgData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert test error:", insertError);

      // If the error mentions missing columns, the schema cache is stale
      if (
        insertError.message.includes("column") ||
        insertError.code === "42703"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Schema cache is stale",
            message:
              "The Supabase PostgREST schema cache needs to be refreshed manually.",
            instructions: [
              "1. Go to your Supabase Dashboard",
              "2. Navigate to Project Settings > API",
              "3. Click the 'Reload Schema' button",
              "4. Wait 30 seconds and try again",
            ],
            technicalDetails: {
              error: insertError.message,
              code: insertError.code,
            },
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          code: insertError.code,
        },
        { status: 500 },
      );
    }

    // Clean up test organization
    if (insertTest) {
      await supabaseAdmin
        .from("organizations")
        .delete()
        .eq("id", insertTest.id);
    }

    return NextResponse.json({
      success: true,
      message: "Organizations table schema is correct!",
      details:
        "The table accepts data in the expected format with settings and metadata as JSONB columns.",
    });
  } catch (error: any) {
    console.error("Error in organization fix:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
