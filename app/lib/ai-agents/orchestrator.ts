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
import {
  logToolError,
  detectPotentialHallucination,
  addSelfDebugInstructions,
  type DebugContext,
} from "./self-debug";
import { checkAndFlagIfNeeded } from "./sentiment-detector";

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
   * Load agent's system prompt with appended SOPs (Standard Operating Procedures) and self-debug instructions
   */
  private async loadAgentSystemPrompt(
    agentId: string,
    basePrompt: string,
    organizationId?: string
  ): Promise<string> {
    try {
      // Fetch organization timezone for date/time context
      let orgTimezone = 'Europe/London'; // Default fallback
      if (organizationId) {
        const { data: org } = await this.supabase
          .from('organizations')
          .select('timezone')
          .eq('id', organizationId)
          .single();

        if (org?.timezone) {
          orgTimezone = org.timezone;
        }
      }

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

      let promptWithSops = basePrompt;

      if (!sopsError && agentSops && agentSops.length > 0) {
        // Process SOPs based on strictness level
        const exactScripts: Array<{name: string, content: string}> = [];
        const guidelines: string[] = [];
        const generalTones: string[] = [];

        agentSops.forEach((item: any) => {
          const sop = item.sop;
          if (!sop?.content) return;

          const strictness = sop.strictness_level || 'guideline';

          if (strictness === 'exact_script') {
            exactScripts.push({
              name: sop.name,
              content: sop.content
            });
          } else if (strictness === 'guideline') {
            guidelines.push(sop.content);
          } else if (strictness === 'general_tone') {
            generalTones.push(sop.content);
          }
        });

        let sopSection = '';

        // Add EXACT SCRIPTS with clear XML structure and examples
        if (exactScripts.length > 0) {
          sopSection += `
<message_templates>
These are EXACT message templates. You must copy them word-for-word, only replacing placeholders in [brackets].

<template_rules>
1. Count how many messages YOU have sent in this conversation (not the lead's messages)
2. For YOUR FIRST message: use the "First message to a new lead" template
3. For YOUR SECOND message: use the "Second message" template
4. For YOUR THIRD message: use the "Third message" template
5. Copy the template EXACTLY, only replacing [lead name], [gym name], [location], etc.
6. Do NOT add extra words, explanations, or change any wording
</template_rules>

<examples>
<example>
<template>Thanks [lead name], and what is your main goal is it more fitness or fat loss?</template>
<lead_name>Sarah</lead_name>
<your_response>Thanks Sarah, and what is your main goal is it more fitness or fat loss?</your_response>
</example>

<example>
<template>Hey [lead name]

Its [lead chaser name] at [gym name], just seen your interest in our upcoming programme, can I quickly confirm you live within 15 minutes of [location]?

[lead chaser name]
[gym name]</template>
<lead_name>Mike</lead_name>
<gym_name>Aimee's Place</gym_name>
<location>York</location>
<lead_chaser_name>Sam</lead_chaser_name>
<your_response>Hey Mike

Its Sam at Aimee's Place, just seen your interest in our upcoming programme, can I quickly confirm you live within 15 minutes of York?

Sam
Aimee's Place</your_response>
</example>
</examples>

<templates>
${exactScripts.map((script, index) => `<template id="${index + 1}" message_number="${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}">
<name>${script.name}</name>
<text>${script.content}</text>
</template>`).join('\n\n')}
</templates>
</message_templates>

`;
        }

        // Add GUIDELINES
        if (guidelines.length > 0) {
          sopSection += `
## GUIDELINES

Follow these procedures closely but adapt to the conversation context:

${guidelines.join('\n\n---\n\n')}

`;
        }

        // Add GENERAL TONE
        if (generalTones.length > 0) {
          sopSection += `
## GENERAL TONE & STYLE

Use these as general guidance for your responses:

${generalTones.join('\n\n---\n\n')}

`;
        }

        // Append SOPs to base prompt
        promptWithSops = `${basePrompt}\n\n---\n\n## STANDARD OPERATING PROCEDURES (SOPs)\n\n${sopSection}`;
      }

      // Add self-debugging instructions to prevent hallucinations (NEW)
      let finalPrompt = addSelfDebugInstructions(promptWithSops);

      // Add current date/time context (SERVER-SIDE SOURCE OF TRUTH)
      // This is computed once per conversation and passed to the agent
      const now = new Date();
      const todayISODate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const nowISO = now.toISOString(); // Full ISO with timezone
      const epochMs = now.getTime();

      // Format for human readability in organization's timezone
      const localDateTime = now.toLocaleString('en-GB', {
        timeZone: orgTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dayOfWeek = now.toLocaleDateString('en-GB', {
        timeZone: orgTimezone,
        weekday: 'long'
      });

      console.log('[Orchestrator] Date context:', {
        todayISODate,
        nowISO,
        epochMs,
        dayOfWeek,
        localDateTime,
        timezone: orgTimezone
      });

      const dateHeader = `# CURRENT DATE/TIME (SOURCE OF TRUTH)

**IMPORTANT**: Use this as your ONLY source of truth for the current date and time. Never infer the date from memory or context.

- **Today's Date (ISO)**: ${todayISODate}
- **Day of Week**: ${dayOfWeek}
- **Current Time**: ${localDateTime}
- **Timezone**: ${orgTimezone}
- **Unix Timestamp**: ${epochMs}

When the user asks "what day is it" or you need to know the current date, use the information above.

---

`;

      finalPrompt = dateHeader + finalPrompt;

      return finalPrompt;
    } catch (error) {
      console.error('[Orchestrator] Error loading SOPs:', error);

      // If SOP loading fails, still add current date context
      const now = new Date();
      const todayISODate = now.toISOString().split('T')[0];
      const epochMs = now.getTime();
      const ukDateTime = now.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const dayOfWeek = now.toLocaleDateString('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'long'
      });

      const dateHeader = `# CURRENT DATE/TIME (SOURCE OF TRUTH)

**IMPORTANT**: Use this as your ONLY source of truth for the current date and time. Never infer the date from memory or context.

- **Today's Date (ISO)**: ${todayISODate}
- **Day of Week**: ${dayOfWeek}
- **Current Time**: ${localDateTime}
- **Timezone**: ${orgTimezone}
- **Unix Timestamp**: ${epochMs}

When the user asks "what day is it" or you need to know the current date, use the information above.

---

`;

      return dateHeader + addSelfDebugInstructions(basePrompt);
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

      // 3a. CHECK FOR EXACT SCRIPT TEMPLATES (bypass Claude if template should be used)
      // Count how many assistant messages exist (to determine which template to use)
      const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;

      console.log(`[Orchestrator] 🔍 Template bypass check: assistantMessageCount=${assistantMessageCount}`);

      // Get agent's exact script SOPs
      const { data: exactScriptSops } = await this.supabase
        .from('agent_sops')
        .select(`
          sop_id,
          sort_order,
          sop:sops!inner(id, name, content, strictness_level)
        `)
        .eq('agent_id', agent.id)
        .eq('sop.strictness_level', 'exact_script')
        .order('sort_order', { ascending: true });

      console.log(`[Orchestrator] 🔍 Found ${exactScriptSops?.length || 0} exact_script SOPs`);
      if (exactScriptSops && exactScriptSops.length > 0) {
        console.log(`[Orchestrator] 🔍 SOP names:`, exactScriptSops.map(s => s.sop?.name));
      }

      // Check if we should use an exact template (1st, 2nd, or 3rd assistant message)
      if (exactScriptSops && exactScriptSops.length > 0 && assistantMessageCount < 3) {
        const templateIndex = assistantMessageCount; // 0 = first, 1 = second, 2 = third
        const templateSop = exactScriptSops[templateIndex];

        if (templateSop && templateSop.sop) {
          console.log(`[Orchestrator] 🎯 Using exact template #${templateIndex + 1}: "${templateSop.sop.name}"`);
          console.log(`[Orchestrator] Bypassing Claude to ensure exact template adherence`);

          // Replace placeholders in template
          let templateContent = templateSop.sop.content;

          // Extract lead name from conversation metadata or recent messages
          let leadName = 'there'; // default fallback
          if (conversation.metadata?.lead_name) {
            leadName = conversation.metadata.lead_name;
          } else {
            // Try to extract from recent user messages
            const recentUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0];
            if (recentUserMsg?.content) {
              // Simple name extraction (you can enhance this)
              const nameMatch = recentUserMsg.content.match(/(?:my name is|i'm|i am)\s+(\w+)/i);
              if (nameMatch) {
                leadName = nameMatch[1];
              }
            }
          }

          // Get metadata values for placeholders
          const gymName = agent.metadata?.gym_name || agent.name || 'our gym';
          const location = agent.metadata?.location || 'your area';
          const leadChaserName = agent.metadata?.lead_chaser_name || 'our team';

          // Replace all placeholders
          templateContent = templateContent
            .replace(/\[lead name\]/gi, leadName)
            .replace(/\[gym name\]/gi, gymName)
            .replace(/\[location\]/gi, location)
            .replace(/\[lead chaser name\]/gi, leadChaserName);

          console.log(`[Orchestrator] Template after replacements: "${templateContent.substring(0, 100)}..."`);

          // Save assistant message with template content (no AI call needed)
          const { data: assistantMsg, error: assistantMsgError } =
            await this.supabase
              .from("ai_agent_messages")
              .insert({
                conversation_id: conversationId,
                role: "assistant",
                content: templateContent,
                tool_calls: null,
                tool_results: null,
                tokens_used: 0, // No tokens used (template bypass)
                cost_usd: 0, // No cost (template bypass)
                model: agent.model,
                metadata: {
                  template_used: true,
                  template_name: templateSop.sop.name,
                  template_index: templateIndex + 1,
                },
              })
              .select()
              .single();

          if (assistantMsgError || !assistantMsg) {
            return {
              success: false,
              error: "Failed to save template message",
              cost: this.emptyCost(),
            };
          }

          // Update conversation stats (no tokens/cost since we bypassed Claude)
          await this.supabase
            .from("ai_agent_conversations")
            .update({
              last_message_at: new Date().toISOString(),
              message_count: (conversation.message_count || 0) + 2,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);

          return {
            success: true,
            message: assistantMsg,
            cost: this.emptyCost(),
          };
        }
      }

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
        {
          conversationId,
          organizationId,
          userId,
          agentId: agent.id,
        },
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
            tool_results: executionResult.tool_results || null, // Save tool execution results (NEW)
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

      // 6b. Check for negative sentiment and flag if needed
      try {
        const flagId = await checkAndFlagIfNeeded(
          userMessage,
          executionResult.content || "",
          {
            agentId: agent.id,
            conversationId,
            messageId: assistantMsg.id,
            organizationId,
            triggerMessage: userMessage,
            agentResponse: executionResult.content || "",
          }
        );

        if (flagId) {
          console.log(`[Orchestrator] Conversation flagged for review: ${flagId}`);
        }
      } catch (sentimentError) {
        // Don't fail the entire request if sentiment detection fails
        console.error("[Orchestrator] Sentiment detection error:", sentimentError);
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
    context: {
      conversationId: string;
      organizationId: string;
      userId: string;
      agentId: string;
    },
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
      return this.executeConversationAnthropic(agent, messageHistory, tools, context);
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
    const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt, agent.organization_id);

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
    context: {
      conversationId: string;
      organizationId: string;
      userId: string;
      agentId: string;
    },
  ): Promise<{
    success: boolean;
    content?: string;
    tool_calls?: any;
    cost: CostCalculation;
    error?: string;
  }> {
    const provider = new AnthropicProvider();

    // Load system prompt with SOPs appended
    const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt, agent.organization_id);

    // DEBUG: Log the system prompt to verify exact scripts are being included
    console.log('[DEBUG] System prompt length:', systemPrompt.length);
    console.log('[DEBUG] System prompt preview (first 2000 chars):');
    console.log(systemPrompt.substring(0, 2000));
    console.log('[DEBUG] Contains exact script header:', systemPrompt.includes('🚨🚨🚨 ABSOLUTE REQUIREMENT'));
    console.log('[DEBUG] Contains second message template:', systemPrompt.includes('Thanks [lead name], and what is your main goal'));

    const messages = messageHistory
      .filter((msg) => msg.role !== "system")
      .filter((msg) => {
        // Anthropic requires all messages to have non-empty content
        // (except the optional final assistant message)
        // Filter out messages with null/empty content
        if (!msg.content || msg.content.trim() === "") {
          console.log(`[Orchestrator] Skipping message with empty content (role: ${msg.role})`);
          return false;
        }
        return true;
      })
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
          content: msg.content,
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

    // Execute tools if Claude requested them
    if (toolUses.length > 0) {
      console.log(`[Orchestrator] Executing ${toolUses.length} tools...`);

      // Build messages array for the second turn
      const followUpMessages = [...messages];

      // Add Claude's first response with tool uses
      followUpMessages.push({
        role: "assistant" as const,
        content: result.content || [],
      });

      // Collect tool results for database storage
      const toolResults: any[] = [];

      // Execute each tool and add results
      for (const toolUse of toolUses) {
        console.log(`[Orchestrator] Executing tool: ${toolUse.name}`);

        try {
          // Execute the tool
          const toolResult = await this.toolRegistry.executeTool(
            toolUse.name,
            toolUse.input,
            {
              agentId: context.agentId,
              organizationId: context.organizationId,
              conversationId: context.conversationId,
              userId: context.userId,
            }
          );

          console.log(`[Orchestrator] Tool result:`, toolResult.success ? 'SUCCESS' : 'FAILED');
          if (!toolResult.success) {
            console.log(`[Orchestrator] Tool error details:`, JSON.stringify(toolResult, null, 2));
          }

          // Store tool result for database (NEW)
          toolResults.push({
            tool_use_id: toolUse.id,
            tool_name: toolUse.name,
            result: toolResult,
          });

          // Add tool result to messages
          followUpMessages.push({
            role: "user" as const,
            content: [{
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult),
              is_error: !toolResult.success, // Mark as error so Claude knows it failed
            }],
          });
        } catch (error: any) {
          console.error(`[Orchestrator] Tool execution error:`, error.message);

          const errorResult = {
            success: false,
            error: error.message || "Tool execution failed",
          };

          // Log to self-debug system (NEW)
          await logToolError(
            {
              agentId: context.agentId,
              conversationId: context.conversationId,
              organizationId: context.organizationId,
            },
            {
              toolName: toolUse.name,
              toolInput: toolUse.input,
              toolOutput: errorResult,
              errorMessage: error.message || "Tool execution failed",
              errorStack: error.stack,
            }
          );

          // Store error result for database (NEW)
          toolResults.push({
            tool_use_id: toolUse.id,
            tool_name: toolUse.name,
            result: errorResult,
          });

          // Add error result to messages
          followUpMessages.push({
            role: "user" as const,
            content: [{
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: JSON.stringify(errorResult),
            }],
          });
        }
      }

      // Call Claude again with tool results
      console.log(`[Orchestrator] Sending tool results back to Claude...`);
      const finalResult = await provider.execute(followUpMessages, {
        model: agent.model,
        temperature: agent.temperature ?? 0.7,
        max_tokens: agent.max_tokens ?? 4096,
        system: systemPrompt,
        tools: tools.length > 0 ? tools : undefined,
      });

      if (!finalResult.success) {
        return {
          success: false,
          error: finalResult.error,
          cost: {
            ...result.cost,
            // Combine costs from both calls
            inputTokens: result.cost.inputTokens + (finalResult.cost?.inputTokens || 0),
            outputTokens: result.cost.outputTokens + (finalResult.cost?.outputTokens || 0),
            totalTokens: result.cost.totalTokens + (finalResult.cost?.totalTokens || 0),
            costBaseCents: result.cost.costBaseCents + (finalResult.cost?.costBaseCents || 0),
            costBilledCents: result.cost.costBilledCents + (finalResult.cost?.costBilledCents || 0),
          },
        };
      }

      // Extract final text content
      const finalText = finalResult.content
        ?.filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("") || "";

      // Check for hallucinations (agent claiming success when tools failed) (NEW)
      const hallucinationCheck = detectPotentialHallucination(finalText, toolResults);
      if (hallucinationCheck.detected) {
        console.warn(`[Orchestrator] Hallucination detected: ${hallucinationCheck.reason}`);
        // Log hallucination for debugging (don't block response)
        await logHallucinationDetected(
          {
            agentId: context.agentId,
            conversationId: context.conversationId,
            organizationId: context.organizationId,
          },
          {
            detectedIn: "final_response",
            actualResult: toolResults,
            claimedResult: finalText.substring(0, 200), // First 200 chars
          }
        );
      }

      // Log failed tool executions (success: false) (NEW)
      for (const toolResult of toolResults) {
        if (toolResult.result && !toolResult.result.success) {
          await logToolError(
            {
              agentId: context.agentId,
              conversationId: context.conversationId,
              organizationId: context.organizationId,
            },
            {
              toolName: toolResult.tool_name,
              toolInput: toolUses.find((t) => t.id === toolResult.tool_use_id)?.input || {},
              toolOutput: toolResult.result,
              errorMessage: toolResult.result.error || "Tool execution failed",
            }
          );
        }
      }

      // Return final response with combined costs
      return {
        success: true,
        content: finalText,
        tool_calls: toolUses, // Store original tool calls
        tool_results: toolResults, // Store tool execution results (NEW)
        cost: {
          ...result.cost,
          inputTokens: result.cost.inputTokens + finalResult.cost.inputTokens,
          outputTokens: result.cost.outputTokens + finalResult.cost.outputTokens,
          totalTokens: result.cost.totalTokens + finalResult.cost.totalTokens,
          costBaseCents: result.cost.costBaseCents + finalResult.cost.costBaseCents,
          costBilledCents: result.cost.costBilledCents + finalResult.cost.costBilledCents,
        },
      };
    }

    // No tool uses, return text response
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
      const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt, agent.organization_id);

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
      const systemPrompt = await this.loadAgentSystemPrompt(agent.id, agent.system_prompt, agent.organization_id);

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
