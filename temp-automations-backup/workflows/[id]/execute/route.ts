import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { WorkflowExecutor } from "@/app/lib/automation/execution/executor";
import { AutomationInputValidator } from "@/app/lib/automation/security/input-validator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();
    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate and sanitize input data
    const validationResult = AutomationInputValidator.validateTriggerData(
      body,
      organizationId,
    );

    if (!validationResult.isValid) {
      console.error("Input validation failed:", validationResult.errors);
      return NextResponse.json(
        {
          error: "Invalid input data",
          details: validationResult.errors,
        },
        { status: 400 },
      );
    }

    // Log warnings for monitoring
    if (validationResult.warnings.length > 0) {
      console.warn("Input validation warnings:", validationResult.warnings);
    }

    const sanitizedBody = validationResult.sanitizedData;
    const supabase = await createClient();

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    if (workflow.status !== "active") {
      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 },
      );
    }

    // Create execution record
    const adminSupabase = createAdminClient();
    const { data: execution, error: execError } = await adminSupabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflow.id,
        organization_id: organizationId,
        status: "running",
        input_data: sanitizedBody.inputData || {},
        triggered_by: "manual",
        trigger_data: sanitizedBody.triggerData || {},
      })
      .select()
      .single();

    if (execError || !execution) {
      console.error("Error creating execution:", execError);
      return NextResponse.json(
        { error: "Failed to create execution" },
        { status: 500 },
      );
    }

    // Execute workflow asynchronously
    const executor = new WorkflowExecutor(workflow, execution.id);
    executor
      .execute(sanitizedBody.inputData || {})
      .then(async (result) => {
        // Update execution with results
        await adminSupabase
          .from("workflow_executions")
          .update({
            status: result.success ? "completed" : "failed",
            completed_at: new Date().toISOString(),
            output_data: result.output || {},
            error_message: result.error,
            execution_steps: result.steps || [],
          })
          .eq("id", execution.id);

        // Update workflow stats
        await adminSupabase
          .from("workflows")
          .update({
            total_executions: workflow.total_executions + 1,
            successful_executions: result.success
              ? workflow.successful_executions + 1
              : workflow.successful_executions,
            failed_executions: !result.success
              ? workflow.failed_executions + 1
              : workflow.failed_executions,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", workflow.id);
      })
      .catch(async (error) => {
        // Handle execution errors
        console.error("Workflow execution error:", error);
        await adminSupabase
          .from("workflow_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error.message || "Unknown error",
          })
          .eq("id", execution.id);
      });

    return NextResponse.json({
      executionId: execution.id,
      status: "started",
      message: "Workflow execution started",
    });
  } catch (error) {
    console.error(
      "Error in POST /api/automations/workflows/[id]/execute:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
