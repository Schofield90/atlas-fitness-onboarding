import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Force Node.js runtime (not Edge) for OpenAI SDK compatibility
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    // Check for API key at runtime
    if (!process.env.OPENAI_API_KEY) {
      console.error("[Generate Prompt] OpenAI API key not configured");
      return NextResponse.json(
        {
          error:
            "AI prompt generation is not configured. Please contact support.",
        },
        { status: 503 },
      );
    }

    // Lazy-load OpenAI client only when route is called
    // dangerouslyAllowBrowser is safe here because this code runs server-side only
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Safe: This is a server-side API route, not browser code
    });

    // Generate detailed system prompt using GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at crafting detailed, effective system prompts for AI agents in a gym/fitness business context.

Your task is to take a brief description of what an AI agent should do and expand it into a comprehensive, well-structured system prompt that:

1. Clearly defines the agent's role and purpose
2. Specifies the tone and communication style (professional, friendly, helpful)
3. Outlines key responsibilities and capabilities
4. Includes relevant gym/fitness industry knowledge
5. Sets clear boundaries and limitations
6. Provides examples of good responses when appropriate
7. Emphasizes data privacy and security
8. Includes instructions for handling common scenarios

Make the system prompt detailed but concise (aim for 200-400 words). Use clear, direct language.`,
        },
        {
          role: "user",
          content: `Generate a detailed system prompt for an AI agent with this description:\n\n"${description}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const generatedPrompt =
      completion.choices[0]?.message?.content || "Failed to generate prompt";

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
    });
  } catch (error: any) {
    console.error("[Generate Prompt] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate prompt" },
      { status: 500 },
    );
  }
}
