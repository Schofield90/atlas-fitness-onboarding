import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AIModelManager } from "../config/ai-models";

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class UnifiedAIClient {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // Clients will be initialized lazily when needed
  }

  private initializeOpenAI(): void {
    if (!this.openai && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private initializeAnthropic(): void {
    if (!this.anthropic && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Create a chat completion using the best available model
   */
  async createChatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: "json_object" | "text" };
  }): Promise<AIResponse> {
    // Update model availability (checks for GPT-5)
    await AIModelManager.updateModelAvailability();

    // Get the best available model
    const model = AIModelManager.getBestChatModel();

    // Try OpenAI first
    this.initializeOpenAI();
    if (this.openai && model.provider === "openai") {
      try {
        const response = await this.openai.chat.completions.create({
          model: model.id,
          messages: params.messages as any,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          response_format: params.responseFormat,
        });

        return {
          content: response.choices[0].message.content || "",
          model: model.id,
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        console.error(`OpenAI API error with ${model.id}:`, error);

        // Try fallback to Anthropic if available
        const fallbackModel = AIModelManager.getFallbackChatModel();
        this.initializeAnthropic();
        if (fallbackModel && this.anthropic) {
          return this.createAnthropicCompletion(params, fallbackModel.id);
        }

        throw error;
      }
    }

    throw new Error("No AI providers available");
  }

  /**
   * Create embeddings using OpenAI
   */
  async createEmbedding(text: string): Promise<number[]> {
    this.initializeOpenAI();
    if (!this.openai) {
      throw new Error("OpenAI not initialized");
    }

    const model = AIModelManager.getBestEmbeddingModel();

    try {
      const response = await this.openai.embeddings.create({
        model: model.id,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error(`Embedding error with ${model.id}:`, error);
      throw error;
    }
  }

  /**
   * Fallback to Anthropic if OpenAI fails
   */
  private async createAnthropicCompletion(
    params: any,
    modelId: string,
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic not initialized as backup");
    }

    console.warn("Falling back to Anthropic due to OpenAI failure");

    const response = await this.anthropic.messages.create({
      model: modelId,
      messages: params.messages.map((m: any) => ({
        role: m.role === "system" ? "assistant" : m.role,
        content: m.content,
      })),
      max_tokens: params.maxTokens || 1000,
      temperature: params.temperature || 0.7,
    });

    return {
      content:
        response.content[0].type === "text" ? response.content[0].text : "",
      model: modelId,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  /**
   * Get current model being used
   */
  getCurrentModel(): string {
    const model = AIModelManager.getBestChatModel();
    return `${model.name} (${model.id})`;
  }

  /**
   * Check if GPT-5 is available
   */
  async isGPT5Available(): Promise<boolean> {
    await AIModelManager.updateModelAvailability();
    const gpt5 = AIModelManager.getModel("gpt-5");
    return gpt5?.available || false;
  }
}

// Export singleton instance
export const aiClient = new UnifiedAIClient();
