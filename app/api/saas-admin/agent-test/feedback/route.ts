import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import OpenAI from "openai";

/**
 * POST /api/saas-admin/agent-test/feedback
 *
 * Process feedback from agent testing UI and optionally update SOP (system prompt)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, messageId, conversationId, feedback, notes, updateSOP } = body;

    if (!agentId || !messageId || !feedback) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the message and agent details
    const { data: message } = await supabase
      .from("ai_agent_messages")
      .select("content, tool_calls, tool_results")
      .eq("id", messageId)
      .single();

    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id, name, system_prompt, metadata")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Agent not found" },
        { status: 404 }
      );
    }

    // Store feedback in database
    const { error: feedbackError } = await supabase
      .from("agent_test_feedback")
      .insert({
        agent_id: agentId,
        message_id: messageId,
        conversation_id: conversationId,
        feedback_type: feedback,
        notes: notes || null,
        message_content: message?.content,
        tool_calls: message?.tool_calls || null,
        tool_results: message?.tool_results || null,
        created_at: new Date().toISOString(),
      });

    if (feedbackError) {
      console.error("[Agent Test] Error storing feedback:", feedbackError);
    }

    let sopUpdated = false;
    let updatedPrompt = agent.system_prompt;

    // If negative feedback or needs improvement, update SOP using AI
    if (updateSOP && (feedback === "negative" || feedback === "needs_improvement")) {
      try {
        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
          console.warn("[Agent Test] OpenAI API key not configured, skipping SOP update");
          return NextResponse.json({
            success: true,
            data: {
              feedbackRecorded: true,
              sopUpdated: false,
              reason: "OpenAI API key not configured",
            },
          });
        }

        // Lazy-load OpenAI client
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Get conversation context (last 5 messages)
        const { data: conversationMessages } = await supabase
          .from("ai_agent_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(5);

        const context = conversationMessages
          ?.reverse()
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n\n");

        // Use GPT-4o-mini to suggest SOP improvements
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI training assistant. Your job is to improve AI agent system prompts based on negative feedback.

Given:
1. The current system prompt
2. A conversation context where the agent made a mistake
3. Feedback notes explaining what went wrong

Your task:
- Identify the specific issue that caused the problem
- Add a clear, concise rule to the system prompt to prevent this mistake in the future
- Keep the original prompt structure and tone
- Place new rules in the appropriate section (or create a new section if needed)
- Return ONLY the updated system prompt, no explanations

Format for new rules:
❌ DON'T: [what to avoid]
✅ DO: [what to do instead]

Keep rules specific, actionable, and testable.`,
            },
            {
              role: "user",
              content: `Current System Prompt:
${agent.system_prompt}

---

Conversation Context:
${context}

---

Problematic Message:
${message?.content}

---

Feedback Type: ${feedback}
Feedback Notes: ${notes || "No specific notes provided"}

${message?.tool_results ? `\nTool Results: ${JSON.stringify(message.tool_results, null, 2)}` : ""}

Please provide an updated system prompt that addresses this issue.`,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent improvements
          max_tokens: 4000,
        });

        updatedPrompt = completion.choices[0]?.message?.content?.trim() || agent.system_prompt;

        // Update agent's system prompt
        const { error: updateError } = await supabase
          .from("ai_agents")
          .update({
            system_prompt: updatedPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", agentId);

        if (updateError) {
          console.error("[Agent Test] Error updating system prompt:", updateError);
        } else {
          sopUpdated = true;

          // Log the SOP change for audit trail
          await supabase.from("agent_sop_changes").insert({
            agent_id: agentId,
            change_type: "feedback_improvement",
            previous_prompt: agent.system_prompt,
            new_prompt: updatedPrompt,
            trigger_message_id: messageId,
            feedback_notes: notes,
            created_at: new Date().toISOString(),
          });
        }
      } catch (aiError) {
        console.error("[Agent Test] Error generating SOP improvement:", aiError);
        // Continue even if AI update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        feedbackRecorded: true,
        sopUpdated,
        promptPreview: sopUpdated ? updatedPrompt.slice(0, 200) + "..." : null,
      },
    });
  } catch (error) {
    console.error("[Agent Test] Feedback processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
