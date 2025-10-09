import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import OpenAI from "openai";
import { getStepById } from "@/app/lib/onboarding/config";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/onboarding/support-bot
 * AI chatbot to help with onboarding questions
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build context-aware system prompt
    let systemPrompt = `You are an onboarding specialist for GymLeadHub, helping gym owners set up their new booking and CRM system.

Your role:
- Guide gym owners through integrations (Google Calendar, Email, Facebook Ads, WhatsApp, Twilio)
- Help import data from GoTeamUp (clients, memberships, attendance, timetable, revenue)
- Explain payment provider setup (Stripe/GoCardless)
- Introduce AI bots and automation capabilities
- Answer technical questions with clear, actionable steps
- Troubleshoot connection and import issues

Be friendly, concise, and practical. Provide step-by-step instructions when needed.
Use emojis sparingly (only for emphasis).

IMPORTANT:
- If they ask about a specific integration, provide the EXACT steps to connect it
- If they're stuck on an error, ask clarifying questions to diagnose the issue
- If they need to import data, explain the process clearly
- Always end with asking if they need help with anything else`;

    // Add current step context
    if (context?.current_step) {
      const currentStep = getStepById(context.current_step);
      if (currentStep) {
        systemPrompt += `\n\n📍 CURRENT CONTEXT:\nThe user is currently working on: "${currentStep.title}" - ${currentStep.description}`;
      }
    }

    // Add completed steps context
    if (context?.completed_steps && context.completed_steps.length > 0) {
      systemPrompt += `\n\n✅ COMPLETED STEPS:\n${context.completed_steps
        .map((stepId: string) => {
          const step = getStepById(stepId);
          return step ? `- ${step.title}` : stepId;
        })
        .join("\n")}`;
    }

    // Add progress context
    if (context?.progress) {
      systemPrompt += `\n\n📊 PROGRESS:\n${context.progress.completed}/${context.progress.total} steps completed (${context.progress.percentage}%)`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content || "";

    return NextResponse.json({
      success: true,
      message: response,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    });
  } catch (error: any) {
    console.error("Onboarding support bot error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get AI response",
      },
      { status: 500 },
    );
  }
}
