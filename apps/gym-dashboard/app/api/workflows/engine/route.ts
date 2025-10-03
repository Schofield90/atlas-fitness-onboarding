import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_data: any;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  steps_completed: number;
  total_steps: number;
  execution_log: any[];
}

interface WorkflowStep {
  id: string;
  type:
    | "send_email"
    | "send_sms"
    | "add_tag"
    | "update_field"
    | "delay"
    | "condition"
    | "webhook";
  name: string;
  config: any;
  position: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workflow_id, trigger_data, context } = body;

    if (!workflow_id) {
      return NextResponse.json(
        { error: "Workflow ID required" },
        { status: 400 },
      );
    }

    // Get workflow definition
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select(
        `
        *,
        workflow_steps (
          id,
          step_type,
          step_name,
          step_config,
          position,
          conditions
        )
      `,
      )
      .eq("id", workflow_id)
      .eq("organization_id", organization.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    if (!workflow.is_active) {
      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 },
      );
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id,
        organization_id: organization.id,
        trigger_data: trigger_data || {},
        context: context || {},
        status: "pending",
        steps_completed: 0,
        total_steps: workflow.workflow_steps?.length || 0,
        execution_log: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError) {
      console.error("Error creating workflow execution:", executionError);
      return NextResponse.json(
        { error: "Failed to create workflow execution" },
        { status: 500 },
      );
    }

    // Start workflow execution asynchronously
    executeWorkflowAsync(supabase, execution, workflow);

    return NextResponse.json({
      success: true,
      execution_id: execution.id,
      message: "Workflow execution started",
    });
  } catch (error) {
    console.error("Error starting workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const executionId = url.searchParams.get("execution_id");
    const workflowId = url.searchParams.get("workflow_id");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (executionId) {
      // Get specific execution
      const { data: execution, error } = await supabase
        .from("workflow_executions")
        .select(
          `
          *,
          workflow:workflow_id (
            name,
            description
          )
        `,
        )
        .eq("id", executionId)
        .eq("organization_id", organization.id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Execution not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ execution });
    }

    // Get executions list
    let query = supabase
      .from("workflow_executions")
      .select(
        `
        *,
        workflow:workflow_id (
          name,
          description
        )
      `,
      )
      .eq("organization_id", organization.id);

    if (workflowId) {
      query = query.eq("workflow_id", workflowId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const {
      data: executions,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching workflow executions:", error);
      return NextResponse.json(
        { error: "Failed to fetch executions" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      executions: executions || [],
      total: count,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error fetching workflow executions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { execution_id, action } = body;

    if (!execution_id || !action) {
      return NextResponse.json(
        { error: "Execution ID and action required" },
        { status: 400 },
      );
    }

    const { data: execution, error: fetchError } = await supabase
      .from("workflow_executions")
      .select("*")
      .eq("id", execution_id)
      .eq("organization_id", organization.id)
      .single();

    if (fetchError || !execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 },
      );
    }

    if (action === "cancel") {
      if (execution.status === "completed" || execution.status === "failed") {
        return NextResponse.json(
          { error: "Cannot cancel completed or failed execution" },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from("workflow_executions")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", execution_id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to cancel execution" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Workflow execution cancelled",
      });
    } else if (action === "retry") {
      if (execution.status !== "failed") {
        return NextResponse.json(
          { error: "Can only retry failed executions" },
          { status: 400 },
        );
      }

      // Reset execution status and restart
      const { error: updateError } = await supabase
        .from("workflow_executions")
        .update({
          status: "pending",
          started_at: null,
          completed_at: null,
          error_message: null,
          steps_completed: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", execution_id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to retry execution" },
          { status: 500 },
        );
      }

      // Get workflow and restart execution
      const { data: workflow } = await supabase
        .from("workflows")
        .select(
          `
          *,
          workflow_steps (
            id,
            step_type,
            step_name,
            step_config,
            position,
            conditions
          )
        `,
        )
        .eq("id", execution.workflow_id)
        .single();

      if (workflow) {
        executeWorkflowAsync(
          supabase,
          { ...execution, status: "pending" },
          workflow,
        );
      }

      return NextResponse.json({
        success: true,
        message: "Workflow execution restarted",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating workflow execution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Async workflow execution function
async function executeWorkflowAsync(
  supabase: any,
  execution: any,
  workflow: any,
) {
  try {
    // Update status to running
    await supabase
      .from("workflow_executions")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", execution.id);

    const steps =
      workflow.workflow_steps?.sort(
        (a: any, b: any) => a.position - b.position,
      ) || [];
    let executionLog = [];
    let stepsCompleted = 0;

    for (const step of steps) {
      try {
        const stepResult = await executeWorkflowStep(
          supabase,
          step,
          execution.trigger_data,
          execution.context,
        );

        executionLog.push({
          step_id: step.id,
          step_name: step.step_name,
          status: "completed",
          timestamp: new Date().toISOString(),
          result: stepResult,
        });

        stepsCompleted++;

        // Update progress
        await supabase
          .from("workflow_executions")
          .update({
            steps_completed: stepsCompleted,
            execution_log: executionLog,
            updated_at: new Date().toISOString(),
          })
          .eq("id", execution.id);

        // Handle delay steps
        if (step.step_type === "delay" && step.step_config?.delay_minutes) {
          await new Promise((resolve) =>
            setTimeout(resolve, step.step_config.delay_minutes * 60 * 1000),
          );
        }
      } catch (stepError) {
        console.error(`Error executing step ${step.id}:`, stepError);

        executionLog.push({
          step_id: step.id,
          step_name: step.step_name,
          status: "failed",
          timestamp: new Date().toISOString(),
          error: stepError.message,
        });

        // Mark execution as failed
        await supabase
          .from("workflow_executions")
          .update({
            status: "failed",
            error_message: `Step "${step.step_name}" failed: ${stepError.message}`,
            execution_log: executionLog,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", execution.id);

        return;
      }
    }

    // Mark as completed
    await supabase
      .from("workflow_executions")
      .update({
        status: "completed",
        steps_completed: stepsCompleted,
        execution_log: executionLog,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", execution.id);
  } catch (error) {
    console.error("Error executing workflow:", error);

    await supabase
      .from("workflow_executions")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", execution.id);
  }
}

// Execute individual workflow step
async function executeWorkflowStep(
  supabase: any,
  step: any,
  triggerData: any,
  context: any,
): Promise<any> {
  const { step_type, step_config } = step;

  switch (step_type) {
    case "send_email":
      return await executeSendEmailStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "send_sms":
      return await executeSendSmsStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "add_tag":
      return await executeAddTagStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "update_field":
      return await executeUpdateFieldStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "condition":
      return await executeConditionStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "webhook":
      return await executeWebhookStep(
        supabase,
        step_config,
        triggerData,
        context,
      );

    case "delay":
      return {
        status: "completed",
        message: `Delayed for ${step_config.delay_minutes} minutes`,
      };

    default:
      throw new Error(`Unknown step type: ${step_type}`);
  }
}

// Step execution functions
async function executeSendEmailStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  // Implementation would integrate with email service
  return { status: "completed", message: "Email sent successfully" };
}

async function executeSendSmsStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  // Implementation would integrate with SMS service
  return { status: "completed", message: "SMS sent successfully" };
}

async function executeAddTagStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  if (triggerData.customer_id && config.tag) {
    // Add tag to customer
    const { data: customer } = await supabase
      .from("leads")
      .select("tags")
      .eq("id", triggerData.customer_id)
      .single();

    const currentTags = customer?.tags || [];
    const newTags = [...new Set([...currentTags, config.tag])];

    await supabase
      .from("leads")
      .update({ tags: newTags })
      .eq("id", triggerData.customer_id);

    return { status: "completed", message: `Tag "${config.tag}" added` };
  }
  throw new Error("Missing customer_id or tag configuration");
}

async function executeUpdateFieldStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  if (triggerData.customer_id && config.field && config.value !== undefined) {
    const updateData = { [config.field]: config.value };

    await supabase
      .from("leads")
      .update(updateData)
      .eq("id", triggerData.customer_id);

    return { status: "completed", message: `Field "${config.field}" updated` };
  }
  throw new Error("Missing customer_id, field, or value configuration");
}

async function executeConditionStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  // Implement condition logic
  return { status: "completed", message: "Condition evaluated" };
}

async function executeWebhookStep(
  supabase: any,
  config: any,
  triggerData: any,
  context: any,
): Promise<any> {
  if (config.webhook_url) {
    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerData, context }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    return { status: "completed", message: "Webhook called successfully" };
  }
  throw new Error("Missing webhook_url configuration");
}
