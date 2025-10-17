/**
 * API Endpoint: Execute AI Agent from Workflow
 * POST /api/workflows/actions/execute-agent
 *
 * Allows workflows to execute AI agent tasks as part of automation flows
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  getWorkflowAgentExecutor,
  type WorkflowAgentTaskParams,
} from "@/lib/ai-agents/workflow-integration";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for AI processing

interface ExecuteAgentRequest {
  workflowId: string;
  stepId: string;
  executionId: string;
  agentId: string;
  prompt: string;
  context: Record<string, any>;
}

interface ExecuteAgentResponse {
  success: boolean;
  result?: any;
  cost?: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costBaseCents: number;
    costBilledCents: number;
    markupPercentage: number;
  };
  executionTimeMs?: number;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ExecuteAgentResponse>> {
  const startTime = Date.now();

  try {
    // 1. Parse and validate request body
    const body: ExecuteAgentRequest = await request.json();

    const { workflowId, stepId, executionId, agentId, prompt, context } = body;

    // Validate required fields
    if (!workflowId || !stepId || !executionId || !agentId || !prompt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: workflowId, stepId, executionId, agentId, prompt",
        },
        { status: 400 },
      );
    }

    // 2. Extract organization ID from context or workflow
    let organizationId: string;

    if (context?.organizationId) {
      organizationId = context.organizationId;
    } else {
      // Fetch from workflow
      const supabase = createAdminClient();
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .select("organization_id")
        .eq("id", workflowId)
        .single();

      if (workflowError || !workflow) {
        return NextResponse.json(
          {
            success: false,
            error: "Workflow not found",
          },
          { status: 404 },
        );
      }

      organizationId = workflow.organization_id;
    }

    // 3. Validate workflow belongs to organization
    const supabase = createAdminClient();
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("id, organization_id, name")
      .eq("id", workflowId)
      .eq("organization_id", organizationId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        {
          success: false,
          error: "Workflow not found or access denied",
        },
        { status: 403 },
      );
    }

    // 4. Validate agent belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("id, organization_id, name, role")
      .eq("id", agentId)
      .eq("organization_id", organizationId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        {
          success: false,
          error: "Agent not found or access denied",
        },
        { status: 403 },
      );
    }

    // 5. Execute agent task via workflow executor
    const executor = getWorkflowAgentExecutor();

    const params: WorkflowAgentTaskParams = {
      workflowId,
      stepId,
      executionId,
      organizationId,
      agentId,
      prompt,
      context: context || {},
    };

    const result = await executor.executeFromWorkflow(params);

    // 6. Return result
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Agent execution failed",
          executionTimeMs: result.executionTimeMs,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: result.result,
        cost: result.cost,
        executionTimeMs: result.executionTimeMs,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error executing agent from workflow:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to retrieve agent execution logs for a workflow
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const executionId = searchParams.get("executionId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: "workflowId parameter required",
        },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Build query
    let query = supabase
      .from("ai_agent_activity_log")
      .select("*")
      .eq("action_type", "workflow_agent_execution")
      .contains("action_data", { workflow_id: workflowId })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by specific execution if provided
    if (executionId) {
      query = query.contains("action_data", { execution_id: executionId });
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch execution logs",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: logs || [],
        meta: {
          count: logs?.length || 0,
          workflow_id: workflowId,
          execution_id: executionId || "all",
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching agent execution logs:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
