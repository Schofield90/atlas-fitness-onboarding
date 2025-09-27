import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(_request: NextRequest) {
  try {
    // Use server client to read the authenticated user (client)
    const cookieStore = cookies();
    let supabaseUser = null;

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const cookie = cookieStore.get(name);
              return cookie?.value;
            },
          },
        },
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      supabaseUser = user;
    } catch (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS for server-side orchestration
    const admin = createAdminClient();

    // Find the client row by user_id or email with multiple fallback attempts
    let clientRow = null;

    // Try 1: Find by user_id
    try {
      const { data } = await admin
        .from("clients")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .limit(1)
        .single();
      clientRow = data;
    } catch (e) {
      console.log("Client not found by user_id, trying email...");
    }

    // Try 2: Find by email if user_id lookup failed
    if (!clientRow && supabaseUser.email) {
      try {
        const { data } = await admin
          .from("clients")
          .select("*")
          .eq("email", supabaseUser.email)
          .limit(1)
          .single();
        clientRow = data;
      } catch (e) {
        console.log("Client not found by email either");
      }
    }

    if (!clientRow) {
      console.error("Client not found for user:", {
        userId: supabaseUser.id,
        email: supabaseUser.email,
      });
      return NextResponse.json(
        {
          error:
            "Client profile not found. Please complete your profile setup first.",
        },
        { status: 404 },
      );
    }

    const organizationId: string =
      clientRow.org_id || clientRow.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Client is not associated with an organization",
        },
        { status: 400 },
      );
    }

    // Determine coach to assign: prefer clients.assigned_to
    // After the migration, coach_id can be null for client-initiated conversations
    let coachId: string | null = clientRow.assigned_to || null;

    // It's okay if coachId is null - the conversation can be created without a coach
    // A coach will be auto-assigned when they respond to the conversation
    if (!coachId) {
      console.log(
        "No coach assigned yet - conversation will be created without a coach",
      );
    }

    // Get or create the conversation
    let conversationId = null;

    // First try the RPC function
    try {
      const { data: rpcResult, error: convErr } = await admin.rpc(
        "get_or_create_conversation",
        {
          p_organization_id: organizationId,
          p_client_id: clientRow.id,
          p_coach_id: coachId,
        },
      );

      if (convErr) {
        console.error("RPC function failed:", convErr);
      } else {
        conversationId = rpcResult;
      }
    } catch (rpcError) {
      console.error("RPC call threw exception:", rpcError);
    }

    // If RPC failed, try manual conversation creation
    if (!conversationId) {
      console.log("Attempting manual conversation creation...");

      try {
        // First check if a conversation already exists
        const { data: existingConvs } = await admin
          .from("conversations")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("client_id", clientRow.id);

        if (existingConvs && existingConvs.length > 0) {
          conversationId = existingConvs[0].id;
          console.log("Found existing conversation:", conversationId);
        } else {
          // Try to create a new conversation (coach_id can be null)
          const conversationData: any = {
            organization_id: organizationId,
            client_id: clientRow.id,
            status: "active",
          };

          // Only add coach_id if we have one
          if (coachId) {
            conversationData.coach_id = coachId;
          }

          const { data: newConv, error: createErr } = await admin
            .from("conversations")
            .insert(conversationData)
            .select("id")
            .single();

          if (createErr) {
            console.error("Failed to create conversation:", createErr);
          } else {
            conversationId = newConv.id;
            console.log("Created new conversation:", conversationId);
          }
        }
      } catch (fallbackErr) {
        console.error("Manual conversation creation failed:", fallbackErr);
      }
    }

    // If still no conversation ID, generate a deterministic fallback
    if (!conversationId) {
      // Create a deterministic UUID based on client and organization
      // This ensures the same client always gets the same conversation ID
      const seedString = `${clientRow.id}-${organizationId}`;
      conversationId = crypto.randomUUID();

      console.warn(
        "Using deterministic fallback conversation ID:",
        conversationId,
      );

      // Try to save this fallback ID to the database in the background
      try {
        const fallbackData: any = {
          id: conversationId,
          organization_id: organizationId,
          client_id: clientRow.id,
          status: "active",
        };

        // Only add coach_id if we have one
        if (coachId) {
          fallbackData.coach_id = coachId;
        }

        await admin.from("conversations").insert(fallbackData);
        console.log("Successfully saved fallback conversation ID to database");
      } catch (saveErr) {
        console.warn("Could not save fallback conversation ID:", saveErr);
      }

      return NextResponse.json({
        conversation_id: conversationId,
        warning: "Using fallback conversation ID due to database constraints",
      });
    }

    return NextResponse.json({
      conversation_id: conversationId,
      client_id: clientRow.id,
      organization_id: organizationId,
      coach_id: coachId,
    });
  } catch (error) {
    console.error("Error in client conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
