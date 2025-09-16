import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();
    const body = await request.json();

    const {
      leadId,
      previousScore,
      newScore,
      changeReason,
      triggerAutomations = true,
    } = body;

    if (!leadId || typeof newScore !== "number") {
      return NextResponse.json(
        {
          error: "Lead ID and new score are required",
        },
        { status: 400 },
      );
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const triggeredAutomations = [];

    if (triggerAutomations) {
      // Check for score-based automation triggers
      const automations = await checkScoringAutomations(
        supabase,
        userWithOrg.organizationId,
        lead,
        previousScore,
        newScore,
      );

      for (const automation of automations) {
        try {
          const result = await executeAutomation(
            supabase,
            automation,
            lead,
            userWithOrg.organizationId,
          );
          triggeredAutomations.push({
            automationId: automation.id,
            automationName: automation.name,
            result,
            success: true,
          });
        } catch (error) {
          triggeredAutomations.push({
            automationId: automation.id,
            automationName: automation.name,
            error: error.message,
            success: false,
          });
        }
      }
    }

    // Send webhook notifications if configured
    await sendScoringWebhooks(supabase, userWithOrg.organizationId, {
      leadId,
      lead,
      previousScore,
      newScore,
      changeReason,
      triggeredAutomations,
    });

    return NextResponse.json({
      success: true,
      leadId,
      previousScore,
      newScore,
      scoreChange: newScore - (previousScore || 0),
      triggeredAutomations,
      changeReason,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // Get scoring automation rules
    let query = supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .eq("is_active", true);

    if (type === "scoring") {
      query = query.like("trigger_config->trigger_type", "%lead_score%");
    }

    const { data: automations, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch automations" },
        { status: 500 },
      );
    }

    // Get recent automation executions
    const { data: recentExecutions } = await supabase
      .from("workflow_executions")
      .select(
        `
        *,
        workflows (name)
      `,
      )
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      automations: automations || [],
      recentExecutions: recentExecutions || [],
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function checkScoringAutomations(
  supabase: any,
  organizationId: string,
  lead: any,
  previousScore: number,
  newScore: number,
) {
  try {
    // Get active workflows with lead scoring triggers
    const { data: workflows } = await supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!workflows) return [];

    const triggeredWorkflows = [];

    for (const workflow of workflows) {
      const triggerConfig = workflow.trigger_config || {};

      // Check different trigger types
      if (shouldTriggerWorkflow(triggerConfig, lead, previousScore, newScore)) {
        triggeredWorkflows.push(workflow);
      }
    }

    return triggeredWorkflows;
  } catch (error) {
    console.error("Error checking scoring automations:", error);
    return [];
  }
}

function shouldTriggerWorkflow(
  triggerConfig: any,
  lead: any,
  previousScore: number,
  newScore: number,
): boolean {
  const { trigger_type, conditions } = triggerConfig;

  if (!trigger_type || !trigger_type.includes("lead_score")) {
    return false;
  }

  // Score threshold triggers
  if (trigger_type === "lead_score_threshold") {
    const threshold = conditions?.threshold || 80;
    const direction = conditions?.direction || "above"; // 'above', 'below', 'crosses'

    switch (direction) {
      case "above":
        return newScore >= threshold && previousScore < threshold;
      case "below":
        return newScore < threshold && previousScore >= threshold;
      case "crosses":
        return (
          (newScore >= threshold && previousScore < threshold) ||
          (newScore < threshold && previousScore >= threshold)
        );
      default:
        return false;
    }
  }

  // Score change triggers
  if (trigger_type === "lead_score_change") {
    const minChange = conditions?.minChange || 10;
    const direction = conditions?.direction || "any"; // 'increase', 'decrease', 'any'
    const scoreChange = newScore - previousScore;

    switch (direction) {
      case "increase":
        return scoreChange >= minChange;
      case "decrease":
        return scoreChange <= -minChange;
      case "any":
        return Math.abs(scoreChange) >= minChange;
      default:
        return false;
    }
  }

  // Hot lead triggers
  if (trigger_type === "lead_became_hot") {
    return newScore >= 80 && previousScore < 80;
  }

  // Cold lead triggers
  if (trigger_type === "lead_became_cold") {
    return newScore < 40 && previousScore >= 40;
  }

  return false;
}

async function executeAutomation(
  supabase: any,
  workflow: any,
  lead: any,
  organizationId: string,
) {
  const actions = workflow.actions || [];
  const results = [];

  for (const action of actions) {
    try {
      let result;

      switch (action.type) {
        case "send_email":
          result = await sendAutomationEmail(
            supabase,
            action,
            lead,
            organizationId,
          );
          break;

        case "send_sms":
          result = await sendAutomationSMS(action, lead);
          break;

        case "create_task":
          result = await createAutomationTask(
            supabase,
            action,
            lead,
            organizationId,
          );
          break;

        case "assign_to_user":
          result = await assignLeadToUser(
            supabase,
            action,
            lead.id,
            organizationId,
          );
          break;

        case "add_tag":
          result = await addTagToLead(
            supabase,
            action,
            lead.id,
            organizationId,
          );
          break;

        case "update_status":
          result = await updateLeadStatus(
            supabase,
            action,
            lead.id,
            organizationId,
          );
          break;

        case "webhook":
          result = await sendWebhook(action, { lead, workflow });
          break;

        default:
          result = {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }

      results.push({
        action: action.type,
        success: result.success,
        details: result,
      });
    } catch (error) {
      results.push({
        action: action.type,
        success: false,
        error: error.message,
      });
    }
  }

  // Record workflow execution
  await supabase.from("workflow_executions").insert({
    organization_id: organizationId,
    workflow_id: workflow.id,
    lead_id: lead.id,
    status: results.every((r) => r.success) ? "completed" : "failed",
    results: results,
    execution_metadata: {
      triggered_by: "lead_scoring",
      lead_score: lead.lead_score,
    },
  });

  return results;
}

async function sendAutomationEmail(
  supabase: any,
  action: any,
  lead: any,
  organizationId: string,
) {
  // Implementation would integrate with email service
  // For now, return a placeholder
  return {
    success: true,
    message: `Email automation triggered for ${lead.email}`,
    templateId: action.templateId,
  };
}

async function sendAutomationSMS(action: any, lead: any) {
  // Implementation would integrate with SMS service
  return {
    success: true,
    message: `SMS automation triggered for ${lead.phone}`,
    content: action.content,
  };
}

async function createAutomationTask(
  supabase: any,
  action: any,
  lead: any,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      title: action.title || `Follow up with ${lead.name}`,
      description:
        action.description || `Lead score changed - follow up required`,
      priority: action.priority || "medium",
      assigned_to: action.assigned_to,
      lead_id: lead.id,
      due_date:
        action.due_date ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  return {
    success: !error,
    taskId: data?.id,
    error: error?.message,
  };
}

async function assignLeadToUser(
  supabase: any,
  action: any,
  leadId: string,
  organizationId: string,
) {
  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: action.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  return {
    success: !error,
    userId: action.userId,
    error: error?.message,
  };
}

async function addTagToLead(
  supabase: any,
  action: any,
  leadId: string,
  organizationId: string,
) {
  const { error } = await supabase.from("lead_tags").insert({
    lead_id: leadId,
    tag_id: action.tagId,
  });

  return {
    success: !error,
    tagId: action.tagId,
    error: error?.message,
  };
}

async function updateLeadStatus(
  supabase: any,
  action: any,
  leadId: string,
  organizationId: string,
) {
  const { error } = await supabase
    .from("leads")
    .update({
      status: action.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  return {
    success: !error,
    newStatus: action.status,
    error: error?.message,
  };
}

async function sendWebhook(action: any, data: any) {
  try {
    const response = await fetch(action.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(action.headers || {}),
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        trigger: "lead_scoring_automation",
      }),
    });

    return {
      success: response.ok,
      status: response.status,
      url: action.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      url: action.url,
    };
  }
}

async function sendScoringWebhooks(
  supabase: any,
  organizationId: string,
  data: any,
) {
  try {
    // Get webhook configurations for this organization
    const { data: webhooks } = await supabase
      .from("webhook_configurations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("event_type", "lead_score_changed")
      .eq("is_active", true);

    if (!webhooks || webhooks.length === 0) return;

    // Send webhooks
    const promises = webhooks.map((webhook) =>
      fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhook.secret || "",
          ...(webhook.headers || {}),
        },
        body: JSON.stringify({
          event: "lead_score_changed",
          data,
          timestamp: new Date().toISOString(),
          organizationId,
        }),
      }).catch((error) => console.error("Webhook failed:", error)),
    );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error("Error sending scoring webhooks:", error);
  }
}
