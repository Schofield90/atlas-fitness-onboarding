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

    // If negative feedback or needs improvement, update SOPs using AI
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

        // Get agent's linked SOPs (especially the Tone SOP)
        const { data: agentSops } = await supabase
          .from("agent_sops")
          .select(`
            sop_id,
            sort_order,
            sop:sops(id, name, content)
          `)
          .eq("agent_id", agentId)
          .order("sort_order", { ascending: true });

        // Find the Tone SOP to update
        const toneSop = agentSops?.find((item: any) =>
          item.sop?.name?.toLowerCase().includes("tone")
        );

        if (!toneSop) {
          console.warn("[Agent Test] No Tone SOP found, updating base prompt instead");
        }

        // Lazy-load OpenAI client
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          dangerouslyAllowBrowser: true, // Safe: This is a server-side API route
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

        // Target the Tone SOP if available, otherwise base prompt
        const targetSop = toneSop?.sop;
        const currentContent = targetSop?.content || agent.system_prompt;

        // Use GPT-4o-mini to suggest SOP improvements
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI training assistant. Your job is to improve ${targetSop ? 'Tone SOP rules' : 'agent prompts'} based on negative feedback.

Given:
1. The current ${targetSop ? 'Tone SOP' : 'system prompt'}
2. A conversation context where the agent made a mistake
3. Feedback notes explaining what went wrong

Your task:
- Identify the specific issue that caused the problem
- Add a clear, emphatic rule to prevent this mistake in the future
- Keep the existing rules and structure
- Place new rules at the TOP with 🚨 emoji to make them highly visible
- Return ONLY the updated content, no explanations

Format for critical rules:
🚨 CRITICAL: [Brief description]
❌ NEVER: [what to absolutely avoid]
✅ ALWAYS: [what to do instead]

Keep rules specific, actionable, and testable. Make them BOLD and EMPHATIC so the AI can't miss them.`,
            },
            {
              role: "user",
              content: `Current ${targetSop ? 'Tone SOP' : 'System Prompt'}:
${currentContent}

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

Please provide updated ${targetSop ? 'Tone SOP rules' : 'system prompt'} that addresses this issue.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        });

        updatedPrompt = completion.choices[0]?.message?.content?.trim() || currentContent;

        // Update the appropriate target
        if (targetSop) {
          // Update the Tone SOP
          const { error: updateError } = await supabase
            .from("sops")
            .update({
              content: updatedPrompt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetSop.id);

          if (updateError) {
            console.error("[Agent Test] Error updating Tone SOP:", updateError);
          } else {
            sopUpdated = true;
            console.log("[Agent Test] Updated Tone SOP with feedback");
          }
        } else {
          // Fallback: update base prompt
          const { error: updateError } = await supabase
            .from("ai_agents")
            .update({
              system_prompt: updatedPrompt,
              updated_at: new Date().toISOString(),
            })
            .eq("id", agentId);

          if (updateError) {
            console.error("[Agent Test] Error updating base prompt:", updateError);
          } else {
            sopUpdated = true;
            console.log("[Agent Test] Updated base prompt with feedback");
          }
        }

        // Log the change for audit trail
        if (sopUpdated) {
          await supabase.from("agent_sop_changes").insert({
            agent_id: agentId,
            change_type: "feedback_improvement",
            previous_prompt: currentContent,
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
