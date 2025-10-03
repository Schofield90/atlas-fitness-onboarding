import { Job } from "bullmq";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { WorkflowExecutionEngine } from "@/app/lib/workflow/execution-engine";
import { getQueueManager } from "../queue-manager";
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES } from "../enhanced-config";

interface TriggerJobData {
  triggerType: string;
  triggerData: any;
  organizationId: string;
  metadata?: Record<string, any>;
}

export async function processWorkflowTrigger(job: Job<TriggerJobData>) {
  const { triggerType, triggerData, organizationId, metadata } = job.data;

  console.log(
    `Processing workflow trigger: ${triggerType} for org ${organizationId}`,
  );

  try {
    const supabase = createAdminClient();

    // Find all active workflows matching this trigger
    const { data: workflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("trigger_type", triggerType)
      .eq("status", "active");

    if (error) {
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }

    if (!workflows || workflows.length === 0) {
      console.log(`No active workflows found for trigger ${triggerType}`);
      return { matched: 0 };
    }

    console.log(`Found ${workflows.length} workflows to execute`);

    // Queue workflow executions
    const executionJobs = workflows.map((workflow) => ({
      name: JOB_TYPES.EXECUTE_WORKFLOW,
      data: {
        workflowId: workflow.id,
        organizationId,
        triggerData,
        context: {
          triggerType,
          triggeredAt: new Date().toISOString(),
          ...metadata,
        },
      },
      opts: {
        priority: calculatePriority(workflow),
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    }));

    // Add workflow execution jobs to queue
    await getQueueManager().bulkAddJobs(
      QUEUE_NAMES.WORKFLOW_ACTIONS,
      executionJobs,
    );

    // Track trigger processing
    await getQueueManager().addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event: "trigger_processed",
        triggerType,
        organizationId,
        workflowsMatched: workflows.length,
        timestamp: new Date().toISOString(),
      },
    );

    return {
      matched: workflows.length,
      workflows: workflows.map((w) => ({ id: w.id, name: w.name })),
    };
  } catch (error) {
    console.error("Error processing workflow trigger:", error);

    // Log error to analytics
    await getQueueManager().addJob(
      QUEUE_NAMES.WORKFLOW_ANALYTICS,
      JOB_TYPES.TRACK_EXECUTION,
      {
        event: "trigger_error",
        triggerType,
        organizationId,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    );

    throw error;
  }
}

function calculatePriority(workflow: any): number {
  // Prioritize based on workflow settings or type
  if (workflow.settings?.priority === "high") {
    return JOB_PRIORITIES.HIGH;
  }

  if (workflow.settings?.priority === "low") {
    return JOB_PRIORITIES.LOW;
  }

  // Default priority
  return JOB_PRIORITIES.NORMAL;
}
