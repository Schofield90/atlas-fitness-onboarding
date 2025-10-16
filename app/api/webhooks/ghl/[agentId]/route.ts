import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getOrchestrator } from "@/app/lib/ai-agents/orchestrator";
import { checkAgentGuardrails } from "@/app/lib/ai-agents/guardrails";
import crypto from "crypto";

/**
 * GoHighLevel Webhook Handler
 *
 * This endpoint receives webhooks from GoHighLevel workflows and triggers
 * the appropriate AI agent to respond to leads.
 *
 * GoHighLevel Webhook Headers:
 * - x-gohighlevel-signature: HMAC SHA256 signature for webhook verification
 * - x-gohighlevel-event: Event type (e.g., "InboundMessage", "ContactCreated")
 * - x-gohighlevel-webhook-id: Unique webhook delivery ID
 * - user-agent: "GHL-Webhook/1.0"
 *
 * Expected webhook payload from GHL:
 * {
 *   "contact_id": "ghl_contact_uuid",
 *   "contact_email": "lead@example.com",
 *   "contact_phone": "+1234567890",
 *   "contact_name": "John Doe",
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "message": "I'm interested in learning more about your gym",
 *   "conversation_id": "ghl_conversation_uuid",
 *   "location_id": "ghl_location_uuid",
 *   "dateAdded": "2025-10-13T10:30:00Z",
 *   "tags": ["lead", "website"],
 *   "customFields": {
 *     // Any custom fields from GHL
 *   }
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    // Extract GoHighLevel headers
    const ghlSignature = request.headers.get("x-gohighlevel-signature");
    const ghlEvent = request.headers.get("x-gohighlevel-event");
    const ghlWebhookId = request.headers.get("x-gohighlevel-webhook-id");

    console.log(`[GHL Webhook] Headers:`, {
      event: ghlEvent,
      webhookId: ghlWebhookId,
      hasSignature: !!ghlSignature,
    });

    const payload = await request.json();
    console.log(`[GHL Webhook] Received for agent: ${agentId}`, payload);

    const supabase = createAdminClient();

    // 1. Fetch the AI agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agentId)
      .eq("enabled", true)
      .single();

    if (agentError || !agent) {
      console.error(`[GHL Webhook] Agent not found or disabled: ${agentId}`);
      return NextResponse.json(
        { error: "Agent not found or disabled" },
        { status: 404 }
      );
    }

    // 2. Verify webhook signature (if configured)
    if (agent.ghl_webhook_secret && ghlSignature) {
      const isValid = verifyGHLSignature(
        JSON.stringify(payload),
        ghlSignature,
        agent.ghl_webhook_secret
      );

      if (!isValid) {
        console.error("[GHL Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
      console.log("[GHL Webhook] Signature verified ✓");
    }

    // 3. Extract contact and message data from GHL payload
    const contactId = payload.contact_id || payload.contactId;

    // Try multiple fields for message content:
    // - message.body: inbound SMS/messages (nested object)
    // - body: alternative inbound field
    // - text: alternative inbound message field
    // - messageBody: another GHL field
    // - customData.message: workflow/form submissions (generic notification)
    const message =
      (typeof payload.message === 'object' && payload.message?.body) ||
      payload.body ||
      payload.text ||
      payload.messageBody ||
      (typeof payload.message === 'string' ? payload.message : null) ||
      payload.customData?.message;

    const contactName = payload.full_name || payload.contact_name || payload.name || "Unknown";
    const contactEmail = payload.email || payload.contact_email;
    const contactPhone = payload.phone || payload.contact_phone;

    console.log("[GHL Webhook] Extracted message from:", {
      hasMessageBody: !!(typeof payload.message === 'object' && payload.message?.body),
      hasBody: !!payload.body,
      hasText: !!payload.text,
      hasMessageBodyField: !!payload.messageBody,
      hasMessageString: typeof payload.message === 'string',
      hasCustomDataMessage: !!payload.customData?.message,
      actualMessage: typeof payload.message === 'object' ? payload.message?.body : payload.message,
      finalMessage: message?.substring(0, 50) + '...',
    });

    if (!contactId || !message) {
      console.error("[GHL Webhook] Missing required fields:", { contactId, message, payload });
      return NextResponse.json(
        { error: "Missing required fields: contact_id and message" },
        { status: 400 }
      );
    }

    // 4. Find or create the lead in our system
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", agent.organization_id)
      .or(`email.eq.${contactEmail},phone.eq.${contactPhone}`)
      .maybeSingle();

    let leadId = existingLead?.id;

    if (!existingLead) {
      // Create new lead from GHL contact
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          organization_id: agent.organization_id,
          name: contactName,
          email: contactEmail || null,
          phone: contactPhone || null,
          source: "gohighlevel",
          status: "new",
          metadata: {
            ghl_contact_id: contactId,
            ghl_location_id: payload.location?.id,
            ghl_tags: payload.tags,
            custom_fields: payload.customData || {},
          },
        })
        .select()
        .single();

      if (leadError) {
        console.error("[GHL Webhook] Failed to create lead:", leadError);
        return NextResponse.json(
          { error: "Failed to create lead" },
          { status: 500 }
        );
      }

      leadId = newLead.id;
      console.log(`[GHL Webhook] Created new lead: ${leadId}`);
    } else {
      // Update existing lead with GHL metadata
      await supabase
        .from("leads")
        .update({
          metadata: {
            ghl_contact_id: contactId,
            ghl_location_id: payload.location?.id,
            ghl_tags: payload.tags,
            custom_fields: payload.customData || {},
          },
        })
        .eq("id", leadId);

      console.log(`[GHL Webhook] Updated existing lead: ${leadId}`);
    }

    // 5. Find or create conversation for this agent + lead
    const { data: existingConversation } = await supabase
      .from("ai_agent_conversations")
      .select("id")
      .eq("agent_id", agentId)
      .eq("lead_id", leadId)
      .eq("status", "active")
      .maybeSingle();

    let conversationId = existingConversation?.id;

    if (!existingConversation) {
      const { data: newConversation, error: convError } = await supabase
        .from("ai_agent_conversations")
        .insert({
          agent_id: agentId,
          organization_id: agent.organization_id,
          lead_id: leadId,
          status: "active",
          channel: "gohighlevel",
          metadata: {
            ghl_contact_id: contactId,
            ghl_location_id: payload.location?.id,
            ghl_workflow: payload.workflow,
          },
        })
        .select()
        .single();

      if (convError) {
        console.error("[GHL Webhook] Failed to create conversation:", convError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      conversationId = newConversation.id;
      console.log(`[GHL Webhook] Created new conversation: ${conversationId}`);
    }

    // 6. Check guardrails before allowing AI to respond
    console.log(`[GHL Webhook] Checking guardrails for agent ${agentId}...`);

    // Handle tags - can be either string (comma-separated) or array
    const ghlTags = Array.isArray(payload.tags)
      ? payload.tags.join(',')
      : (payload.tags || '');

    const guardrailCheck = await checkAgentGuardrails({
      agentId,
      leadId,
      conversationId,
      ghlTags,
      contactPhone,
      organizationId: agent.organization_id,
      supabase,
    });

    if (!guardrailCheck.allowed) {
      console.log(`[GHL Webhook] ⛔ Blocked by guardrail: ${guardrailCheck.reason}`);
      console.log(`[GHL Webhook] Guardrail: ${guardrailCheck.guardrailName} (${guardrailCheck.guardrailType})`);

      // Log the blocked attempt to activity log
      await supabase.from('ai_agent_activity_log').insert({
        agent_id: agentId,
        organization_id: agent.organization_id,
        action_type: 'guardrail_block',
        details: {
          guardrail_id: guardrailCheck.guardrailId,
          guardrail_name: guardrailCheck.guardrailName,
          guardrail_type: guardrailCheck.guardrailType,
          reason: guardrailCheck.reason,
          conversation_id: conversationId,
          lead_id: leadId,
          contact_phone: contactPhone,
          ghl_tags: payload.tags,
        },
        created_by: agent.created_by,
      });

      // Return success but don't send message
      return NextResponse.json({
        success: true,
        blocked: true,
        reason: guardrailCheck.reason,
        guardrail: guardrailCheck.guardrailName,
        message: "Message blocked by guardrail system",
      });
    }

    console.log(`[GHL Webhook] ✅ All guardrails passed`);

    // 7. Execute the AI agent to generate a response
    // Note: The orchestrator will handle storing both the user message and assistant response
    console.log(`[GHL Webhook] Executing agent ${agentId} for conversation ${conversationId}`);
    console.log(`[GHL Webhook] User message: "${message}"`);

    const orchestrator = getOrchestrator();
    const agentResponse = await orchestrator.executeConversationMessage({
      conversationId,
      organizationId: agent.organization_id,
      userId: agent.created_by,
      userMessage: message,
    });

    if (!agentResponse.success) {
      console.error("[GHL Webhook] Agent execution failed:", agentResponse.error);
      return NextResponse.json(
        { error: "Agent execution failed", details: agentResponse.error },
        { status: 500 }
      );
    }

    // 7. Get the AI response message (already stored by orchestrator)
    const aiMessage = agentResponse.assistantMessage?.content || "";
    console.log(`[GHL Webhook] AI response: "${aiMessage}"`);
    console.log(`[GHL Webhook] Tokens used: ${agentResponse.assistantMessage?.tokens_used || 0}`);

    // 8. Send response back to GoHighLevel via SMS (if API key configured)
    // Prefer private integration key for messaging, fallback to standard API key
    const messagingApiKey = agent.metadata?.gohighlevel_private_integration_key || agent.ghl_api_key;

    if (messagingApiKey && contactPhone) {
      try {
        await sendSMSToGHL(
          messagingApiKey,
          contactId,
          aiMessage
        );
        console.log(`[GHL Webhook] SMS sent to ${contactPhone} via GHL`);
      } catch (ghlError) {
        console.error("[GHL Webhook] Failed to send SMS via GHL:", ghlError);
        // Don't fail the webhook if GHL response fails
      }
    }

    // 9. Check if agent should schedule a follow-up
    if (agent.follow_up_config?.enabled) {
      const delayHours = agent.follow_up_config.delay_hours || 24;
      const nextRunAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

      await supabase.from("ai_agent_tasks").insert({
        agent_id: agentId,
        organization_id: agent.organization_id,
        title: `Follow up with ${contactName}`,
        description: `Automated follow-up for GHL lead from workflow: ${payload.workflow?.name}`,
        task_type: "scheduled",
        status: "pending",
        next_run_at: nextRunAt.toISOString(),
        context: {
          type: "ghl_follow_up",
          conversationId,
          leadId,
          ghl_contact_id: contactId,
          attempt: 1,
        },
      });

      console.log(`[GHL Webhook] Scheduled follow-up task for ${nextRunAt.toISOString()}`);
    }

    return NextResponse.json({
      success: true,
      conversationId,
      leadId,
      message: aiMessage,
      tokensUsed: agentResponse.assistantMessage?.tokens_used || 0,
      costUsd: agentResponse.assistantMessage?.cost_usd || 0,
    });

  } catch (error: any) {
    console.error("[GHL Webhook] Unhandled error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Send an SMS to a contact via GoHighLevel
 */
async function sendSMSToGHL(
  apiKey: string,
  contactId: string,
  message: string
): Promise<void> {
  const response = await fetch(
    `https://services.leadconnectorhq.com/conversations/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        type: "SMS",
        contactId,
        message,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GHL SMS API error: ${error}`);
  }
}

/**
 * Verify GoHighLevel webhook signature
 */
function verifyGHLSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("[GHL Webhook] Signature verification error:", error);
    return false;
  }
}

// Health check endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const supabase = createAdminClient();

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id, name, enabled")
    .eq("id", agentId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  return NextResponse.json({
    agentId: agent.id,
    agentName: agent.name,
    enabled: agent.enabled,
    webhookUrl: `${request.nextUrl.origin}/api/webhooks/ghl/${agentId}`,
    status: "operational",
  });
}
