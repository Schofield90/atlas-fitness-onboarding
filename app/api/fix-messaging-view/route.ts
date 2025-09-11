import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const results: any[] = [];

    // Test 1: Check if conversations table exists
    const { data: convData, error: convError } = await admin
      .from("conversations")
      .select("id")
      .limit(1);

    if (convError) {
      results.push({
        test: "conversations_table",
        status: "missing",
        error: convError.message,
      });

      // Try to create the conversations table
      try {
        // Create via clients table foreign key (assuming it exists)
        const { error: createError } = await admin
          .from("conversations")
          .insert({
            organization_id: "00000000-0000-0000-0000-000000000000",
            client_id: "00000000-0000-0000-0000-000000000000",
            coach_id: null,
            status: "test",
          });

        if (createError && createError.code === "42P01") {
          // Table doesn't exist
          results.push({
            test: "create_conversations_table",
            status: "table_missing",
            recommendation: "Need to create conversations table via migration",
          });
        }
      } catch (e) {
        // Expected to fail, just testing
      }
    } else {
      results.push({
        test: "conversations_table",
        status: "exists",
      });
    }

    // Test 2: Check if messages_with_user_info view exists
    const { data: viewData, error: viewError } = await admin
      .from("messages_with_user_info")
      .select("id")
      .limit(1);

    if (viewError) {
      results.push({
        test: "messages_with_user_info_view",
        status: "missing",
        error: viewError.message,
      });
    } else {
      results.push({
        test: "messages_with_user_info_view",
        status: "exists",
      });
    }

    // Test 3: Check if get_or_create_conversation function exists
    try {
      // Try to call the function with dummy UUIDs
      const testOrgId = "00000000-0000-0000-0000-000000000000";
      const testClientId = "00000000-0000-0000-0000-000000000001";
      const testCoachId = "00000000-0000-0000-0000-000000000002";

      const { data: funcData, error: funcError } = await admin.rpc(
        "get_or_create_conversation",
        {
          p_organization_id: testOrgId,
          p_client_id: testClientId,
          p_coach_id: testCoachId,
        },
      );

      if (funcError) {
        results.push({
          test: "get_or_create_conversation_function",
          status: "error",
          error: funcError.message,
        });
      } else {
        results.push({
          test: "get_or_create_conversation_function",
          status: "exists",
          returned: funcData,
        });
      }
    } catch (e) {
      results.push({
        test: "get_or_create_conversation_function",
        status: "missing",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }

    // Test 4: Check messages table columns
    const { data: msgData, error: msgError } = await admin
      .from("messages")
      .select(
        "id, conversation_id, client_id, customer_id, organization_id, channel, sender_type, sender_name, direction, type, metadata",
      )
      .limit(1);

    if (msgError) {
      results.push({
        test: "messages_columns",
        status: "error",
        error: msgError.message,
        note: "Some required columns might be missing",
      });
    } else {
      results.push({
        test: "messages_columns",
        status: "ok",
        note: "All required columns exist",
      });
    }

    // Determine if we need to apply fixes
    const needsFixes = results.some(
      (r) => r.status !== "exists" && r.status !== "ok",
    );

    return NextResponse.json({
      success: true,
      needsFixes,
      results,
      recommendation: needsFixes
        ? "Database schema needs updates. The migration file has been created at supabase/migrations/20250919_fix_messages_view_and_conversation.sql"
        : "All required database objects exist",
    });
  } catch (error) {
    console.error("Error checking database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
