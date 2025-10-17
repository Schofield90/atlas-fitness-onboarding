/**
 * AI Agent Tool Registry System
 *
 * Central registry for all AI agent tools with support for:
 * - Tool registration and discovery
 * - OpenAI and Anthropic format conversion
 * - Tool execution with context
 * - Database synchronization
 */

import { AgentTool, ToolExecutionContext, ToolExecutionResult } from "./types";
import { createAdminClient } from "@/app/lib/supabase/admin";

// Import all tool categories
import { DATA_TOOLS } from "./data-tools";
import { ANALYTICS_TOOLS } from "./analytics-tools";
import { MESSAGING_TOOLS } from "./messaging-tools";
import { AUTOMATION_TOOLS } from "./automation-tools";
import { GOHIGHLEVEL_TOOLS } from "./gohighlevel-tools";

/**
 * Tool Registry Class
 * Manages all available tools and provides conversion utilities
 */
export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    // Auto-register all tools on instantiation
    this.registerAllTools();
  }

  /**
   * Register all tools from all categories
   */
  private registerAllTools(): void {
    const allTools = [
      ...DATA_TOOLS,
      ...ANALYTICS_TOOLS,
      ...MESSAGING_TOOLS,
      ...AUTOMATION_TOOLS,
      ...GOHIGHLEVEL_TOOLS,
    ];

    allTools.forEach((tool) => this.registerTool(tool));
  }

  /**
   * Register a single tool
   */
  registerTool(tool: AgentTool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered. Overwriting.`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * Get a specific tool by ID
   */
  getTool(id: string): AgentTool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools filtered by category
   */
  getToolsByCategory(category: string): AgentTool[] {
    return this.getAllTools().filter((tool) => tool.category === category);
  }

  /**
   * Get enabled tools only
   */
  getEnabledTools(): AgentTool[] {
    return this.getAllTools().filter((tool) => tool.enabled);
  }

  /**
   * Get tools by IDs and convert to OpenAI function format
   */
  getToolsForOpenAI(toolIds: string[]): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, any>;
        required: string[];
      };
    };
  }> {
    return toolIds
      .map((id) => this.getTool(id))
      .filter((tool): tool is AgentTool => tool !== undefined && tool.enabled)
      .map((tool) => ({
        type: "function" as const,
        function: tool.toOpenAIFunction(),
      }));
  }

  /**
   * Get tools by IDs and convert to Anthropic tool format
   */
  getToolsForAnthropic(toolIds: string[]): Array<{
    name: string;
    description: string;
    input_schema: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  }> {
    return toolIds
      .map((id) => this.getTool(id))
      .filter((tool): tool is AgentTool => tool !== undefined && tool.enabled)
      .map((tool) => tool.toAnthropicTool());
  }

  /**
   * Execute a tool with given parameters and context
   */
  async executeTool(
    toolId: string,
    params: any,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.getTool(toolId);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolId}' not found in registry`,
      };
    }

    if (!tool.enabled) {
      return {
        success: false,
        error: `Tool '${toolId}' is disabled`,
      };
    }

    // Check permissions if required
    if (tool.requiresPermission) {
      // TODO: Implement permission checking logic
      // For now, we'll skip permission checks
    }

    try {
      const result = await tool.execute(params, context);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
        metadata: {
          executionTimeMs: 0,
        },
      };
    }
  }

  /**
   * Get tool count by category
   */
  getToolStats(): Record<string, number> {
    const stats: Record<string, number> = {
      total: this.tools.size,
      enabled: 0,
      disabled: 0,
    };

    const categories = new Set<string>();

    this.getAllTools().forEach((tool) => {
      if (tool.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      categories.add(tool.category);
      stats[tool.category] = (stats[tool.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Search tools by keyword in name or description
   */
  searchTools(keyword: string): AgentTool[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getAllTools().filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerKeyword) ||
        tool.description.toLowerCase().includes(lowerKeyword) ||
        tool.id.toLowerCase().includes(lowerKeyword),
    );
  }
}

/**
 * Singleton instance of the tool registry
 */
export const toolRegistry = new ToolRegistry();

/**
 * Helper function to seed the ai_agent_tools table with all registered tools
 */
export async function loadToolsToDatabase(): Promise<{
  success: boolean;
  toolsLoaded: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const allTools = toolRegistry.getAllTools();
  const errors: string[] = [];
  let toolsLoaded = 0;

  for (const tool of allTools) {
    try {
      const { error } = await supabase.from("ai_agent_tools").insert({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        parameters_schema: tool.toOpenAIFunction().parameters,
        requires_permission: tool.requiresPermission || null,
        is_system: tool.isSystem,
        enabled: tool.enabled,
        metadata: {
          last_synced: new Date().toISOString(),
        },
      });

      if (error) {
        // If tool already exists, that's okay
        if (!error.message.includes("duplicate key")) {
          errors.push(`${tool.id}: ${error.message}`);
        }
      } else {
        toolsLoaded++;
      }
    } catch (err: any) {
      errors.push(`${tool.id}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    toolsLoaded,
    errors,
  };
}

/**
 * Helper function to sync existing tools in database with current registry
 * Updates metadata, descriptions, and parameters for existing tools
 */
export async function syncToolsToDatabase(): Promise<{
  success: boolean;
  toolsUpdated: number;
  toolsCreated: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const allTools = toolRegistry.getAllTools();
  const errors: string[] = [];
  let toolsUpdated = 0;
  let toolsCreated = 0;

  for (const tool of allTools) {
    try {
      // Try to update existing tool
      const { error: updateError, count } = await supabase
        .from("ai_agent_tools")
        .update({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          parameters_schema: tool.toOpenAIFunction().parameters,
          requires_permission: tool.requiresPermission || null,
          is_system: tool.isSystem,
          enabled: tool.enabled,
          metadata: {
            last_synced: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", tool.id);

      if (updateError) {
        errors.push(`${tool.id}: ${updateError.message}`);
        continue;
      }

      // If no rows updated, tool doesn't exist - create it
      if (count === 0) {
        const { error: insertError } = await supabase
          .from("ai_agent_tools")
          .insert({
            id: tool.id,
            name: tool.name,
            description: tool.description,
            category: tool.category,
            parameters_schema: tool.toOpenAIFunction().parameters,
            requires_permission: tool.requiresPermission || null,
            is_system: tool.isSystem,
            enabled: tool.enabled,
            metadata: {
              last_synced: new Date().toISOString(),
            },
          });

        if (insertError) {
          errors.push(`${tool.id}: ${insertError.message}`);
        } else {
          toolsCreated++;
        }
      } else {
        toolsUpdated++;
      }
    } catch (err: any) {
      errors.push(`${tool.id}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    toolsUpdated,
    toolsCreated,
    errors,
  };
}

/**
 * Get tools from database (for displaying in UI)
 */
export async function getToolsFromDatabase(filters?: {
  category?: string;
  enabled?: boolean;
  search?: string;
}): Promise<{
  success: boolean;
  tools: any[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("ai_agent_tools")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (filters?.enabled !== undefined) {
      query = query.eq("enabled", filters.enabled);
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,` +
          `description.ilike.%${filters.search}%,` +
          `id.ilike.%${filters.search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      tools: data || [],
    };
  } catch (error: any) {
    return {
      success: false,
      tools: [],
      error: error.message,
    };
  }
}

/**
 * Validate tool execution permissions
 */
export async function validateToolPermission(
  toolId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const tool = toolRegistry.getTool(toolId);
  if (!tool || !tool.requiresPermission) {
    return true; // No permission required
  }

  // TODO: Implement actual permission checking
  // For now, return true (all permissions granted)
  return true;
}

/**
 * Export tool registry stats
 */
export function getRegistryStats() {
  return {
    stats: toolRegistry.getToolStats(),
    tools: {
      all: toolRegistry.getAllTools().map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        enabled: t.enabled,
      })),
      byCategory: {
        data: toolRegistry.getToolsByCategory("data").map((t) => t.id),
        analytics: toolRegistry
          .getToolsByCategory("analytics")
          .map((t) => t.id),
        messaging: toolRegistry
          .getToolsByCategory("messaging")
          .map((t) => t.id),
        automation: toolRegistry
          .getToolsByCategory("automation")
          .map((t) => t.id),
        crm: toolRegistry.getToolsByCategory("crm").map((t) => t.id),
        reports: toolRegistry.getToolsByCategory("reports").map((t) => t.id),
      },
    },
  };
}
