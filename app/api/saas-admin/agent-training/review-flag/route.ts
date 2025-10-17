import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import OpenAI from "openai";

/**
 * Review Flag Submission Endpoint
 *
 * Handles human review of flagged conversations with automatic SOP updates
 * POST /api/saas-admin/agent-training/review-flag
 */

interface ReviewFlagRequest {
  flagId: string;
  reviewStatus: string; // 'resolved', 'false_positive', 'escalated'
  reviewerNotes: string;
  improvementInstructions: string | null;
  updateSOP: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReviewFlagRequest = await request.json();
    const {
      flagId,
      reviewStatus,
      reviewerNotes,
      improvementInstructions,
      updateSOP,
    } = body;

    const supabase = createAdminClient();

    // 1. Fetch flag details to get agent and organization context
    const { data: flag, error: flagError } = await supabase
      .from("ai_agent_conversation_flags")
      .select(`
        id,
        agent_id,
        organization_id,
        conversation_id,
        trigger_message,
        agent_response,
        detection_metadata
      `)
      .eq("id", flagId)
      .single();

    if (flagError || !flag) {
      return NextResponse.json(
        { success: false, error: "Flag not found" },
        { status: 404 }
      );
    }

    // 2. Update flag with review data
    const { error: updateError } = await supabase
      .from("ai_agent_conversation_flags")
      .update({
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewerNotes,
        improvement_instructions: improvementInstructions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", flagId);

    if (updateError) {
      console.error("[Review Flag] Error updating flag:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update flag" },
        { status: 500 }
      );
    }

    let sopUpdated = false;
    let sopChangeId: string | null = null;

    // 3. Update SOP if requested and status is 'resolved'
    if (updateSOP && reviewStatus === "resolved" && improvementInstructions) {
      try {
        // Fetch agent details
        const { data: agent, error: agentError } = await supabase
          .from("ai_agents")
          .select("id, name, system_prompt, model")
          .eq("id", flag.agent_id)
          .single();

        if (agentError || !agent) {
          throw new Error("Agent not found");
        }

        // Fetch conversation context for AI to understand situation
        const { data: messages } = await supabase
          .from("ai_agent_messages")
          .select("role, content")
          .eq("conversation_id", flag.conversation_id)
          .order("created_at", { ascending: true })
          .limit(10);

        const conversationContext = messages
          ?.map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n\n") || "";

        // Use OpenAI to generate improved system prompt
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const aiPrompt = `You are an expert AI trainer helping improve agent performance based on human feedback.

AGENT DETAILS:
- Name: ${agent.name}
- Model: ${agent.model}

CURRENT SYSTEM PROMPT:
${agent.system_prompt}

FLAGGED CONVERSATION:
User Message: ${flag.trigger_message}
Agent Response: ${flag.agent_response}

CONVERSATION CONTEXT:
${conversationContext}

HUMAN FEEDBACK:
${improvementInstructions}

TASK:
Update the system prompt to address the human feedback. The updated prompt should:
1. Maintain all existing functionality
2. Incorporate the improvement instructions
3. Be specific about how to handle similar situations differently
4. Preserve the agent's personality and tone
5. Keep the same structure and formatting

Return ONLY the updated system prompt, nothing else.`;

        console.log("[Review Flag] Generating improved system prompt...");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an AI trainer specializing in improving agent system prompts based on human feedback. Return only the updated system prompt.",
            },
            {
              role: "user",
              content: aiPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        });

        const improvedPrompt = completion.choices[0].message.content || agent.system_prompt;

        // Update agent's system prompt
        const { error: promptUpdateError } = await supabase
          .from("ai_agents")
          .update({
            system_prompt: improvedPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);

        if (promptUpdateError) {
          throw promptUpdateError;
        }

        // Create SOP change record
        const { data: sopChange, error: sopChangeError } = await supabase
          .from("agent_sop_changes")
          .insert({
            agent_id: agent.id,
            organization_id: flag.organization_id,
            change_type: "improvement",
            prompt_before: agent.system_prompt,
            prompt_after: improvedPrompt,
            reason: improvementInstructions,
            metadata: {
              source: "flag_review",
              flag_id: flagId,
              trigger_message: flag.trigger_message,
              agent_response: flag.agent_response,
            },
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!sopChangeError && sopChange) {
          sopChangeId = sopChange.id;

          // Link SOP change back to flag
          await supabase
            .from("ai_agent_conversation_flags")
            .update({
              sop_update_applied: true,
              sop_change_id: sopChange.id,
            })
            .eq("id", flagId);

          sopUpdated = true;
          console.log("[Review Flag] SOP updated successfully:", sopChange.id);
        }
      } catch (sopError: any) {
        console.error("[Review Flag] Error updating SOP:", sopError);
        // Don't fail the entire request - flag update succeeded
        sopUpdated = false;
      }
    }

    return NextResponse.json({
      success: true,
      flagId,
      reviewStatus,
      sopUpdated,
      sopChangeId,
    });

  } catch (error: any) {
    console.error("[Review Flag] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process review" },
      { status: 500 }
    );
  }
}
