import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * GoHighLevel Sale Event Webhook
 *
 * This endpoint receives sale events from GHL automations (e.g., "28 day purchase")
 * and records them in the agent performance tracking system.
 *
 * DOES NOT send any AI reply back to the customer.
 *
 * Expected webhook payload:
 * {
 *   "contact_id": "ghl_contact_uuid",
 *   "agent_id": "ai_agent_uuid",  // Pass in custom data
 *   "sale_amount": 1200,           // Optional: sale value
 *   "product_name": "28 Day Challenge",  // Optional: what they purchased
 *   "metadata": {}                 // Optional: any extra data
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log(`[Sale Event Webhook] Received:`, payload);

    const supabase = createAdminClient();

    // Extract required fields
    const contactId = payload.contact_id || payload.contactId;
    const agentId = payload.agent_id || payload.agentId;
    const saleAmount = payload.sale_amount || payload.saleAmount;
    const productName = payload.product_name || payload.productName;

    if (!contactId) {
      console.error("[Sale Event] Missing contact_id");
      return NextResponse.json(
        { error: "contact_id is required" },
        { status: 400 }
      );
    }

    if (!agentId) {
      console.error("[Sale Event] Missing agent_id");
      return NextResponse.json(
        { error: "agent_id is required" },
        { status: 400 }
      );
    }

    // Find the lead by GHL contact ID
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, organization_id, conversation_id")
      .eq("metadata->>ghl_contact_id", contactId)
      .maybeSingle();

    if (leadError) {
      console.error("[Sale Event] Error finding lead:", leadError);
      return NextResponse.json(
        { error: "Failed to find lead" },
        { status: 500 }
      );
    }

    if (!lead) {
      console.log(`[Sale Event] Lead not found for contact: ${contactId}`);
      return NextResponse.json(
        {
          success: true,
          message: "Lead not found - sale event not recorded",
          warning: "Contact may not have started a conversation with AI agent yet"
        },
        { status: 200 }
      );
    }

    // Get conversation ID (try from lead first, then find latest conversation)
    let conversationId = lead.conversation_id;

    if (!conversationId) {
      const { data: conversation } = await supabase
        .from("ai_agent_conversations")
        .select("id")
        .eq("agent_id", agentId)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      conversationId = conversation?.id;
    }

    // Record sale_made event
    const { data: event, error: eventError } = await supabase
      .from("agent_performance_events")
      .insert({
        agent_id: agentId,
        organization_id: lead.organization_id,
        lead_id: lead.id,
        conversation_id: conversationId,
        event_type: "sale_made",
        event_data: {
          sale_amount: saleAmount,
          product_name: productName,
          ghl_contact_id: contactId,
          recorded_at: new Date().toISOString(),
          ...payload.metadata,
        },
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("[Sale Event] Error recording event:", eventError);
      return NextResponse.json(
        { error: "Failed to record sale event" },
        { status: 500 }
      );
    }

    console.log(`[Sale Event] ✅ Sale recorded for lead ${lead.id}, event ${event.id}`);

    // Return success WITHOUT triggering AI response
    return NextResponse.json({
      success: true,
      message: "Sale event recorded successfully",
      eventId: event.id,
      leadId: lead.id,
    });

  } catch (error: any) {
    console.error("[Sale Event] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
