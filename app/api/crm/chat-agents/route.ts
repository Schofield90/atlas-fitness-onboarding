import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

/**
 * GET /api/crm/chat-agents
 *
 * Fetch all AI chat agents for the user's organization
 * Includes conversation counts, lead conversions, and booking statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user, organization } = authResult.data;

    if (!organization?.id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const supabase = createAdminClient();

    // Fetch AI agents for this organization
    const { data: agents, error: agentsError } = await supabase
      .from("ai_agents")
      .select(`
        id,
        name,
        description,
        enabled,
        model,
        ghl_webhook_url,
        ghl_api_key,
        ghl_calendar_id,
        ghl_webhook_secret,
        follow_up_config,
        booking_config,
        created_at,
        updated_at
      `)
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (agentsError) {
      console.error("[Chat Agents API] Error fetching agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // For each agent, fetch statistics
    const agentsWithStats = await Promise.all(
      (agents || []).map(async (agent) => {
        // Count conversations for this agent
        const { count: conversationsCount } = await supabase
          .from("ai_agent_conversations")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", agent.id);

        // Count leads converted (status = 'appointment_scheduled' or 'converted')
        const { data: conversions } = await supabase
          .from("ai_agent_conversations")
          .select("lead_id")
          .eq("agent_id", agent.id)
          .not("lead_id", "is", null);

        const leadIds = conversions?.map((c) => c.lead_id) || [];

        let leadsConverted = 0;
        if (leadIds.length > 0) {
          const { count } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .in("id", leadIds)
            .in("status", ["appointment_scheduled", "converted"]);

          leadsConverted = count || 0;
        }

        // Count bookings made (leads with metadata.ghl_appointment_id)
        let bookingsMade = 0;
        if (leadIds.length > 0) {
          const { data: leadsWithBookings } = await supabase
            .from("leads")
            .select("metadata")
            .in("id", leadIds);

          bookingsMade = (leadsWithBookings || []).filter(
            (lead) => lead.metadata?.ghl_appointment_id
          ).length;
        }

        return {
          ...agent,
          status: agent.enabled ? "active" : "inactive",
          conversations_count: conversationsCount || 0,
          leads_converted: leadsConverted,
          bookings_made: bookingsMade,
        };
      })
    );

    return NextResponse.json({
      success: true,
      agents: agentsWithStats,
    });
  } catch (error: any) {
    console.error("[Chat Agents API] Unhandled error:", error);
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
 * POST /api/crm/chat-agents
 *
 * Create a new AI chat agent
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success || !authResult.data) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user, organization } = authResult.data;

    if (!organization?.id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      model,
      system_prompt,
      ghl_api_key,
      ghl_calendar_id,
      ghl_webhook_secret,
      follow_up_config,
      booking_config,
      enabled_tools,
    } = body;

    // Validation
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create the agent
    const { data: agent, error: createError } = await supabase
      .from("ai_agents")
      .insert({
        organization_id: organization.id,
        created_by: user.id,
        name,
        description,
        model: model || "gpt-4o-mini",
        system_prompt: system_prompt || `You are a helpful AI assistant for ${organization.name}.`,
        enabled: true,
        ghl_api_key: ghl_api_key || null,
        ghl_calendar_id: ghl_calendar_id || null,
        ghl_webhook_secret: ghl_webhook_secret || null,
        follow_up_config: follow_up_config || {
          enabled: false,
          delay_hours: 24,
          max_follow_ups: 3,
          channels: ["email", "sms"],
        },
        booking_config: booking_config || {
          enabled: false,
          auto_book: false,
          confirmation_required: true,
        },
        enabled_tools: enabled_tools || [],
      })
      .select()
      .single();

    if (createError) {
      console.error("[Chat Agents API] Error creating agent:", createError);
      return NextResponse.json(
        { error: "Failed to create agent" },
        { status: 500 }
      );
    }

    // Generate webhook URL
    const webhookUrl = `${request.nextUrl.origin}/api/webhooks/ghl/${agent.id}`;

    // Update agent with webhook URL
    await supabase
      .from("ai_agents")
      .update({ ghl_webhook_url: webhookUrl })
      .eq("id", agent.id);

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        ghl_webhook_url: webhookUrl,
        status: "active",
        conversations_count: 0,
        leads_converted: 0,
        bookings_made: 0,
      },
    });
  } catch (error: any) {
    console.error("[Chat Agents API] Unhandled error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
