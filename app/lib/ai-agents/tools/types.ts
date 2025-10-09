/**
 * AI Agent Tool System Types
 */

import { z } from "zod";

/**
 * Tool execution context (provided to all tools)
 */
export interface ToolExecutionContext {
  organizationId: string;
  agentId: string;
  userId?: string; // Staff member if chatting
  conversationId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    recordsAffected?: number;
    executionTimeMs?: number;
    cached?: boolean;
  };
}

/**
 * Tool definition
 */
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category:
    | "reports"
    | "messaging"
    | "analytics"
    | "data"
    | "automation"
    | "crm";
  parametersSchema: z.ZodSchema;
  requiresPermission?: string;
  isSystem: boolean;
  enabled: boolean;

  /**
   * Execute the tool
   */
  execute: (
    params: any,
    context: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;

  /**
   * Get OpenAI function definition
   */
  toOpenAIFunction: () => {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };

  /**
   * Get Anthropic tool definition
   */
  toAnthropicTool: () => {
    name: string;
    description: string;
    input_schema: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Base tool implementation
 */
export abstract class BaseTool implements AgentTool {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category:
    | "reports"
    | "messaging"
    | "analytics"
    | "data"
    | "automation"
    | "crm";
  abstract parametersSchema: z.ZodSchema;

  requiresPermission?: string;
  isSystem: boolean = true;
  enabled: boolean = true;

  abstract execute(
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>;

  /**
   * Convert Zod schema to JSON Schema (for OpenAI/Anthropic)
   */
  protected zodToJsonSchema(schema: z.ZodSchema): any {
    // This is a simplified conversion - for production use zodToJsonSchema library
    const shape = (schema as any)._def?.shape?.();
    if (!shape) return { type: "object", properties: {}, required: [] };

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as z.ZodTypeAny;
      properties[key] = this.zodTypeToJsonSchema(zodType);

      if (!zodType.isOptional()) {
        required.push(key);
      }
    }

    return { type: "object", properties, required };
  }

  private zodTypeToJsonSchema(zodType: z.ZodTypeAny): any {
    const typeName = (zodType as any)._def?.typeName;
    const description = (zodType as any)._def?.description;

    let schema: any = {};

    switch (typeName) {
      case "ZodString":
        schema = { type: "string" };
        break;
      case "ZodNumber":
        schema = { type: "number" };
        break;
      case "ZodBoolean":
        schema = { type: "boolean" };
        break;
      case "ZodArray":
        schema = {
          type: "array",
          items: this.zodTypeToJsonSchema((zodType as any)._def.type),
        };
        break;
      case "ZodEnum":
        schema = {
          type: "string",
          enum: (zodType as any)._def.values,
        };
        break;
      case "ZodOptional":
        return this.zodTypeToJsonSchema((zodType as any)._def.innerType);
      case "ZodDefault":
        schema = this.zodTypeToJsonSchema((zodType as any)._def.innerType);
        schema.default = (zodType as any)._def.defaultValue();
        break;
      default:
        schema = { type: "string" };
    }

    if (description) {
      schema.description = description;
    }

    return schema;
  }

  toOpenAIFunction() {
    const jsonSchema = this.zodToJsonSchema(this.parametersSchema);
    return {
      name: this.id,
      description: this.description,
      parameters: jsonSchema,
    };
  }

  toAnthropicTool() {
    const jsonSchema = this.zodToJsonSchema(this.parametersSchema);
    return {
      name: this.id,
      description: this.description,
      input_schema: jsonSchema,
    };
  }
}
