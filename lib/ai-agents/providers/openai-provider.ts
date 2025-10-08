/**
 * OpenAI Provider for AI Agents
 * Handles function calling and cost tracking
 */

import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { calculateCost, type CostCalculation } from '../cost-tracker';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIExecutionOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  tools?: ChatCompletionTool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

export interface OpenAIExecutionResult {
  success: boolean;
  message?: OpenAI.Chat.Completions.ChatCompletionMessage;
  toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  cost: CostCalculation;
  error?: string;
}

export class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Execute a chat completion with function calling support
   */
  async execute(
    messages: OpenAIMessage[],
    options: OpenAIExecutionOptions
  ): Promise<OpenAIExecutionResult> {
    const startTime = Date.now();

    try {
      // Convert to OpenAI format
      const openaiMessages: ChatCompletionMessageParam[] = messages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'tool',
            content: msg.content || '',
            tool_call_id: msg.tool_call_id || ''
          };
        }

        if (msg.role === 'assistant' && msg.tool_calls) {
          return {
            role: 'assistant',
            content: msg.content,
            tool_calls: msg.tool_calls
          };
        }

        return {
          role: msg.role,
          content: msg.content || ''
        } as ChatCompletionMessageParam;
      });

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: openaiMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 4096,
        tools: options.tools,
        tool_choice: options.tool_choice
      });

      const executionTimeMs = Date.now() - startTime;

      // Calculate cost
      const usage = completion.usage;
      const cost = await calculateCost({
        model: options.model,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0
      });

      const responseMessage = completion.choices[0]?.message;

      return {
        success: true,
        message: responseMessage,
        toolCalls: responseMessage?.tool_calls,
        cost: {
          ...cost,
          executionTimeMs
        }
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      return {
        success: false,
        error: error.message || 'OpenAI execution failed',
        cost: {
          model: options.model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costBaseCents: 0,
          costBilledCents: 0,
          markupPercentage: 20,
          executionTimeMs
        }
      };
    }
  }

  /**
   * Stream a chat completion (for UI chat interfaces)
   */
  async *stream(
    messages: OpenAIMessage[],
    options: OpenAIExecutionOptions
  ): AsyncGenerator<{
    delta: string;
    toolCalls?: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[];
    done: boolean;
  }> {
    const openaiMessages: ChatCompletionMessageParam[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content || '',
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
    })) as ChatCompletionMessageParam[];

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 4096,
      tools: options.tools,
      tool_choice: options.tool_choice,
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      yield {
        delta: delta?.content || '',
        toolCalls: delta?.tool_calls,
        done: chunk.choices[0]?.finish_reason !== null
      };
    }
  }

  /**
   * Convert tool definitions to OpenAI format
   */
  static formatTools(tools: Array<{
    name: string;
    description: string;
    parameters: any;
  }>): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Test connection to OpenAI
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });

      return {
        success: completion.choices.length > 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
let openaiProvider: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProvider) {
    openaiProvider = new OpenAIProvider();
  }
  return openaiProvider;
}
