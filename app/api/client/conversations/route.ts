import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(_request: NextRequest) {
  try {
    // Use server client to read the authenticated user (client)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS for server-side orchestration
    const admin = createAdminClient();

    // Find the client row by user_id or email
    const { data: clientRow } = await admin
      .from("clients")
      .select("*")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .limit(1)
      .single();

    if (!clientRow) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const organizationId: string = clientRow.organization_id;

    // Determine coach to assign: prefer clients.assigned_to; otherwise pick any staff in org
    let coachId: string | null = clientRow.assigned_to || null;

    if (!coachId) {
      const { data: fallbackCoach } = await admin
        .from("users")
        .select("id")
        .eq("organization_id", organizationId)
        .limit(1)
        .single();
      coachId = fallbackCoach?.id || null;
    }

    if (!coachId) {
      return NextResponse.json(
        { error: "No coach available" },
        { status: 400 },
      );
    }

    // Get or create the conversation
    // First try the RPC function
    const { data: conversationId, error: convErr } = await admin.rpc(
      "get_or_create_conversation",
      {
        p_organization_id: organizationId,
        p_client_id: clientRow.id,
        p_coach_id: coachId,
      },
    );

    if (convErr) {
      console.error("RPC function failed:", convErr);

      // Fallback: Try to manually get or create the conversation
      try {
        // First check if a conversation exists
        const { data: existingConv } = await admin
          .from("conversations")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("client_id", clientRow.id)
          .limit(1)
          .single();

        if (existingConv) {
          return NextResponse.json({ conversation_id: existingConv.id });
        }

        // Create a new conversation
        const { data: newConv, error: createErr } = await admin
          .from("conversations")
          .insert({
            organization_id: organizationId,
            client_id: clientRow.id,
            coach_id: coachId,
            status: "active",
          })
          .select("id")
          .single();

        if (createErr) {
          console.error("Failed to create conversation:", createErr);

          // Last resort: Generate a UUID for the conversation
          // This allows messages to be sent even if conversations table has issues
          const fallbackId = crypto.randomUUID();
          console.warn("Using fallback conversation ID:", fallbackId);
          return NextResponse.json({
            conversation_id: fallbackId,
            warning: "Using temporary conversation ID due to database issues",
          });
        }

        return NextResponse.json({ conversation_id: newConv.id });
      } catch (fallbackErr) {
        console.error("Fallback conversation creation failed:", fallbackErr);

        // Ultimate fallback: Generate a UUID
        const fallbackId = crypto.randomUUID();
        return NextResponse.json({
          conversation_id: fallbackId,
          warning: "Using temporary conversation ID due to database issues",
        });
      }
    }

    if (!conversationId) {
      // Generate fallback UUID if function returned null
      const fallbackId = crypto.randomUUID();
      return NextResponse.json({
        conversation_id: fallbackId,
        warning: "Function returned null, using temporary ID",
      });
    }

    return NextResponse.json({ conversation_id: conversationId });
  } catch (error) {
    console.error("Error in client conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
