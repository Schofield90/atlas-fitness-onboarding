/**
 * Agent Orchestrator
 * Coordinates AI agent task execution and conversation management
 */

import { createAdminClient } from "@/app/lib/supabase/admin";
import { OpenAIProvider } from "./providers/openai-provider";
import { AnthropicProvider } from "./providers/anthropic-provider";
import { ToolRegistry } from "./tools/registry";
import {
  calculateCost,
  logAIUsage,
  type CostCalculation,
} from "./cost-tracker";
import {
  checkGlobalRateLimit,
  checkOrgRateLimit,
  checkAgentRateLimit,
} from "./rate-limiter";

export interface AgentTask {
  id: string;
  agent_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  task_type: "adhoc" | "scheduled" | "automation";
  context: Record<string, any>;
  status:
    | "pending"
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  priority: number;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  result: Record<string, any> | null;
  tokens_used: number;
  cost_usd: number;
  execution_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  organization_id: string;
  role: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  allowed_tools: string[];
  metadata: Record<string, any>;
}

export interface TaskExecutionResult {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
  tokensUsed: number;
  costUsd: number;
  executionTimeMs: number;
}

export interface ExecuteMessageOptions {
  conversationId: string;
  userMessage: string;
  organizationId: string;
  userId: string;
}

export interface ExecuteMessageResult {
  success: boolean;
  userMessage?: {
    id: string;
    role: "user";
    content: string;
    created_at: string;
  };
  assistantMessage?: {
    id: string;
    role: "assistant";
    content: string;
    tool_calls?: any;
    tokens_used: number;
    cost_usd: number;
    created_at: string;
  };
  cost: CostCalculation;
  error?: string;
}

export class AgentOrchestrator {
  private supabase = createAdminClient();
  private toolRegistry = new ToolRegistry();

  /**
   * Load agent's system prompt with appended SOPs (Standard Operating Procedures)
   */
  private async loadAgentSystemPrompt(agentId: string, basePrompt: string): Promise<string> {
    try {
      // Fetch SOPs linked to this agent via agent_sops junction table
      const { data: agentSops, error: sopsError } = await this.supabase
        .from('agent_sops')
        .select(`
          sop_id,
          sort_order,
          sop:sops(*)
        `)
        .eq('agent_id', agentId)
        .order('sort_order', { ascending: true });

      if (sopsError || !agentSops || agentSops.length === 0) {
        // No SOPs configured, use base prompt only
        return basePrompt;
      }

      // Concatenate SOPs in order
      const sopContents = agentSops
        .map((item: any) => item.sop?.content)
        .filter(Boolean)
        .join('\n\n---\n\n');

      // Append SOPs to base prompt
      return `${basePrompt}\n\n---\n\n## STANDARD OPERATING PROCEDURES (SOPs)\n\nFollow these procedures when responding to leads:\n\n${sopContents}`;
    } catch (error) {
      console.error('[Orchestrator] Error loading SOPs:', error);
      // If SOP loading fails, use base prompt only
      return basePrompt;
    }
  }

  /**
   * Execute a conversation message with an AI agent
   */
  async executeConversationMessage(
    options: ExecuteMessageOptions,
  ): Promise<ExecuteMessageResult> {
    const { conversationId, userMessage, organizationId, userId } = options;
    const startTime = Date.now();

    try {
      // 1. Get conversation and agent details
      const { data: conversation, error: convError } = await this.supabase
        .from("ai_agent_conversations")
        .select(
          `
          *,
          agent:ai_agents!inner(*)
        `,
        )
        .eq("id", conversationId)
        .single();

      if (convError || !conversation) {
        return {
          success: false,
          error: "Conversation not found",
          cost: this.emptyCost(),
        };
      }

      // Verify organization access
      if (conversation.organization_id !== organizationId) {
        return {
          success: false,
          error: "Access denied",
          cost: this.emptyCost(),
        };
      }

      const agent = conversation.agent as any;

      // 2. Save user message
      const { data: userMsg, error: userMsgError } = await this.supabase
        .from("ai_agent_messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
          tokens_used: 0,
          cost_usd: 0,
        })
        .select()
        .single();

      if (userMsgError || !userMsg) {
        return {
          success: false,
          error: "Failed to save user message",
          cost: this.emptyCost(),
        };
      }

      // 3. Get conversation history (limit to last 100 messages to prevent unbounded growth)
      const { data: messageHistory, error: historyError } = await this.supabase
        .from("ai_agent_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (historyError) {
        return {
          success: false,
          error: "Failed to load conversation history",
          cost: this.emptyCost(),
        };
      }

      // Reverse to chronological order (oldest first) for provider execution
      const messages = (messageHistory || []).reverse();

      // 4. Get allowed tools for agent
      const allowedTools = agent.allowed_tools || [];
      const tools = agent.model.startsWith("gpt-")
        ? this.toolRegistry.getToolsForOpenAI(allowedTools)
        : this.toolRegistry.getToolsForAnthropic(allowedTools);

      // 5. Execute with appropriate provider
      const executionResult = await this.executeConversation(
        agent,
        messages,
        tools,
      );

      if (!executionResult.success) {
        return {
          success: false,
          error: executionResult.error,
          cost: executionResult.cost,
        };
      }

      // 6. Save assistant message
      const { data: assistantMsg, error: assistantMsgError } =
        await this.supabase
          .from("ai_agent_messages")
          .insert({
            conversation_id: conversationId,
            role: "assistant",
            content: executionResult.content || "",
            tool_calls: executionResult.tool_calls || null,
            tokens_used: executionResult.cost.totalTokens,
            cost_usd: executionResult.cost.costBilledCents / 100,
            model: agent.model,
          })
          .select()
          .single();

      if (assistantMsgError || !assistantMsg) {
        return {
          success: false,
          error: "Failed to save assistant message",
          cost: executionResult.cost,
        };
      }

      // 7. Update conversation stats
      const newTotalTokens =
        (conversation.total_tokens_used || 0) +
        executionResult.cost.totalTokens;
      const newTotalCost =
        (conversation.total_cost_usd || 0) +
        executionResult.cost.costBilledCents / 100;

      await this.supabase
        .from("ai_agent_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (conversation.message_count || 0) + 2,
          total_tokens_used: newTotalTokens,
          total_cost_usd: newTotalCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // 8. Log AI usage for billing
      await logAIUsage({
        organizationId,
        agentId: agent.id,
        conversationId,
        actionType: "conversation_message",
        model: agent.model,
        inputTokens: executionResult.cost.inputTokens,
        outputTokens: executionResult.cost.outputTokens,
        totalTokens: executionResult.cost.totalTokens,
        costBaseUsd: executionResult.cost.costBaseCents / 100,
        costBilledUsd: executionResult.cost.costBilledCents / 100,
        executionTimeMs: Date.now() - startTime,
        metadata: {
          userId,
          messageCount: conversation.message_count + 2,
        },
      });

      return {
        success: true,
        userMessage: {
          id: userMsg.id,
          role: "user",
          content: userMsg.content || "",
          created_at: userMsg.created_at,
        },
        assistantMessage: {
          id: assistantMsg.id,
          role: "assistant",
          content: assistantMsg.content || "",
          tool_calls: assistantMsg.tool_calls,
          tokens_used: assistantMsg.tokens_used || 0,
          cost_usd: assistantMsg.cost_usd || 0,
          created_at: assistantMsg.created_at,
        },
        cost: executionResult.cost,
      };
    } catch (error: any) {
      console.error("Error executing conversation message:", error);
      return {
        success: false,
        error: error.message || "Failed to execute message",
        cost: this.emptyCost(),
      };
    }
  }

  /**
   * Execute conversation with appropriate AI provider
   */
  private async executeConversation(
    agent: any,
    messageHistory: any[],
    tools: any[],
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    const model = agent.model;

    // Determine provider from model
    if (model.startsWith("gpt-")) {
      return this.executeConversationOpenAI(agent, messageHistory, tools);
    } else if (model.startsWith("claude-")) {
      return this.executeConversationAnthropic(agent, messageHistory, tools);
    } else {
      return {
        success: false,
        error: `Unsupported model: ${model}`,
        cost: this.emptyCost(),
      };
    }
  }

  /**
   * Execute conversation with OpenAI
   */
  private async executeConversationOpenAI(
    agent: any,
    messageHistory: any[],
    tools: any[],
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    const provider = new OpenAIProvider();

    // Load system prompt with SOPs appended
    const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...messageHistory.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system" | "tool",
        content: msg.content || null,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      })),
    ];

    const result = await provider.execute(messages, {
      model: agent.model,
      temperature: agent.temperature ?? 0.7,
      max_tokens: agent.max_tokens ?? 4096,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        cost: result.cost,
      };
    }

    return {
      success: true,
      content: result.message?.content || "",
      tool_calls: result.toolCalls,
      cost: result.cost,
    };
  }

  /**
   * Execute conversation with Anthropic
   */
  private async executeConversationAnthropic(
    agent: any,
    messageHistory: any[],
    tools: any[],
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    // Debug: Check if API key exists
    console.log('[Orchestrator] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[Orchestrator] ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);

    const provider = new AnthropicProvider();

    // Load system prompt with SOPs appended
    const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt);

    const messages = messageHistory
      .filter((msg) => msg.role !== "system")
      .map((msg) => {
        if (msg.role === "tool") {
          return {
            role: "user" as const,
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: msg.tool_call_id,
                content: msg.content,
              },
            ],
          };
        }

        return {
          role: msg.role as "user" | "assistant",
          content: msg.content || "",
        };
      });

    const result = await provider.execute(messages, {
      model: agent.model,
      temperature: agent.temperature ?? 0.7,
      max_tokens: agent.max_tokens ?? 4096,
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        cost: result.cost,
      };
    }

    const textContent =
      result.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

    const toolUses =
      result.content
        ?.filter((block: any) => block.type === "tool_use")
        .map((block: any) => ({
          id: block.id,
          name: block.name,
          input: block.input,
        })) || [];

    return {
      success: true,
      content: textContent,
      tool_calls: toolUses.length > 0 ? toolUses : undefined,
      cost: result.cost,
    };
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

  /**
   * Execute a task by ID
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    let tokensUsed = 0;
    let costUsd = 0;

    try {
      // Check global rate limit first
      const globalOk = await checkGlobalRateLimit();
      if (!globalOk) {
        throw new Error("Global rate limit exceeded. System is at capacity.");
      }

      // Fetch task details
      const { data: task, error: taskError } = await this.supabase
        .from("ai_agent_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError || !task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Check organization-specific rate limit
      const orgOk = await checkOrgRateLimit(task.organization_id);
      if (!orgOk) {
        throw new Error(
          "Organization rate limit exceeded. Please try again in 1 minute.",
        );
      }

      // Fetch agent details
      const { data: agent, error: agentError } = await this.supabase
        .from("ai_agents")
        .select("*")
        .eq("id", task.agent_id)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent not found: ${task.agent_id}`);
      }

      // Check agent-specific rate limit
      const agentOk = await checkAgentRateLimit(agent.id);
      if (!agentOk) {
        throw new Error(
          `Agent rate limit exceeded for ${agent.name}. Please try again in 1 minute.`,
        );
      }

      // Update task status to running
      await this.updateTaskStatus(taskId, "running");

      // Execute the task
      const result = await this.executeAgentTask(agent, task);

      tokensUsed = result.tokensUsed;
      costUsd = result.costUsd;

      // Update task with result
      await this.supabase
        .from("ai_agent_tasks")
        .update({
          status: "completed",
          result: result.result,
          tokens_used: tokensUsed,
          cost_usd: costUsd,
          execution_time_ms: result.executionTimeMs,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      // Log activity
      await this.logActivity(agent.id, agent.organization_id, taskId, {
        action_type: "task_completed",
        action_data: { task_title: task.title },
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        execution_time_ms: result.executionTimeMs,
        success: true,
      });

      return {
        success: true,
        result: result.result,
        tokensUsed,
        costUsd,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Update task as failed
      await this.supabase
        .from("ai_agent_tasks")
        .update({
          status: "failed",
          error_message: errorMessage,
          execution_time_ms: executionTimeMs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      return {
        success: false,
        error: errorMessage,
        tokensUsed,
        costUsd,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute agent task with provider
   */
  private async executeAgentTask(
    agent: Agent,
    task: AgentTask,
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    // Execute based on model provider
    let result: any;
    let tokensUsed = 0;
    let costUsd = 0;

    if (agent.model.startsWith("gpt-")) {
      // OpenAI
      const provider = new OpenAIProvider();
      const tools = this.toolRegistry.getToolsForOpenAI(agent.allowed_tools);

      // Load system prompt with SOPs appended
      const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt);

      const response = await provider.execute(
        [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `${task.title}\n\n${task.description || ""}\n\nContext: ${JSON.stringify(task.context, null, 2)}`,
          },
        ],
        {
          model: agent.model,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          tools: tools.length > 0 ? tools : undefined,
        },
      );

      if (!response.success) {
        throw new Error(response.error || "OpenAI execution failed");
      }

      tokensUsed = response.cost.totalTokens;
      costUsd = response.cost.costBaseCents / 100;

      result = {
        content: response.message?.content || "",
        tool_calls: response.toolCalls || [],
      };
    } else if (agent.model.startsWith("claude-")) {
      // Anthropic
      const provider = new AnthropicProvider();
      const tools = this.toolRegistry.getToolsForAnthropic(agent.allowed_tools);

      // Load system prompt with SOPs appended
      const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt);

      const response = await provider.execute(
        [
          {
            role: "user",
            content: `${task.title}\n\n${task.description || ""}\n\nContext: ${JSON.stringify(task.context, null, 2)}`,
          },
        ],
        {
          model: agent.model,
          max_tokens: agent.max_tokens,
          temperature: agent.temperature,
          system: systemPrompt,
          tools: tools.length > 0 ? tools : undefined,
        },
      );

      if (!response.success) {
        throw new Error(response.error || "Anthropic execution failed");
      }

      tokensUsed = response.cost.totalTokens;
      costUsd = response.cost.costBaseCents / 100;

      // Extract text and tool uses from Anthropic response
      const textContent = response.content
        ? response.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("")
        : "";

      const toolUses = response.content
        ? response.content.filter((c: any) => c.type === "tool_use")
        : [];

      result = {
        content: textContent,
        tool_calls: toolUses,
        stop_reason: response.stopReason,
      };
    } else {
      throw new Error(`Unsupported model: ${agent.model}`);
    }

    return {
      success: true,
      result,
      tokensUsed,
      costUsd,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: AgentTask["status"],
  ): Promise<void> {
    await this.supabase
      .from("ai_agent_tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  }

  /**
   * Log agent activity
   */
  private async logActivity(
    agentId: string,
    organizationId: string,
    taskId: string,
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
      action_data: data.action_data,
      tokens_used: data.tokens_used,
      cost_usd: data.cost_usd,
      cost_billed_usd: costBilledUsd,
      execution_time_ms: data.execution_time_ms,
      success: data.success,
      error_message: data.error_message,
    });
  }
}

/**
 * Singleton instance
 */
let orchestratorInstance: AgentOrchestrator | null = null;

/**
 * Get the orchestrator singleton instance
 */
export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
  }
  return orchestratorInstance;
}

// Export singleton instance for backwards compatibility
export const agentOrchestrator = getOrchestrator();
