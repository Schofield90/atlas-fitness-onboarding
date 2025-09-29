import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/app/lib/openai";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const body = await request.json();
    const {
      leadId,
      insightTypes = [
        "action_recommendations",
        "next_steps",
        "optimization_tips",
      ],
    } = body;
    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }
    // Get comprehensive lead data
    const leadData = await getLeadDataForRecommendations(
      supabase,
      leadId,
      userWithOrg.organizationId,
    );
    if (!leadData) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    // Generate AI-powered recommendations
    const recommendations = await generateRecommendations(
      leadData,
      insightTypes,
    );
    // Save recommendations as insights
    const insights = insightTypes.map((type) => ({
      organization_id: userWithOrg.organizationId,
      lead_id: leadId,
      insight_type: type,
      confidence_score: recommendations[type]?.confidence || 0.7,
      insight_data: recommendations[type],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));
    const { error: insertError } = await supabase
      .from("lead_ai_insights")
      .insert(insights);
    if (insertError) {
      console.error("Error saving recommendations:", insertError);
    }
    return NextResponse.json({
      success: true,
      leadId,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return createErrorResponse(error);
  }
}
export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const type = searchParams.get("type");
    if (leadId) {
      // Get recommendations for specific lead
      let query = supabase
        .from("lead_ai_insights")
        .select("*")
        .eq("lead_id", leadId)
        .eq("organization_id", userWithOrg.organizationId)
        .in("insight_type", [
          "action_recommendations",
          "next_steps",
          "optimization_tips",
        ])
        .order("created_at", { ascending: false });
      if (type) {
        query = query.eq("insight_type", type);
      }
      const { data: insights, error } = await query;
      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch recommendations" },
          { status: 500 },
        );
      }
      return NextResponse.json({
        success: true,
        leadId,
        recommendations: insights || [],
      });
    } else {
      // Get general recommendations dashboard
      const dashboardData = await getRecommendationsDashboard(
        supabase,
        userWithOrg.organizationId,
      );
      return NextResponse.json({
        success: true,
        dashboard: dashboardData,
      });
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
async function getLeadDataForRecommendations(
  supabase: any,
  leadId: string,
  organizationId: string,
) {
  try {
    // Get lead with scoring data
    const { data: lead } = await supabase
      .from("leads")
      .select(
        `
        *,
        lead_scoring_factors (*)
      `,
      )
      .eq("id", leadId)
      .eq("organization_id", organizationId)
      .single();
    if (!lead) return null;
    // Get recent interactions
    const { data: interactions } = await supabase
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);
    // Get recent activities
    const { data: activities } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20);
    // Get existing AI insights
    const { data: existingInsights } = await supabase
      .from("lead_ai_insights")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5);
    // Get score history
    const { data: scoreHistory } = await supabase
      .from("lead_score_history")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(10);
    return {
      lead,
      interactions: interactions || [],
      activities: activities || [],
      existingInsights: existingInsights || [],
      scoreHistory: scoreHistory || [],
    };
  } catch (error) {
    console.error("Error fetching lead data for recommendations:", error);
    return null;
  }
}
async function generateRecommendations(leadData: any, insightTypes: string[]) {
  const openai = getOpenAIClient();
  const { lead, interactions, activities, existingInsights, scoreHistory } =
    leadData;
  // Prepare context for AI
  const context = `
Lead Profile:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone || "Not provided"}
- Source: ${lead.source}
- Status: ${lead.status}
- Current Score: ${lead.lead_score || 0}/100
- Created: ${new Date(lead.created_at).toLocaleDateString()}
Scoring Breakdown:
${
  lead.lead_scoring_factors
    ? `
- Source Quality: ${lead.lead_scoring_factors.source_quality_score}/20
- Engagement: ${lead.lead_scoring_factors.engagement_score}/25
- Behavioral: ${lead.lead_scoring_factors.behavioral_score}/20
- Communication: ${lead.lead_scoring_factors.communication_score}/15
- Completeness: ${lead.lead_scoring_factors.completeness_score}/10
- Recency: ${lead.lead_scoring_factors.time_decay_score}/10
- AI Analysis: ${lead.lead_scoring_factors.ai_analysis_score}/20
`
    : "No detailed scoring available"
}
Recent Interactions (${interactions.length}):
${interactions
  .slice(0, 5)
  .map(
    (int) =>
      `- ${int.direction}: ${int.type} - ${int.content?.substring(0, 100)}...`,
  )
  .join("\n")}
Recent Activities (${activities.length}):
${activities
  .slice(0, 10)
  .map((act) => `- ${act.activity_type} (value: ${act.activity_value})`)
  .join("\n")}
Score History:
${scoreHistory
  .slice(0, 5)
  .map(
    (hist) =>
      `- ${new Date(hist.created_at).toLocaleDateString()}: ${hist.previous_score} → ${hist.new_score} (${hist.change_reason})`,
  )
  .join("\n")}
Existing AI Insights:
${existingInsights.map((insight) => `- ${insight.insight_type}: ${JSON.stringify(insight.insight_data).substring(0, 200)}...`).join("\n")}
  `;
  const recommendations: Record<string, any> = {};
  try {
    for (const insightType of insightTypes) {
      const systemPrompt = getSystemPromptForInsightType(insightType);
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
      try {
        const response = JSON.parse(
          completion.choices[0].message.content || "{}",
        );
        recommendations[insightType] = {
          ...response,
          confidence: calculateConfidence(response, leadData),
          generatedAt: new Date().toISOString(),
        };
      } catch (parseError) {
        console.error(`Error parsing ${insightType} response:`, parseError);
        recommendations[insightType] = {
          error: "Failed to parse AI response",
          confidence: 0.1,
        };
      }
    }
  } catch (error) {
    console.error("Error generating recommendations with AI:", error);
    // Provide fallback recommendations
    insightTypes.forEach((type) => {
      recommendations[type] = getFallbackRecommendation(type, leadData);
    });
  }
  return recommendations;
}
function getSystemPromptForInsightType(insightType: string): string {
  switch (insightType) {
    case "action_recommendations":
      return `You are a sales expert for a fitness business. Based on the lead data provided, generate specific, actionable recommendations for the sales team.
Return your response as JSON with this structure:
{
  "priority": "high|medium|low",
  "actions": [
    {
      "action": "specific action to take",
      "reason": "why this action is recommended",
      "expected_outcome": "what this should achieve",
      "urgency": "immediate|today|this_week|this_month"
    }
  ],
  "focus_areas": ["area1", "area2"],
  "warning_signs": ["potential issue1", "potential issue2"],
  "opportunities": ["opportunity1", "opportunity2"]
}`;
    case "next_steps":
      return `You are a fitness business CRM specialist. Based on the lead data, recommend the next logical steps in the sales process.
Return your response as JSON with this structure:
{
  "immediate_next_steps": [
    {
      "step": "specific next step",
      "timing": "when to do this",
      "method": "how to execute",
      "goal": "what to achieve"
    }
  ],
  "follow_up_sequence": [
    {
      "day": 1,
      "action": "what to do",
      "channel": "email|phone|sms|whatsapp",
      "content_suggestion": "message suggestion"
    }
  ],
  "milestone_goals": {
    "short_term": "goal for next 7 days",
    "medium_term": "goal for next 30 days",
    "long_term": "ultimate conversion goal"
  }
}`;
    case "optimization_tips":
      return `You are a lead nurturing expert for fitness businesses. Analyze the lead data and provide optimization tips to improve conversion chances.
Return your response as JSON with this structure:
{
  "score_improvement_tips": [
    {
      "factor": "which scoring factor to improve",
      "current_score": "current score for this factor",
      "improvement_actions": ["specific action1", "specific action2"],
      "potential_impact": "expected score increase"
    }
  ],
  "engagement_optimization": {
    "best_contact_times": ["time suggestions based on patterns"],
    "preferred_channels": ["channel recommendations"],
    "content_preferences": ["what type of content to share"]
  },
  "conversion_accelerators": [
    {
      "strategy": "specific strategy",
      "implementation": "how to implement",
      "expected_timeline": "timeline for results"
    }
  ],
  "risk_mitigation": ["how to prevent lead from going cold"]
}`;
    default:
      return `You are a fitness business sales expert. Provide insights and recommendations for this lead based on the data provided. Return your response as JSON.`;
  }
}
function calculateConfidence(response: any, leadData: any): number {
  const { lead, interactions, activities } = leadData;
  let confidence = 0.7; // Base confidence
  // Increase confidence based on data quality
  if (interactions.length > 3) confidence += 0.1;
  if (activities.length > 5) confidence += 0.1;
  if (lead.lead_score && lead.lead_score > 0) confidence += 0.1;
  if (lead.phone && lead.email) confidence += 0.05;
  // Decrease confidence for stale data
  const daysSinceCreated =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 30) confidence -= 0.1;
  if (daysSinceCreated > 60) confidence -= 0.1;
  // Ensure confidence is between 0.1 and 1.0
  return Math.max(0.1, Math.min(1.0, confidence));
}
function getFallbackRecommendation(type: string, leadData: any) {
  const { lead } = leadData;
  switch (type) {
    case "action_recommendations":
      return {
        priority: "medium",
        actions: [
          {
            action: "Contact the lead via phone or email",
            reason: "Basic outreach needed",
            expected_outcome: "Initial contact established",
            urgency: "this_week",
          },
        ],
        focus_areas: ["initial_contact"],
        warning_signs: ["no_recent_activity"],
        opportunities: ["personal_outreach"],
        confidence: 0.3,
      };
    case "next_steps":
      return {
        immediate_next_steps: [
          {
            step: "Schedule initial consultation",
            timing: "within 48 hours",
            method: "phone or email",
            goal: "book discovery call",
          },
        ],
        follow_up_sequence: [
          {
            day: 1,
            action: "Send welcome message",
            channel: "email",
            content_suggestion:
              "Thank you for your interest in our fitness programs",
          },
        ],
        milestone_goals: {
          short_term: "Establish contact",
          medium_term: "Book consultation",
          long_term: "Convert to member",
        },
        confidence: 0.3,
      };
    case "optimization_tips":
      return {
        score_improvement_tips: [
          {
            factor: "engagement",
            current_score: lead.lead_score || 0,
            improvement_actions: [
              "Increase communication frequency",
              "Provide valuable content",
            ],
            potential_impact: "+10-15 points",
          },
        ],
        engagement_optimization: {
          best_contact_times: ["morning", "early_evening"],
          preferred_channels: ["email", "phone"],
          content_preferences: ["fitness_tips", "success_stories"],
        },
        conversion_accelerators: [
          {
            strategy: "Personal consultation offer",
            implementation: "Direct outreach with booking link",
            expected_timeline: "1-2 weeks",
          },
        ],
        risk_mitigation: ["Regular follow-up", "Value-added content"],
        confidence: 0.3,
      };
    default:
      return {
        message: "Unable to generate recommendations",
        confidence: 0.1,
      };
  }
}
async function getRecommendationsDashboard(
  supabase: any,
  organizationId: string,
) {
  try {
    // Get recent recommendations
    const { data: recentRecommendations } = await supabase
      .from("lead_ai_insights")
      .select(
        `
        *,
        leads (name, email, lead_score)
      `,
      )
      .eq("organization_id", organizationId)
      .in("insight_type", [
        "action_recommendations",
        "next_steps",
        "optimization_tips",
      ])
      .order("created_at", { ascending: false })
      .limit(20);
    // Get high-priority recommendations
    const { data: highPriorityLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId)
      .or("lead_score.gte.80,status.eq.hot")
      .order("lead_score", { ascending: false })
      .limit(10);
    // Get leads needing attention (low scores or no recent activity)
    const { data: attentionNeeded } = await supabase
      .from("leads")
      .select("*")
      .eq("organization_id", organizationId)
      .lt("lead_score", 40)
      .order("updated_at", { ascending: true })
      .limit(10);
    return {
      recentRecommendations: recentRecommendations || [],
      highPriorityLeads: highPriorityLeads || [],
      leadsNeedingAttention: attentionNeeded || [],
    };
  } catch (error) {
    console.error("Error fetching recommendations dashboard:", error);
    return {
      recentRecommendations: [],
      highPriorityLeads: [],
      leadsNeedingAttention: [],
    };
  }
}
