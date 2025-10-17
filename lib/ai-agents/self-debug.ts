/**
 * Self-Debugging System for AI Agents
 *
 * Automatically detects and logs errors, preventing hallucinations
 */

import { createAdminClient } from "@/app/lib/supabase/admin";

export interface DebugContext {
  agentId: string;
  conversationId?: string;
  messageId?: string;
  organizationId?: string;
}

export interface ToolExecutionError {
  toolName: string;
  toolInput: any;
  toolOutput: any;
  errorMessage: string;
  errorStack?: string;
}

/**
 * Log a tool execution error to the debug system
 * This prevents the agent from hallucinating when tools fail
 */
export async function logToolError(
  context: DebugContext,
  error: ToolExecutionError
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("agent_debug_logs").insert({
      agent_id: context.agentId,
      conversation_id: context.conversationId,
      message_id: context.messageId,
      log_level: "error",
      category: "tool_execution",
      error_message: error.errorMessage,
      error_stack: error.errorStack,
      tool_name: error.toolName,
      tool_input: error.toolInput,
      tool_output: error.toolOutput,
      context: {
        organization_id: context.organizationId,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    console.log(`[Self-Debug] Logged tool error: ${error.toolName} - ${error.errorMessage}`);
  } catch (logError) {
    // Don't throw - logging failure shouldn't break the agent
    console.error("[Self-Debug] Failed to log tool error:", logError);
  }
}

/**
 * Log a hallucination detection event
 * Triggered when agent tries to claim a tool succeeded when it failed
 */
export async function logHallucinationDetected(
  context: DebugContext,
  details: {
    detectedIn: string; // Where in the response was hallucination detected
    toolName?: string;
    actualResult: any;
    claimedResult: string;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("agent_debug_logs").insert({
      agent_id: context.agentId,
      conversation_id: context.conversationId,
      message_id: context.messageId,
      log_level: "warning",
      category: "hallucination_detected",
      error_message: `Hallucination detected in ${details.detectedIn}`,
      tool_name: details.toolName,
      context: {
        detected_in: details.detectedIn,
        actual_result: details.actualResult,
        claimed_result: details.claimedResult,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    console.log(`[Self-Debug] Hallucination detected: ${details.detectedIn}`);
  } catch (logError) {
    console.error("[Self-Debug] Failed to log hallucination:", logError);
  }
}

/**
 * Log missing data or configuration issues
 */
export async function logMissingData(
  context: DebugContext,
  details: {
    missingField: string;
    attemptedOperation: string;
    impact: string;
  }
): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from("agent_debug_logs").insert({
      agent_id: context.agentId,
      conversation_id: context.conversationId,
      message_id: context.messageId,
      log_level: "warning",
      category: "missing_data",
      error_message: `Missing ${details.missingField} for ${details.attemptedOperation}`,
      context: {
        missing_field: details.missingField,
        attempted_operation: details.attemptedOperation,
        impact: details.impact,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    console.log(`[Self-Debug] Missing data: ${details.missingField}`);
  } catch (logError) {
    console.error("[Self-Debug] Failed to log missing data:", logError);
  }
}

/**
 * Get recent debug logs for an agent
 */
export async function getAgentDebugLogs(
  agentId: string,
  options: {
    limit?: number;
    level?: string;
    category?: string;
    status?: string;
  } = {}
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("agent_debug_logs")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.level) {
      query = query.eq("log_level", options.level);
    }

    if (options.category) {
      query = query.eq("category", options.category);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Self-Debug] Error fetching logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Self-Debug] Error in getAgentDebugLogs:", error);
    return [];
  }
}

/**
 * Enhance system prompt with self-debugging instructions
 */
export function addSelfDebugInstructions(systemPrompt: string): string {
  const debugInstructions = `

🔍 **SELF-DEBUGGING - CRITICAL ERROR HANDLING**

When a tool execution FAILS, you MUST:

1. ❌ **NEVER claim the tool succeeded** - Check the tool result's "success" field
2. ✅ **Acknowledge the specific error** - Tell the user exactly what went wrong
3. 🔧 **Suggest alternatives** - Offer different approaches or manual steps
4. 📊 **Log for debugging** - Error is automatically logged for investigation

**Examples of Correct Error Handling:**

Tool Result: { "success": false, "error": "GoHighLevel API key not configured" }
❌ WRONG: "I've booked your appointment for 2pm tomorrow!"
✅ CORRECT: "I'm unable to book appointments right now because the GoHighLevel calendar isn't set up yet. Would you like me to send you a booking link instead?"

Tool Result: { "success": false, "error": "No available slots found" }
❌ WRONG: "You're all set for Tuesday at 10am!"
✅ CORRECT: "Unfortunately there are no available slots on that date. Would you like to try a different day?"

**Golden Rules:**
- success: false = ADMIT THE FAILURE
- success: true = Only then claim success
- When in doubt, ASK the user instead of guessing
- Never invent data that wasn't in the tool result

**Self-Check Before Responding:**
1. Did I check the "success" field in every tool result?
2. Am I only mentioning data that was actually returned?
3. If a tool failed, did I acknowledge it honestly?
4. Did I offer a helpful alternative?
`;

  // Add self-debug instructions after the main system prompt
  return systemPrompt + debugInstructions;
}

/**
 * Validate agent response for potential hallucinations
 * Returns true if response looks suspicious
 */
export function detectPotentialHallucination(
  response: string,
  toolResults: any[]
): { detected: boolean; reason?: string; suggestion?: string } {
  // Check if agent claimed success when tools failed
  const failedTools = toolResults.filter((r) => r.result?.success === false);

  if (failedTools.length > 0) {
    // Check for success-indicating phrases when tools failed
    const successPhrases = [
      "i've booked",
      "you're all set",
      "appointment confirmed",
      "successfully scheduled",
      "reservation made",
      "booking complete",
    ];

    const lowerResponse = response.toLowerCase();
    const containsSuccessPhrase = successPhrases.some((phrase) =>
      lowerResponse.includes(phrase)
    );

    if (containsSuccessPhrase) {
      return {
        detected: true,
        reason: `Agent claimed success but ${failedTools.length} tool(s) failed`,
        suggestion: `Response should acknowledge: ${failedTools.map((t) => t.result.error).join(", ")}`,
      };
    }
  }

  // Check for specific data claims without tool results
  if (toolResults.length === 0) {
    const dataClaimPhrases = [
      "i have these times available",
      "here are the available slots",
      "you can book at",
    ];

    const lowerResponse = response.toLowerCase();
    const containsDataClaim = dataClaimPhrases.some((phrase) =>
      lowerResponse.includes(phrase)
    );

    if (containsDataClaim) {
      return {
        detected: true,
        reason: "Agent is claiming to have data without calling any tools",
        suggestion: "Should call appropriate tool first to get real data",
      };
    }
  }

  return { detected: false };
}
