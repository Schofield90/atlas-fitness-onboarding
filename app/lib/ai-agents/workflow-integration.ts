/**
 * AI Agent Workflow Integration
 * Allows automation workflows to execute AI agent tasks
 */

import { createAdminClient } from "@/app/lib/supabase/admin";
import { getOrchestrator, type TaskExecutionResult } from "./orchestrator";
import { logAIUsage, type CostCalculation } from "./cost-tracker";
import type {
  ExecutionContext,
  NodeExecutionResult,
} from "@/app/lib/workflow/types";

export interface WorkflowAgentTaskParams {
  workflowId: string;
  stepId: string;
  executionId: string;
  organizationId: string;
  agentId: string;
  prompt: string;
  context: Record<string, any>;
}

export interface WorkflowAgentExecutionResult {
  success: boolean;
  result?: any;
  cost: CostCalculation;
  executionTimeMs: number;
  error?: string;
}

export class WorkflowAgentExecutor {
  private supabase = createAdminClient();
  private orchestrator = getOrchestrator();

  /**
   * Execute an AI agent task from a workflow
   */
  async executeFromWorkflow(
    params: WorkflowAgentTaskParams,
  ): Promise<WorkflowAgentExecutionResult> {
    const {
      workflowId,
      stepId,
      executionId,
      organizationId,
      agentId,
      prompt,
      context,
    } = params;

    const startTime = Date.now();

    try {
      // 1. Validate agent exists and belongs to organization
      const { data: agent, error: agentError } = await this.supabase
        .from("ai_agents")
        .select("*")
        .eq("id", agentId)
        .eq("organization_id", organizationId)
        .single();

      if (agentError || !agent) {
        return {
          success: false,
          error: "Agent not found or access denied",
          cost: this.emptyCost(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 2. Validate workflow belongs to organization
      const { data: workflow, error: workflowError } = await this.supabase
        .from("workflows")
        .select("id, organization_id")
        .eq("id", workflowId)
        .eq("organization_id", organizationId)
        .single();

      if (workflowError || !workflow) {
        return {
          success: false,
          error: "Workflow not found or access denied",
          cost: this.emptyCost(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 3. Create ad-hoc task in database
      const { data: task, error: taskError } = await this.supabase
        .from("ai_agent_tasks")
        .insert({
          agent_id: agentId,
          organization_id: organizationId,
          title: `Workflow Task: ${workflowId}`,
          description: prompt,
          task_type: "automation",
          context: {
            ...context,
            workflow_id: workflowId,
            step_id: stepId,
            execution_id: executionId,
          },
          status: "pending",
          priority: 50,
          retry_count: 0,
          max_retries: 3,
        })
        .select()
        .single();

      if (taskError || !task) {
        return {
          success: false,
          error: "Failed to create agent task",
          cost: this.emptyCost(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 4. Execute the task via orchestrator
      const executionResult: TaskExecutionResult =
        await this.orchestrator.executeTask(task.id);

      if (!executionResult.success) {
        return {
          success: false,
          error: executionResult.error || "Agent execution failed",
          cost: this.emptyCost(),
          executionTimeMs: Date.now() - startTime,
        };
      }

      // 5. Calculate cost
      const cost: CostCalculation = {
        model: agent.model,
        inputTokens: Math.floor(executionResult.tokensUsed * 0.7), // Estimate
        outputTokens: Math.floor(executionResult.tokensUsed * 0.3), // Estimate
        totalTokens: executionResult.tokensUsed,
        costBaseCents: Math.round(executionResult.costUsd * 100),
        costBilledCents: Math.round(executionResult.costUsd * 100 * 1.2), // 20% markup
        markupPercentage: 20,
      };

      // 6. Log workflow-specific activity
      await this.logWorkflowActivity(
        agentId,
        organizationId,
        task.id,
        workflowId,
        executionId,
        stepId,
        {
          action_type: "workflow_agent_execution",
          action_data: {
            task_title: task.title,
            prompt: prompt.substring(0, 200),
            context_keys: Object.keys(context),
          },
          tokens_used: executionResult.tokensUsed,
          cost_usd: executionResult.costUsd,
          execution_time_ms: executionResult.executionTimeMs,
          success: true,
        },
      );

      // 7. Log AI usage for billing
      await logAIUsage({
        organizationId,
        agentId,
        taskId: task.id,
        actionType: "workflow_automation",
        model: agent.model,
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        totalTokens: cost.totalTokens,
        costBaseUsd: cost.costBaseCents / 100,
        costBilledUsd: cost.costBilledCents / 100,
        executionTimeMs: executionResult.executionTimeMs,
        metadata: {
          workflow_id: workflowId,
          execution_id: executionId,
          step_id: stepId,
        },
      });

      return {
        success: true,
        result: executionResult.result,
        cost,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error("Error executing agent from workflow:", error);

      return {
        success: false,
        error: error.message || "Unknown error executing agent",
        cost: this.emptyCost(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Log activity specific to workflow executions
   */
  private async logWorkflowActivity(
    agentId: string,
    organizationId: string,
    taskId: string,
    workflowId: string,
    executionId: string,
    stepId: string,
    data: {
      action_type: string;
      action_data: Record<string, any>;
      tokens_used: number;
      cost_usd: number;
      execution_time_ms: number;
      success: boolean;
      error_message?: string;
    },
  ): Promise<void> {
    const costBilledUsd = data.cost_usd * 1.2; // 20% markup

    await this.supabase.from("ai_agent_activity_log").insert({
      agent_id: agentId,
      organization_id: organizationId,
      task_id: taskId,
      action_type: data.action_type,
      action_data: {
        ...data.action_data,
        workflow_id: workflowId,
        execution_id: executionId,
        step_id: stepId,
      },
      tokens_used: data.tokens_used,
      cost_usd: data.cost_usd,
      cost_billed_usd: costBilledUsd,
      execution_time_ms: data.execution_time_ms,
      success: data.success,
      error_message: data.error_message,
    });
  }

  /**
   * Empty cost object for errors
   */
  private emptyCost(): CostCalculation {
    return {
      model: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costBaseCents: 0,
      costBilledCents: 0,
      markupPercentage: 20,
    };
  }
}

/**
 * Format workflow context for agent consumption
 * Converts workflow variables and node outputs into a clean context object
 */
export function formatWorkflowContext(
  context: ExecutionContext,
): Record<string, any> {
  const {
    workflowId,
    organizationId,
    executionId,
    trigger,
    variables,
    ...nodeOutputs
  } = context;

  return {
    workflow: {
      id: workflowId,
      organization_id: organizationId,
      execution_id: executionId,
    },
    trigger: trigger || {},
    variables: variables || {},
    outputs: nodeOutputs,
  };
}

/**
 * Execute AI agent from workflow context
 * This is the primary function called by workflow action handlers
 */
export async function executeAgentFromWorkflow(
  workflowId: string,
  stepId: string,
  agentId: string,
  prompt: string,
  context: ExecutionContext,
): Promise<NodeExecutionResult> {
  const executor = new WorkflowAgentExecutor();

  const formattedContext = formatWorkflowContext(context);

  const result = await executor.executeFromWorkflow({
    workflowId,
    stepId,
    executionId: context.executionId,
    organizationId: context.organizationId,
    agentId,
    prompt,
    context: formattedContext,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      output: { error: result.error },
    };
  }

  return {
    success: true,
    output: {
      agent_result: result.result,
      cost: result.cost,
      execution_time_ms: result.executionTimeMs,
    },
  };
}

/**
 * Register workflow actions for AI agents
 * This should be called during workflow system initialization
 */
export function registerWorkflowActions() {
  // This function is a placeholder for when we add dynamic action registration
  // For now, the action is registered directly in the action handlers
  console.log("AI Agent workflow actions registered");
}

/**
 * Singleton executor instance
 */
let executorInstance: WorkflowAgentExecutor | null = null;

/**
 * Get the executor singleton instance
 */
export function getWorkflowAgentExecutor(): WorkflowAgentExecutor {
  if (!executorInstance) {
    executorInstance = new WorkflowAgentExecutor();
  }
  return executorInstance;
}
