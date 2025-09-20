import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth } from "@/app/lib/api/auth-check";

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    // Check if messages table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from("messages")
      .select("*")
      .limit(1);

    if (tableError) {
      console.error("Table check error:", tableError);

      // Check if it's a missing table error
      if (
        tableError.message.includes("relation") &&
        tableError.message.includes("does not exist")
      ) {
        return NextResponse.json({
          tableExists: false,
          error: "Messages table does not exist",
          solution:
            "Run the messages-table.sql migration in Supabase SQL Editor",
          migrationPath: "/supabase/messages-table.sql",
        });
      }

      return NextResponse.json({
        tableExists: "unknown",
        error: tableError.message,
        details: tableError,
      });
    }

    // Try to insert a test message
    const testMessage = {
      organization_id: userWithOrg.organizationId,
      lead_id: null, // We'll need a valid lead ID
      user_id: userWithOrg.id,
      type: "email",
      direction: "outbound",
      status: "pending",
      subject: "Test Message",
      body: "This is a test message",
      from_email: userWithOrg.email,
      to_email: "test@example.com",
    };

    // Get a lead ID for testing
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", userWithOrg.organizationId)
      .limit(1)
      .single();

    if (lead) {
      testMessage.lead_id = lead.id;

      const { data: insertTest, error: insertError } = await supabase
        .from("messages")
        .insert(testMessage)
        .select();

      if (insertError) {
        return NextResponse.json({
          tableExists: true,
          canInsert: false,
          insertError: insertError.message,
          insertDetails: insertError,
          testData: testMessage,
        });
      }

      // Clean up test message
      if (insertTest && insertTest[0]) {
        await supabase.from("messages").delete().eq("id", insertTest[0].id);
      }

      return NextResponse.json({
        tableExists: true,
        canInsert: true,
        message: "Messages table exists and is working correctly",
      });
    }

    return NextResponse.json({
      tableExists: true,
      canInsert: "unknown",
      message: "Messages table exists but no lead found for testing",
      userInfo: {
        id: userWithOrg.id,
        email: userWithOrg.email,
        organizationId: userWithOrg.organizationId,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      {
        error: "Failed to check messages table",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
