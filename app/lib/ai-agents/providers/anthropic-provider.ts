/**
 * Anthropic Provider for AI Agents
 * Handles tool use and cost tracking
 */

import Anthropic from "@anthropic-ai/sdk";
import { calculateCost, type CostCalculation } from "../cost-tracker";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content:
    | string
    | Array<{
        type: "text" | "tool_use" | "tool_result";
        text?: string;
        id?: string;
        name?: string;
        input?: any;
        tool_use_id?: string;
        content?: string | Array<{ type: string; text: string }>;
      }>;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export interface AnthropicExecutionOptions {
  model: string;
  temperature?: number;
  max_tokens?: number;
  system?: string;
  tools?: AnthropicTool[];
}

export interface AnthropicExecutionResult {
  success: boolean;
  content?: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: any;
  }>;
  stopReason?: string;
  cost: CostCalculation;
  error?: string;
}

export class AnthropicProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Execute a message with tool use support
   */
  async execute(
    messages: AnthropicMessage[],
    options: AnthropicExecutionOptions,
  ): Promise<AnthropicExecutionResult> {
    const startTime = Date.now();

    try {
      // Call Anthropic API
      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.max_tokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system: options.system,
        tools: options.tools,
        messages: messages.map((msg) => {
          // Handle both string and structured content
          if (typeof msg.content === "string") {
            return {
              role: msg.role,
              content: msg.content,
            };
          }

          return {
            role: msg.role,
            content: msg.content,
          };
        }),
      });

      const executionTimeMs = Date.now() - startTime;

      // Calculate cost
      const usage = response.usage;
      const cost = await calculateCost({
        model: options.model,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      });

      return {
        success: true,
        content: response.content as any,
        stopReason: response.stop_reason,
        cost: {
          ...cost,
          executionTimeMs,
        },
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      return {
        success: false,
        error: error.message || "Anthropic execution failed",
        cost: {
          model: options.model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costBaseCents: 0,
          costBilledCents: 0,
          markupPercentage: 20,
          executionTimeMs,
        },
      };
    }
  }

  /**
   * Stream a message (for UI chat interfaces)
   */
  async *stream(
    messages: AnthropicMessage[],
    options: AnthropicExecutionOptions,
  ): AsyncGenerator<{
    type: string;
    delta?: string;
    toolUse?: { id: string; name: string; input: any };
    done: boolean;
  }> {
    const stream = await this.client.messages.create({
      model: options.model,
      max_tokens: options.max_tokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      tools: options.tools,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : msg.content,
      })),
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const delta = event.delta;

        if (delta.type === "text_delta") {
          yield {
            type: "text",
            delta: delta.text,
            done: false,
          };
        }
      } else if (event.type === "content_block_start") {
        const contentBlock = event.content_block;

        if (contentBlock.type === "tool_use") {
          yield {
            type: "tool_use",
            toolUse: {
              id: contentBlock.id,
              name: contentBlock.name,
              input: contentBlock.input,
            },
            done: false,
          };
        }
      } else if (event.type === "message_stop") {
        yield {
          type: "done",
          done: true,
        };
      }
    }
  }

  /**
   * Convert tool definitions to Anthropic format
   */
  static formatTools(
    tools: Array<{
      name: string;
      description: string;
      input_schema: any;
    }>,
  ): AnthropicTool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  /**
   * Extract tool uses from response content
   */
  static extractToolUses(content: any[]): Array<{
    id: string;
    name: string;
    input: any;
  }> {
    return content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      }));
  }

  /**
   * Extract text from response content
   */
  static extractText(content: any[]): string {
    return content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  /**
   * Test connection to Anthropic
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "Hello" }],
      });

      return {
        success: response.content.length > 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
let anthropicProvider: AnthropicProvider | null = null;

export function getAnthropicProvider(): AnthropicProvider {
  if (!anthropicProvider) {
    anthropicProvider = new AnthropicProvider();
  }
  return anthropicProvider;
}
