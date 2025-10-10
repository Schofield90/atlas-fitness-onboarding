/**
 * Agent Orchestrator
 * Coordinates AI agent task execution and conversation management
 */

import { createAdminClient } from '@/app/lib/supabase/admin';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { ToolRegistry } from './tools/registry';
import { calculateCost, logAIUsage, type CostCalculation } from './cost-tracker';
import { checkGlobalRateLimit, checkOrgRateLimit, checkAgentRateLimit } from './rate-limiter';

export interface AgentTask {
  id: string;
  agent_id: string;
  organization_id: string;
  title: string;
  description: string | null;
  task_type: 'adhoc' | 'scheduled' | 'automation';
  context: Record<string, any>;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
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
   * Execute a conversation message with an AI agent
   */
  async executeConversationMessage(
    options: ExecuteMessageOptions
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
        `
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

      // Check if user is gym owner/staff (not a client)
      const { data: userRole } = await this.supabase
        .from('organization_staff')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      const { data: userOrgRole } = await this.supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      const isGymOwner = !!(userRole || userOrgRole);
      const staffRole = userRole?.role || userOrgRole?.role || 'client';

      // Inject gym owner context into system prompt if applicable
      if (isGymOwner && agent.system_prompt) {
        const contextPrefix = `
**IMPORTANT CONTEXT: You are speaking with a gym ${staffRole} (not a client).**

The person you're chatting with is authorized staff who manages this fitness business. They need help with:
- Viewing client/member data and analytics
- Running reports and business intelligence queries
- Managing operations (bookings, payments, memberships)
- Executing administrative tasks

You should respond professionally and help them accomplish business tasks.

---

${agent.system_prompt}`;

        // Temporarily override system prompt with context
        agent.system_prompt = contextPrefix;
      }

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
      console.log('[Orchestrator] Agent allowed_tools:', allowedTools);
      console.log('[Orchestrator] All registered tools:', this.toolRegistry.getAllTools().map(t => t.id));
      const tools = agent.model.startsWith('gpt-')
        ? this.toolRegistry.getToolsForOpenAI(allowedTools)
        : this.toolRegistry.getToolsForAnthropic(allowedTools);
      console.log('[Orchestrator] Converted tools for AI:', tools.length, 'tools');

      // 5. Execute with appropriate provider
      const executionResult = await this.executeConversation(
        agent,
        messages,
        tools
      );

      if (!executionResult.success) {
        return {
          success: false,
          error: executionResult.error,
          cost: executionResult.cost,
        };
      }

      // 6. Save assistant message
      const { data: assistantMsg, error: assistantMsgError } = await this.supabase
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
      const newTotalTokens = (conversation.total_tokens_used || 0) + executionResult.cost.totalTokens;
      const newTotalCost = (conversation.total_cost_usd || 0) + executionResult.cost.costBilledCents / 100;

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
    tools: any[]
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
   * Execute conversation with OpenAI (with tool execution loop)
   */
  private async executeConversationOpenAI(
    agent: any,
    messageHistory: any[],
    tools: any[]
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    const provider = new OpenAIProvider();
    const MAX_TOOL_ITERATIONS = 10; // Allow complex multi-step analyses (was 5)
    let iteration = 0;
    let totalCost: CostCalculation = this.emptyCost();

    const messages: any[] = [
      { role: "system" as const, content: agent.system_prompt },
      ...messageHistory.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system" | "tool",
        content: msg.content || null,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      })),
    ];

    // Tool execution loop: keep calling until no more tool calls or max iterations
    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      console.log(`[Orchestrator OpenAI] Iteration ${iteration}, calling with ${tools.length} tools`);
      if (tools.length > 0) {
        console.log('[Orchestrator OpenAI] Tool names:', tools.map((t: any) => t.function.name));
      }

      const result = await provider.execute(messages, {
        model: agent.model,
        temperature: agent.temperature ?? 0.7,
        max_tokens: agent.max_tokens ?? 4096,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
      });

      console.log('[Orchestrator OpenAI] Response has tool calls?', !!result.toolCalls, result.toolCalls?.length || 0);

      // Accumulate costs
      totalCost = {
        model: result.cost.model || totalCost.model,
        inputTokens: totalCost.inputTokens + result.cost.inputTokens,
        outputTokens: totalCost.outputTokens + result.cost.outputTokens,
        totalTokens: totalCost.totalTokens + result.cost.totalTokens,
        costBaseCents: totalCost.costBaseCents + result.cost.costBaseCents,
        costBilledCents: totalCost.costBilledCents + result.cost.costBilledCents,
        markupPercentage: result.cost.markupPercentage || totalCost.markupPercentage,
      };

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          cost: totalCost,
        };
      }

      // If no tool calls, we're done
      if (!result.toolCalls || result.toolCalls.length === 0) {
        return {
          success: true,
          content: result.message?.content || "",
          tool_calls: undefined,
          cost: totalCost,
        };
      }

      // Add assistant message with tool calls
      messages.push({
        role: "assistant",
        content: result.message?.content || null,
        tool_calls: result.toolCalls,
      });

      // Execute each tool and add results
      for (const toolCall of result.toolCalls) {
        try {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

          // Execute tool via registry
          const toolResult = await this.toolRegistry.executeTool(
            toolName,
            toolArgs,
            {
              organizationId: agent.organization_id,
              agentId: agent.id,
              userId: "system", // Tool calls are system-initiated
            }
          );

          // Add tool result message
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult.data || { error: toolResult.error }),
            tool_call_id: toolCall.id,
          });
        } catch (error: any) {
          // Add error as tool result
          messages.push({
            role: "tool",
            content: JSON.stringify({ error: error.message || "Tool execution failed" }),
            tool_call_id: toolCall.id,
          });
        }
      }

      // Continue loop to get final response
    }

    // Max iterations reached
    return {
      success: false,
      error: `Max tool execution iterations (${MAX_TOOL_ITERATIONS}) reached`,
      cost: totalCost,
    };
  }

  /**
   * Execute conversation with Anthropic (with tool execution loop)
   */
  private async executeConversationAnthropic(
    agent: any,
    messageHistory: any[],
    tools: any[]
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    const provider = new AnthropicProvider();
    const MAX_TOOL_ITERATIONS = 10; // Allow complex multi-step analyses (was 5)
    let iteration = 0;
    let totalCost: CostCalculation = this.emptyCost();

    const messages: any[] = messageHistory
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

    // Tool execution loop: keep calling until no more tool calls or max iterations
    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      const result = await provider.execute(messages, {
        model: agent.model,
        temperature: agent.temperature ?? 0.7,
        max_tokens: agent.max_tokens ?? 4096,
        system: agent.system_prompt,
        tools: tools.length > 0 ? tools : undefined,
      });

      // Accumulate costs
      totalCost = {
        model: result.cost.model || totalCost.model,
        inputTokens: totalCost.inputTokens + result.cost.inputTokens,
        outputTokens: totalCost.outputTokens + result.cost.outputTokens,
        totalTokens: totalCost.totalTokens + result.cost.totalTokens,
        costBaseCents: totalCost.costBaseCents + result.cost.costBaseCents,
        costBilledCents: totalCost.costBilledCents + result.cost.costBilledCents,
        markupPercentage: result.cost.markupPercentage || totalCost.markupPercentage,
      };

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          cost: totalCost,
        };
      }

      const textContent = result.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

      const toolUses = result.content
        ?.filter((block: any) => block.type === "tool_use")
        .map((block: any) => ({
          id: block.id,
          name: block.name,
          input: block.input,
        })) || [];

      // If no tool calls, we're done
      if (toolUses.length === 0) {
        return {
          success: true,
          content: textContent,
          tool_calls: undefined,
          cost: totalCost,
        };
      }

      // Add assistant message with tool uses in Anthropic format
      messages.push({
        role: "assistant",
        content: result.content, // Full content blocks including tool_use
      });

      // Execute each tool and add results as user messages
      const toolResults: any[] = [];
      for (const toolUse of toolUses) {
        try {
          const toolName = toolUse.name;
          const toolArgs = toolUse.input;

          // Execute tool via registry
          const toolResult = await this.toolRegistry.executeTool(
            toolName,
            toolArgs,
            {
              organizationId: agent.organization_id,
              agentId: agent.id,
              userId: "system", // Tool calls are system-initiated
            }
          );

          // Add tool result in Anthropic format
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult.data || { error: toolResult.error }),
          });
        } catch (error: any) {
          // Add error as tool result
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: error.message || "Tool execution failed" }),
          });
        }
      }

      // Add tool results as a user message
      messages.push({
        role: "user",
        content: toolResults,
      });

      // Continue loop to get final response
    }

    // Max iterations reached
    return {
      success: false,
      error: `Max tool execution iterations (${MAX_TOOL_ITERATIONS}) reached`,
      cost: totalCost,
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
        throw new Error('Global rate limit exceeded. System is at capacity.');
      }

      // Fetch task details
      const { data: task, error: taskError } = await this.supabase
        .from('ai_agent_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Check organization-specific rate limit
      const orgOk = await checkOrgRateLimit(task.organization_id);
      if (!orgOk) {
        throw new Error('Organization rate limit exceeded. Please try again in 1 minute.');
      }

      // Fetch agent details
      const { data: agent, error: agentError } = await this.supabase
        .from('ai_agents')
        .select('*')
        .eq('id', task.agent_id)
        .single();

      if (agentError || !agent) {
        throw new Error(`Agent not found: ${task.agent_id}`);
      }

      // Check agent-specific rate limit
      const agentOk = await checkAgentRateLimit(agent.id);
      if (!agentOk) {
        throw new Error(`Agent rate limit exceeded for ${agent.name}. Please try again in 1 minute.`);
      }

      // Update task status to running
      await this.updateTaskStatus(taskId, 'running');

      // Execute the task
      const result = await this.executeAgentTask(agent, task);

      tokensUsed = result.tokensUsed;
      costUsd = result.costUsd;

      // Update task with result
      await this.supabase
        .from('ai_agent_tasks')
        .update({
          status: 'completed',
          result: result.result,
          tokens_used: tokensUsed,
          cost_usd: costUsd,
          execution_time_ms: result.executionTimeMs,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      // Log activity
      await this.logActivity(agent.id, agent.organization_id, taskId, {
        action_type: 'task_completed',
        action_data: { task_title: task.title },
        tokens_used: tokensUsed,
        cost_usd: costUsd,
        execution_time_ms: result.executionTimeMs,
        success: true
      });

      return {
        success: true,
        result: result.result,
        tokensUsed,
        costUsd,
        executionTimeMs: Date.now() - startTime
      };

    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update task as failed
      await this.supabase
        .from('ai_agent_tasks')
        .update({
          status: 'failed',
          error_message: errorMessage,
          execution_time_ms: executionTimeMs,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      return {
        success: false,
        error: errorMessage,
        tokensUsed,
        costUsd,
        executionTimeMs
      };
    }
  }

  /**
   * Execute agent task with provider
   */
  private async executeAgentTask(
    agent: Agent,
    task: AgentTask
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();

    // Execute based on model provider
    let result: any;
    let tokensUsed = 0;
    let costUsd = 0;

    if (agent.model.startsWith('gpt-')) {
      // OpenAI
      const provider = new OpenAIProvider();
      const tools = this.toolRegistry.getToolsForOpenAI(agent.allowed_tools);

      const response = await provider.execute(
        [
          {
            role: 'system',
            content: agent.system_prompt
          },
          {
            role: 'user',
            content: `${task.title}\n\n${task.description || ''}\n\nContext: ${JSON.stringify(task.context, null, 2)}`
          }
        ],
        {
          model: agent.model,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          tools: tools.length > 0 ? tools : undefined
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'OpenAI execution failed');
      }

      tokensUsed = response.cost.totalTokens;
      costUsd = response.cost.costBaseCents / 100;

      result = {
        content: response.message?.content || '',
        tool_calls: response.toolCalls || []
      };

    } else if (agent.model.startsWith('claude-')) {
      // Anthropic
      const provider = new AnthropicProvider();
      const tools = this.toolRegistry.getToolsForAnthropic(agent.allowed_tools);

      const response = await provider.execute(
        [
          {
            role: 'user',
            content: `${task.title}\n\n${task.description || ''}\n\nContext: ${JSON.stringify(task.context, null, 2)}`
          }
        ],
        {
          model: agent.model,
          max_tokens: agent.max_tokens,
          temperature: agent.temperature,
          system: agent.system_prompt,
          tools: tools.length > 0 ? tools : undefined
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Anthropic execution failed');
      }

      tokensUsed = response.cost.totalTokens;
      costUsd = response.cost.costBaseCents / 100;

      // Extract text and tool uses from Anthropic response
      const textContent = response.content
        ? response.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
        : '';

      const toolUses = response.content
        ? response.content.filter((c: any) => c.type === 'tool_use')
        : [];

      result = {
        content: textContent,
        tool_calls: toolUses,
        stop_reason: response.stopReason
      };
    } else {
      throw new Error(`Unsupported model: ${agent.model}`);
    }

    return {
      success: true,
      result,
      tokensUsed,
      costUsd,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(
    taskId: string,
    status: AgentTask['status']
  ): Promise<void> {
    await this.supabase
      .from('ai_agent_tasks')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);
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
    }
  ): Promise<void> {
    const costBilledUsd = data.cost_usd * 1.2; // 20% markup

    await this.supabase
      .from('ai_agent_activity_log')
      .insert({
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
        error_message: data.error_message
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
