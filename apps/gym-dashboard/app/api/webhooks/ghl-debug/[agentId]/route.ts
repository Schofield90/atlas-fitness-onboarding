import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Debug webhook to log exactly what GoHighLevel sends
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const payload = await request.json();

    // Log everything
    console.log("=== GHL WEBHOOK DEBUG ===");
    console.log("Agent ID:", agentId);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("========================");

    const supabase = createAdminClient();

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.error("Agent lookup failed:", agentError);
      return NextResponse.json({
        error: "Agent not found",
        agentId,
        details: agentError,
      }, { status: 404 });
    }

    console.log("Agent found:", {
      id: agent.id,
      name: agent.name,
      organization_id: agent.organization_id,
    });

    // Try to find or create lead
    const { data: existingLead, error: leadLookupError } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", agent.organization_id)
      .or(`email.eq.${payload.contact_email},phone.eq.${payload.contact_phone}`)
      .maybeSingle();

    console.log("Lead lookup:", {
      found: !!existingLead,
      error: leadLookupError,
      leadId: existingLead?.id,
    });

    let leadId = existingLead?.id;

    if (!existingLead) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          organization_id: agent.organization_id,
          name: payload.contact_name || "Unknown",
          email: payload.contact_email || null,
          phone: payload.contact_phone || null,
          source: "gohighlevel",
          status: "new",
          metadata: {
            ghl_contact_id: payload.contact_id,
            ghl_conversation_id: payload.conversation_id,
          },
        })
        .select()
        .single();

      console.log("Lead creation:", {
        success: !!newLead,
        error: leadError,
        leadId: newLead?.id,
      });

      if (leadError) {
        return NextResponse.json({
          error: "Failed to create lead",
          details: leadError,
        }, { status: 500 });
      }

      leadId = newLead.id;
    }

    // Check if ai_agent_conversations table exists
    const { data: conversationTest, error: conversationTestError } = await supabase
      .from("ai_agent_conversations")
      .select("id")
      .limit(1);

    console.log("Conversations table check:", {
      exists: !conversationTestError,
      error: conversationTestError,
    });

    if (conversationTestError) {
      return NextResponse.json({
        error: "Conversations table not found",
        details: conversationTestError,
        suggestion: "Run database migration to create ai_agent_conversations table",
      }, { status: 500 });
    }

    // Try to create conversation
    const { data: newConversation, error: convError } = await supabase
      .from("ai_agent_conversations")
      .insert({
        agent_id: agentId,
        organization_id: agent.organization_id,
        lead_id: leadId,
        status: "active",
        channel: "gohighlevel",
        metadata: {
          ghl_conversation_id: payload.conversation_id,
        },
      })
      .select()
      .single();

    console.log("Conversation creation:", {
      success: !!newConversation,
      error: convError,
      conversationId: newConversation?.id,
    });

    if (convError) {
      return NextResponse.json({
        error: "Failed to create conversation",
        details: convError,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      debug: {
        agentId,
        leadId,
        conversationId: newConversation.id,
        payload,
      },
    });

  } catch (error: any) {
    console.error("Debug webhook error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  return NextResponse.json({
    message: "Debug webhook endpoint",
    agentId: params.agentId,
    instructions: "Send POST request with GHL payload to test",
  });
}
