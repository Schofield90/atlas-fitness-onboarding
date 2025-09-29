import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

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

    console.log("Checking messaging schema...");

    // Check if conversations table exists
    const { data: conversationsCheck, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .limit(1);

    const hasConversationsTable =
      !convError || !convError.message?.includes("relation");

    // Check if the RPC function exists
    let hasFunctionExists = false;
    try {
      const { data: funcTest, error: funcError } = await supabaseAdmin.rpc(
        "get_or_create_conversation",
        {
          p_organization_id: "00000000-0000-0000-0000-000000000000",
          p_client_id: "00000000-0000-0000-0000-000000000000",
          p_coach_id: "00000000-0000-0000-0000-000000000000",
        },
      );
      hasFunctionExists =
        !funcError || !funcError.message?.includes("function");
    } catch (e) {
      hasFunctionExists = false;
    }

    // Check messages table columns
    const { data: messagesColumns } = await supabaseAdmin
      .rpc("get_column_info", { table_name: "messages" })
      .catch(() => ({ data: null }));

    // Check if there are any conversations
    const { count: conversationCount } = await supabaseAdmin
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .catch(() => ({ count: 0 }));

    // Check if there are any messages
    const { count: messageCount } = await supabaseAdmin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .catch(() => ({ count: 0 }));

    return NextResponse.json({
      success: true,
      schema: {
        hasConversationsTable,
        hasFunctionExists,
        conversationCount,
        messageCount,
        messagesColumns: messagesColumns || [],
      },
    });
  } catch (error) {
    console.error("Schema check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Schema check failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// Helper RPC function to get column info
// This should be created in the database if it doesn't exist
const GET_COLUMN_INFO_SQL = `
CREATE OR REPLACE FUNCTION get_column_info(table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE sql
AS $$
  SELECT column_name::text, data_type::text, is_nullable::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = $1
  ORDER BY ordinal_position;
$$;
`;
