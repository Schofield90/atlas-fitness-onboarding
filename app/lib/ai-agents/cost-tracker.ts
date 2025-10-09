/**
 * AI Cost Tracking System
 * Calculates costs with 20% markup for billing
 */

import { createAdminClient } from "@/app/lib/supabase/admin";

/**
 * Model pricing (in USD per 1K tokens)
 * Synced from ai_model_pricing table
 */
export interface ModelPricing {
  id: string;
  provider: "openai" | "anthropic";
  name: string;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  contextWindow: number;
}

/**
 * Cost calculation result
 */
export interface CostCalculation {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costBaseCents: number; // Base cost in cents (from provider)
  costBilledCents: number; // Cost with markup in cents (charged to customer)
  markupPercentage: number; // Default 20%
  executionTimeMs?: number;
}

/**
 * Billing record for database
 */
export interface BillingRecord {
  organizationId: string;
  agentId: string;
  conversationId?: string;
  taskId?: string;
  actionType: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costBaseUsd: number;
  costBilledUsd: number;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

// In-memory cache for model pricing (refreshed hourly)
let pricingCache: Map<string, ModelPricing> = new Map();
let pricingCacheLastUpdate: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Default model pricing (fallback if database query fails)
 */
const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    contextWindow: 128000,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    name: "GPT-4o Mini",
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    contextWindow: 128000,
  },
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    name: "Claude 3.5 Sonnet",
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    contextWindow: 200000,
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    provider: "anthropic",
    name: "Claude 3.5 Haiku",
    costPer1kInputTokens: 0.0008,
    costPer1kOutputTokens: 0.004,
    contextWindow: 200000,
  },
};

/**
 * Load model pricing from database
 */
async function loadModelPricing(): Promise<void> {
  const now = Date.now();

  // Use cache if fresh
  if (pricingCache.size > 0 && now - pricingCacheLastUpdate < CACHE_TTL_MS) {
    return;
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ai_model_pricing")
      .select("*")
      .eq("enabled", true);

    if (error) throw error;

    if (data && data.length > 0) {
      pricingCache.clear();

      for (const row of data) {
        pricingCache.set(row.id, {
          id: row.id,
          provider: row.provider,
          name: row.name,
          costPer1kInputTokens: parseFloat(row.cost_per_1k_input_tokens),
          costPer1kOutputTokens: parseFloat(row.cost_per_1k_output_tokens),
          contextWindow: row.context_window,
        });
      }

      pricingCacheLastUpdate = now;
    }
  } catch (error) {
    console.error("Failed to load model pricing from database:", error);
    // Fall back to default pricing
    pricingCache = new Map(Object.entries(DEFAULT_PRICING));
    pricingCacheLastUpdate = now;
  }
}

/**
 * Get pricing for a model
 */
async function getModelPricing(model: string): Promise<ModelPricing> {
  await loadModelPricing();

  const pricing = pricingCache.get(model);

  if (pricing) {
    return pricing;
  }

  // Fallback to default if not found
  const defaultPricing = DEFAULT_PRICING[model];

  if (defaultPricing) {
    return defaultPricing;
  }

  // Ultimate fallback - assume GPT-4o Mini pricing
  console.warn(`Unknown model pricing for ${model}, using GPT-4o Mini rates`);
  return DEFAULT_PRICING["gpt-4o-mini"];
}

/**
 * Calculate cost for AI usage
 */
export async function calculateCost(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  markupPercentage?: number;
}): Promise<CostCalculation> {
  const { model, inputTokens, outputTokens, markupPercentage = 20 } = params;

  const pricing = await getModelPricing(model);

  // Calculate base cost in USD
  const inputCostUsd = (inputTokens / 1000) * pricing.costPer1kInputTokens;
  const outputCostUsd = (outputTokens / 1000) * pricing.costPer1kOutputTokens;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  // Convert to cents
  const costBaseCents = Math.round(totalCostUsd * 100);

  // Apply markup
  const costBilledCents = Math.round(
    costBaseCents * (1 + markupPercentage / 100),
  );

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costBaseCents,
    costBilledCents,
    markupPercentage,
  };
}

/**
 * Log AI usage to activity log and billing tables
 */
export async function logAIUsage(record: BillingRecord): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Insert into activity log
    const { error: activityError } = await supabase
      .from("ai_agent_activity_log")
      .insert({
        agent_id: record.agentId,
        organization_id: record.organizationId,
        conversation_id: record.conversationId,
        task_id: record.taskId,
        action_type: record.actionType,
        action_data: record.metadata || {},
        tokens_used: record.totalTokens,
        cost_usd: record.costBaseUsd,
        cost_billed_usd: record.costBilledUsd,
        execution_time_ms: record.executionTimeMs,
        success: true,
      });

    if (activityError) {
      console.error("Failed to log AI usage to activity log:", activityError);
    }

    // Update or create monthly billing record
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Check if billing record exists
    const { data: existing, error: checkError } = await supabase
      .from("ai_usage_billing")
      .select("*")
      .eq("organization_id", record.organizationId)
      .eq("billing_period_start", periodStart.toISOString().split("T")[0])
      .eq("billing_period_end", periodEnd.toISOString().split("T")[0])
      .maybeSingle();

    if (checkError) {
      console.error("Failed to check existing billing record:", checkError);
      return;
    }

    if (existing) {
      // Update existing record
      const updatedBreakdownByAgent = existing.breakdown_by_agent || {};
      const updatedBreakdownByModel = existing.breakdown_by_model || {};

      // Update agent breakdown
      if (!updatedBreakdownByAgent[record.agentId]) {
        updatedBreakdownByAgent[record.agentId] = {
          tokens: 0,
          costBase: 0,
          costBilled: 0,
        };
      }
      updatedBreakdownByAgent[record.agentId].tokens += record.totalTokens;
      updatedBreakdownByAgent[record.agentId].costBase += record.costBaseUsd;
      updatedBreakdownByAgent[record.agentId].costBilled +=
        record.costBilledUsd;

      // Update model breakdown
      if (!updatedBreakdownByModel[record.model]) {
        updatedBreakdownByModel[record.model] = {
          tokens: 0,
          costBase: 0,
          costBilled: 0,
        };
      }
      updatedBreakdownByModel[record.model].tokens += record.totalTokens;
      updatedBreakdownByModel[record.model].costBase += record.costBaseUsd;
      updatedBreakdownByModel[record.model].costBilled += record.costBilledUsd;

      const { error: updateError } = await supabase
        .from("ai_usage_billing")
        .update({
          total_tokens_used: existing.total_tokens_used + record.totalTokens,
          total_cost_base_usd:
            existing.total_cost_base_usd + record.costBaseUsd,
          total_cost_billed_usd:
            existing.total_cost_billed_usd + record.costBilledUsd,
          breakdown_by_agent: updatedBreakdownByAgent,
          breakdown_by_model: updatedBreakdownByModel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to update billing record:", updateError);
      }
    } else {
      // Create new billing record
      const { error: insertError } = await supabase
        .from("ai_usage_billing")
        .insert({
          organization_id: record.organizationId,
          billing_period_start: periodStart.toISOString().split("T")[0],
          billing_period_end: periodEnd.toISOString().split("T")[0],
          total_tokens_used: record.totalTokens,
          total_cost_base_usd: record.costBaseUsd,
          total_cost_billed_usd: record.costBilledUsd,
          markup_percentage: 20,
          breakdown_by_agent: {
            [record.agentId]: {
              tokens: record.totalTokens,
              costBase: record.costBaseUsd,
              costBilled: record.costBilledUsd,
            },
          },
          breakdown_by_model: {
            [record.model]: {
              tokens: record.totalTokens,
              costBase: record.costBaseUsd,
              costBilled: record.costBilledUsd,
            },
          },
          status: "pending",
        });

      if (insertError) {
        console.error("Failed to create billing record:", insertError);
      }
    }
  } catch (error) {
    console.error("Failed to log AI usage:", error);
  }
}

/**
 * Get current month's AI usage for an organization
 */
export async function getCurrentMonthUsage(organizationId: string): Promise<{
  totalTokens: number;
  totalCostBase: number;
  totalCostBilled: number;
  byAgent: Record<string, any>;
  byModel: Record<string, any>;
} | null> {
  const supabase = createAdminClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data, error } = await supabase
    .from("ai_usage_billing")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("billing_period_start", periodStart.toISOString().split("T")[0])
    .eq("billing_period_end", periodEnd.toISOString().split("T")[0])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    totalTokens: data.total_tokens_used,
    totalCostBase: data.total_cost_base_usd,
    totalCostBilled: data.total_cost_billed_usd,
    byAgent: data.breakdown_by_agent || {},
    byModel: data.breakdown_by_model || {},
  };
}

/**
 * Get AI usage history for an organization
 */
export async function getUsageHistory(
  organizationId: string,
  months: number = 6,
): Promise<
  Array<{
    period: string;
    totalTokens: number;
    totalCostBase: number;
    totalCostBilled: number;
  }>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("ai_usage_billing")
    .select(
      "billing_period_start, total_tokens_used, total_cost_base_usd, total_cost_billed_usd",
    )
    .eq("organization_id", organizationId)
    .order("billing_period_start", { ascending: false })
    .limit(months);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    period: row.billing_period_start,
    totalTokens: row.total_tokens_used,
    totalCostBase: row.total_cost_base_usd,
    totalCostBilled: row.total_cost_billed_usd,
  }));
}

/**
 * Refresh pricing cache (call this from admin API if pricing changes)
 */
export async function refreshPricingCache(): Promise<void> {
  pricingCacheLastUpdate = 0; // Force refresh
  await loadModelPricing();
}
