/**
 * AI Agent Guardrails System
 * Checks safety rules before allowing AI to send messages
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  guardrailId?: string;
  guardrailName?: string;
  guardrailType?: string;
}

export interface GuardrailCheckContext {
  agentId: string;
  leadId: string;
  conversationId: string;
  ghlTags: string; // Comma-separated tags from GHL
  contactPhone: string;
  organizationId: string;
  supabase: SupabaseClient;
}

export interface Guardrail {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Main function to check all guardrails for an agent
 */
export async function checkAgentGuardrails(
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  try {
    // Fetch all enabled guardrails for this agent (ordered by sort_order)
    const { data: guardrails, error } = await context.supabase
      .from("agent_guardrails")
      .select(
        `
        guardrail_id,
        sort_order,
        guardrail:guardrails(*)
      `,
      )
      .eq("agent_id", context.agentId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Guardrails] Error fetching guardrails:", error);
      // If we can't fetch guardrails, allow the message (fail open)
      return { allowed: true };
    }

    if (!guardrails || guardrails.length === 0) {
      // No guardrails configured, allow message
      return { allowed: true };
    }

    // Extract guardrail objects
    const enabledGuardrails = guardrails
      .map((ag: any) => ag.guardrail)
      .filter((g: any) => g && g.enabled);

    if (enabledGuardrails.length === 0) {
      return { allowed: true };
    }

    console.log(
      `[Guardrails] Checking ${enabledGuardrails.length} guardrails for agent ${context.agentId}`,
    );

    // Check each guardrail in order
    for (const guardrail of enabledGuardrails) {
      const result = await checkSingleGuardrail(guardrail, context);

      if (!result.allowed) {
        // Guardrail blocked the message
        return {
          allowed: false,
          reason: result.reason,
          guardrailId: guardrail.id,
          guardrailName: guardrail.name,
          guardrailType: guardrail.type,
        };
      }
    }

    // All guardrails passed
    return { allowed: true };
  } catch (error: any) {
    console.error("[Guardrails] Error checking guardrails:", error);
    // Fail open: allow message if guardrail system has errors
    return { allowed: true };
  }
}

/**
 * Check a single guardrail
 */
async function checkSingleGuardrail(
  guardrail: Guardrail,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  console.log(
    `[Guardrails] Checking ${guardrail.type}: ${guardrail.name}`,
  );

  switch (guardrail.type) {
    case "tag_blocker":
      return checkTagBlocker(guardrail.config, context);
    case "business_hours":
      return checkBusinessHours(guardrail.config, context);
    case "rate_limit":
      return checkRateLimit(guardrail.config, context);
    case "lead_status":
      return checkLeadStatus(guardrail.config, context);
    case "human_takeover":
      return checkHumanTakeover(guardrail.config, context);
    case "conversation_status":
      return checkConversationStatus(guardrail.config, context);
    default:
      console.warn(
        `[Guardrails] Unknown guardrail type: ${guardrail.type}`,
      );
      return { allowed: true };
  }
}

/**
 * Tag Blocker Guardrail
 * Blocks messages if contact has specified tags
 */
async function checkTagBlocker(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const blockedTags = config.blocked_tags || [];
  const caseSensitive = config.case_sensitive || false;
  const matchType = config.match_type || "contains"; // "contains" or "exact"

  if (!blockedTags.length) {
    return { allowed: true };
  }

  // Parse GHL tags (comma-separated string)
  const contactTags = context.ghlTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // Check each blocked tag
  for (const blockedTag of blockedTags) {
    for (const contactTag of contactTags) {
      let isMatch = false;

      if (matchType === "exact") {
        // Exact match
        isMatch = caseSensitive
          ? contactTag === blockedTag
          : contactTag.toLowerCase() === blockedTag.toLowerCase();
      } else {
        // Contains match
        isMatch = caseSensitive
          ? contactTag.includes(blockedTag)
          : contactTag.toLowerCase().includes(blockedTag.toLowerCase());
      }

      if (isMatch) {
        return {
          allowed: false,
          reason: `Contact has blocked tag: "${contactTag}"`,
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Business Hours Guardrail
 * Only allows messages during configured business hours
 */
async function checkBusinessHours(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const timezone = config.timezone || "Europe/London";
  const schedule = config.schedule || {};

  // Get current time in configured timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts
    .find((p) => p.type === "weekday")
    ?.value.toLowerCase();
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
  );

  const currentTimeMinutes = hour * 60 + minute;

  // Check if today is enabled
  const dayConfig = schedule[weekday || ""];
  if (!dayConfig || dayConfig.enabled === false) {
    return {
      allowed: false,
      reason: `Outside business hours (${weekday} not enabled)`,
    };
  }

  // Parse start and end times
  const [startHour, startMinute] = (dayConfig.start || "09:00")
    .split(":")
    .map(Number);
  const [endHour, endMinute] = (dayConfig.end || "17:00")
    .split(":")
    .map(Number);

  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;

  if (
    currentTimeMinutes < startTimeMinutes ||
    currentTimeMinutes > endTimeMinutes
  ) {
    return {
      allowed: false,
      reason: `Outside business hours (${dayConfig.start}-${dayConfig.end} ${timezone})`,
    };
  }

  return { allowed: true };
}

/**
 * Rate Limit Guardrail
 * Limits how many messages can be sent to a lead per day/hour
 */
async function checkRateLimit(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const maxPerDay = config.max_messages_per_day || 3;
  const maxPerHour = config.max_messages_per_hour || null;
  const minMinutesBetween = config.min_minutes_between_messages || 120;

  // Count messages sent to this lead in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data: recentMessages, error } = await context.supabase
    .from("ai_agent_messages")
    .select("id, created_at")
    .eq("conversation_id", context.conversationId)
    .eq("role", "assistant")
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Guardrails] Error checking rate limit:", error);
    return { allowed: true }; // Fail open
  }

  if (!recentMessages) {
    return { allowed: true };
  }

  // Check daily limit
  if (recentMessages.length >= maxPerDay) {
    return {
      allowed: false,
      reason: `Daily message limit reached (${maxPerDay} messages per day)`,
    };
  }

  // Check hourly limit if configured
  if (maxPerHour) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const messagesLastHour = recentMessages.filter(
      (msg) => new Date(msg.created_at) > oneHourAgo,
    );

    if (messagesLastHour.length >= maxPerHour) {
      return {
        allowed: false,
        reason: `Hourly message limit reached (${maxPerHour} messages per hour)`,
      };
    }
  }

  // Check minimum time between messages
  if (recentMessages.length > 0 && minMinutesBetween) {
    const lastMessage = recentMessages[0];
    const lastMessageTime = new Date(lastMessage.created_at);
    const minutesSinceLastMessage =
      (Date.now() - lastMessageTime.getTime()) / (1000 * 60);

    if (minutesSinceLastMessage < minMinutesBetween) {
      const remainingMinutes = Math.ceil(
        minMinutesBetween - minutesSinceLastMessage,
      );
      return {
        allowed: false,
        reason: `Too soon after last message (wait ${remainingMinutes} more minutes)`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Lead Status Guardrail
 * Only allows messages to leads with specific statuses
 */
async function checkLeadStatus(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const allowedStatuses = config.allowed_statuses || ["new", "contacted", "qualified"];
  const blockedStatuses = config.blocked_statuses || ["converted", "lost"];

  // Fetch lead status
  const { data: lead, error } = await context.supabase
    .from("leads")
    .select("status")
    .eq("id", context.leadId)
    .single();

  if (error || !lead) {
    console.error("[Guardrails] Error fetching lead status:", error);
    return { allowed: true }; // Fail open
  }

  // Check blocked statuses first
  if (blockedStatuses.includes(lead.status)) {
    return {
      allowed: false,
      reason: `Lead status "${lead.status}" is blocked`,
    };
  }

  // Check allowed statuses
  if (allowedStatuses.length > 0 && !allowedStatuses.includes(lead.status)) {
    return {
      allowed: false,
      reason: `Lead status "${lead.status}" not in allowed list`,
    };
  }

  return { allowed: true };
}

/**
 * Human Takeover Guardrail
 * Pauses AI when a human staff member sends a manual message
 */
async function checkHumanTakeover(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const cooldownMinutes = config.cooldown_minutes || 30;
  const detectManualMessages = config.detect_manual_messages !== false;

  if (!detectManualMessages) {
    return { allowed: true };
  }

  // Check conversation metadata for last manual message time
  const { data: conversation, error } = await context.supabase
    .from("ai_agent_conversations")
    .select("metadata")
    .eq("id", context.conversationId)
    .single();

  if (error || !conversation) {
    return { allowed: true }; // Fail open
  }

  const lastManualMessageAt =
    conversation.metadata?.last_manual_message_at;

  if (lastManualMessageAt) {
    const lastManualTime = new Date(lastManualMessageAt);
    const minutesSinceManual =
      (Date.now() - lastManualTime.getTime()) / (1000 * 60);

    if (minutesSinceManual < cooldownMinutes) {
      const remainingMinutes = Math.ceil(
        cooldownMinutes - minutesSinceManual,
      );
      return {
        allowed: false,
        reason: `Human is active (cooldown: ${remainingMinutes} minutes remaining)`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Conversation Status Guardrail
 * Only allows messages to conversations with specific statuses
 */
async function checkConversationStatus(
  config: any,
  context: GuardrailCheckContext,
): Promise<GuardrailCheckResult> {
  const allowedStatuses = config.allowed_statuses || ["active"];
  const blockedStatuses = config.blocked_statuses || [
    "archived",
    "deleted",
    "paused",
  ];

  // Fetch conversation status
  const { data: conversation, error } = await context.supabase
    .from("ai_agent_conversations")
    .select("status")
    .eq("id", context.conversationId)
    .single();

  if (error || !conversation) {
    console.error(
      "[Guardrails] Error fetching conversation status:",
      error,
    );
    return { allowed: true }; // Fail open
  }

  // Check blocked statuses first
  if (blockedStatuses.includes(conversation.status)) {
    return {
      allowed: false,
      reason: `Conversation status "${conversation.status}" is blocked`,
    };
  }

  // Check allowed statuses
  if (
    allowedStatuses.length > 0 &&
    !allowedStatuses.includes(conversation.status)
  ) {
    return {
      allowed: false,
      reason: `Conversation status "${conversation.status}" not in allowed list`,
    };
  }

  return { allowed: true };
}
