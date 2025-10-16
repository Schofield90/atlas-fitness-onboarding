/**
 * Sentiment Detection System for AI Agents
 *
 * Automatically detects negative sentiment and extreme responses
 * Flags conversations for human review and training
 */

import { createAdminClient } from "@/app/lib/supabase/admin";

export interface SentimentDetectionResult {
  shouldFlag: boolean;
  matchedKeywords: string[];
  sentimentType: string;
  severity: string;
  detectionMetadata: any;
}

export interface FlagContext {
  agentId: string;
  conversationId: string;
  messageId: string;
  organizationId: string;
  triggerMessage: string;
  agentResponse: string;
}

/**
 * Detect sentiment in a user message using keyword analysis
 */
export async function detectSentiment(
  messageText: string,
  organizationId: string
): Promise<SentimentDetectionResult> {
  try {
    const supabase = createAdminClient();

    // Call the database function for sentiment detection
    const { data, error } = await supabase.rpc("detect_sentiment_in_message", {
      p_message_text: messageText,
      p_organization_id: organizationId,
    });

    if (error) {
      console.error("[Sentiment] Detection error:", error);
      return {
        shouldFlag: false,
        matchedKeywords: [],
        sentimentType: "neutral",
        severity: "low",
        detectionMetadata: { error: error.message },
      };
    }

    // Database function returns array with single result
    const result = Array.isArray(data) ? data[0] : data;

    return {
      shouldFlag: result.should_flag || false,
      matchedKeywords: result.matched_keywords || [],
      sentimentType: result.sentiment_type || "neutral",
      severity: result.max_severity || "low",
      detectionMetadata: result.detection_metadata || {},
    };
  } catch (error: any) {
    console.error("[Sentiment] Unexpected error:", error);
    return {
      shouldFlag: false,
      matchedKeywords: [],
      sentimentType: "neutral",
      severity: "low",
      detectionMetadata: { error: error.message },
    };
  }
}

/**
 * Create a conversation flag for human review
 */
export async function flagConversation(
  context: FlagContext,
  detectionResult: SentimentDetectionResult
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    // Build detection results JSONB
    const detectionResults = {
      matched_keywords: detectionResult.matchedKeywords,
      sentiment_type: detectionResult.sentimentType,
      max_severity: detectionResult.severity,
      ...detectionResult.detectionMetadata,
    };

    // Call the auto_flag_conversation function
    const { data, error } = await supabase.rpc("auto_flag_conversation", {
      p_agent_id: context.agentId,
      p_conversation_id: context.conversationId,
      p_message_id: context.messageId,
      p_organization_id: context.organizationId,
      p_trigger_message: context.triggerMessage,
      p_agent_response: context.agentResponse,
      p_detection_results: detectionResults,
    });

    if (error) {
      console.error("[Sentiment] Flag creation error:", error);
      return null;
    }

    console.log(
      `[Sentiment] Conversation flagged for review: ${data} (Severity: ${detectionResult.severity})`
    );
    return data;
  } catch (error: any) {
    console.error("[Sentiment] Unexpected flagging error:", error);
    return null;
  }
}

/**
 * Check if a conversation should be flagged based on message content
 * Returns flag ID if flagged, null otherwise
 */
export async function checkAndFlagIfNeeded(
  userMessage: string,
  agentResponse: string,
  context: FlagContext
): Promise<string | null> {
  // Detect sentiment in user's message
  const detection = await detectSentiment(userMessage, context.organizationId);

  // If sentiment is negative/extreme, flag for review
  if (detection.shouldFlag) {
    console.log(
      `[Sentiment] Negative sentiment detected: ${detection.matchedKeywords.join(", ")}`
    );

    const flagId = await flagConversation(context, detection);
    return flagId;
  }

  return null;
}

/**
 * Get pending flags for daily digest (not yet included in any digest)
 */
export async function getPendingFlagsForDigest(
  organizationId?: string
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("ai_agent_conversation_flags")
      .select(
        `
        *,
        agent:ai_agents(id, name),
        conversation:ai_agent_conversations(id, lead_id),
        message:ai_agent_messages(id, role, content)
      `
      )
      .eq("review_status", "pending")
      .is("included_in_digest_at", null)
      .order("severity", { ascending: false }) // Critical first
      .order("created_at", { ascending: false }); // Newest first

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Sentiment] Error fetching pending flags:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[Sentiment] Error in getPendingFlagsForDigest:", error);
    return [];
  }
}

/**
 * Mark flags as included in digest
 */
export async function markFlagsIncludedInDigest(
  flagIds: string[]
): Promise<void> {
  if (flagIds.length === 0) return;

  try {
    const supabase = createAdminClient();

    await supabase
      .from("ai_agent_conversation_flags")
      .update({
        included_in_digest_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", flagIds);

    console.log(`[Sentiment] Marked ${flagIds.length} flags as included in digest`);
  } catch (error) {
    console.error("[Sentiment] Error marking flags in digest:", error);
  }
}

/**
 * Get conversation context for a flag (last 10 messages)
 */
export async function getConversationContext(
  conversationId: string
): Promise<any[]> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ai_agent_messages")
      .select("role, content, created_at, tool_calls, tool_results")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[Sentiment] Error fetching conversation context:", error);
      return [];
    }

    // Reverse to chronological order
    return (data || []).reverse();
  } catch (error) {
    console.error("[Sentiment] Error in getConversationContext:", error);
    return [];
  }
}
