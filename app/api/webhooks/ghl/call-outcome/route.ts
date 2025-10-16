import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * GoHighLevel Call Outcome Webhook
 *
 * This endpoint receives call outcome events from GHL automations and records them
 * in the agent performance tracking system.
 *
 * DOES NOT send any AI reply back to the customer.
 *
 * Call Outcomes:
 * - call_answered: Call was picked up by the lead
 * - call_no_answer: Call went to voicemail or wasn't answered
 * - sale_lost: Call happened but no sale was made
 *
 * Expected webhook payload:
 * {
 *   "contact_id": "ghl_contact_uuid",
 *   "agent_id": "ai_agent_uuid",
 *   "outcome": "call_answered" | "call_no_answer" | "sale_lost",
 *   "call_duration": 300,          // Optional: seconds
 *   "appointment_id": "uuid",      // Optional: GHL appointment ID
 *   "notes": "Customer interested", // Optional: call notes
 *   "metadata": {}                 // Optional: any extra data
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log(`[Call Outcome Webhook] Received:`, payload);

    const supabase = createAdminClient();

    // Extract required fields
    const contactId = payload.contact_id || payload.contactId;
    const agentId = payload.agent_id || payload.agentId;
    const outcome = payload.outcome;
    const callDuration = payload.call_duration || payload.callDuration;
    const appointmentId = payload.appointment_id || payload.appointmentId;
    const notes = payload.notes;

    if (!contactId) {
      console.error("[Call Outcome] Missing contact_id");
      return NextResponse.json(
        { error: "contact_id is required" },
        { status: 400 }
      );
    }

    if (!agentId) {
      console.error("[Call Outcome] Missing agent_id");
      return NextResponse.json(
        { error: "agent_id is required" },
        { status: 400 }
      );
    }

    if (!outcome) {
      console.error("[Call Outcome] Missing outcome");
      return NextResponse.json(
        { error: "outcome is required (call_answered, call_no_answer, or sale_lost)" },
        { status: 400 }
      );
    }

    // Validate outcome value
    const validOutcomes = ["call_answered", "call_no_answer", "sale_lost"];
    if (!validOutcomes.includes(outcome)) {
      console.error(`[Call Outcome] Invalid outcome: ${outcome}`);
      return NextResponse.json(
        { error: `outcome must be one of: ${validOutcomes.join(", ")}` },
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
      console.error("[Call Outcome] Error finding lead:", leadError);
      return NextResponse.json(
        { error: "Failed to find lead" },
        { status: 500 }
      );
    }

    if (!lead) {
      console.log(`[Call Outcome] Lead not found for contact: ${contactId}`);
      return NextResponse.json(
        {
          success: true,
          message: "Lead not found - call outcome not recorded",
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

    // Record event
    const { data: event, error: eventError } = await supabase
      .from("agent_performance_events")
      .insert({
        agent_id: agentId,
        organization_id: lead.organization_id,
        lead_id: lead.id,
        conversation_id: conversationId,
        event_type: outcome,
        event_data: {
          call_duration: callDuration,
          appointment_id: appointmentId,
          notes: notes,
          ghl_contact_id: contactId,
          recorded_at: new Date().toISOString(),
          ...payload.metadata,
        },
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("[Call Outcome] Error recording event:", eventError);
      return NextResponse.json(
        { error: "Failed to record call outcome event" },
        { status: 500 }
      );
    }

    console.log(`[Call Outcome] ✅ ${outcome} recorded for lead ${lead.id}, event ${event.id}`);

    // Return success WITHOUT triggering AI response
    return NextResponse.json({
      success: true,
      message: `Call outcome (${outcome}) recorded successfully`,
      eventId: event.id,
      leadId: lead.id,
      outcome: outcome,
    });

  } catch (error: any) {
    console.error("[Call Outcome] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
