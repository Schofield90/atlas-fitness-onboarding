import { Job } from "bullmq";
import { WorkflowExecutionEngine } from "@/app/lib/workflow/execution-engine";
import { getQueueManager } from "../queue-manager";
import { QUEUE_NAMES, JOB_TYPES } from "../config";
import { createAdminClient } from "@/app/lib/supabase/admin";

interface WorkflowExecutionJobData {
  workflowId: string;
  organizationId: string;
  triggerData: any;
  context: Record<string, any>;
}

export async function processWorkflowExecution(
  job: Job<WorkflowExecutionJobData>,
) {
  const { workflowId, organizationId, triggerData, context } = job.data;

  console.log(`Executing workflow ${workflowId} for org ${organizationId}`);

  const startTime = Date.now();
  let executionId: string | null = null;

  try {
    const supabase = createAdminClient();

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        organization_id: organizationId,
        status: "running",
        triggered_by: triggerData.type || "manual",
        trigger_data: triggerData,
        input_data: context,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError || !execution) {
      throw new Error("Failed to create execution record");
    }

    executionId = execution.id;

    // Update job with execution ID for tracking
    await job.updateProgress({
      executionId,
      status: "initialized",
    });

    // Get workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error("Workflow not found");
    }

    // Parse workflow nodes and edges
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];

    // Find trigger node
    const triggerNode = nodes.find((n: any) => n.type === "trigger");
    if (!triggerNode) {
      throw new Error("No trigger node found in workflow");
    }

    // Queue the first action nodes
    const firstActionNodes = getNextNodes(triggerNode.id, nodes, edges);

    for (const node of firstActionNodes) {
      await getQueueManager().addJob(
        QUEUE_NAMES.WORKFLOW_ACTIONS,
        JOB_TYPES.EXECUTE_NODE,
        {
          nodeId: node.id,
          node,
          workflowId,
          executionId,
          organizationId,
          context: { ...context, ...triggerData },
        },
        {
          priority: 2,
          attempts: 3,
        },
      );
    }

    // Update execution status
    await supabase
      .from("workflow_executions")
      .update({
        status: "running",
        execution_steps: [
          {
            nodeId: triggerNode.id,
            nodeType: "trigger",
            status: "completed",
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .eq("id", executionId);

    // Track execution start
    await getQueueManager().addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event: "workflow_started",
        workflowId,
        executionId,
        organizationId,
        duration: Date.now() - startTime,
      },
    );

    return {
      executionId,
      status: "running",
      nodesQueued: firstActionNodes.length,
    };
  } catch (error) {
    console.error("Error executing workflow:", error);

    // Update execution as failed
    if (executionId) {
      const supabase = createAdminClient();
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq("id", executionId);
    }

    // Track failure
    await getQueueManager().addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event: "workflow_failed",
        workflowId,
        executionId,
        organizationId,
        error: error.message,
        duration: Date.now() - startTime,
      },
    );

    throw error;
  }
}

function getNextNodes(
  currentNodeId: string,
  nodes: any[],
  edges: any[],
): any[] {
  const outgoingEdges = edges.filter((e) => e.source === currentNodeId);
  const nextNodes = outgoingEdges
    .map((edge) => nodes.find((n) => n.id === edge.target))
    .filter(Boolean);

  return nextNodes;
}
