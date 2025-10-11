import { NextRequest, NextResponse } from "next/server";
import { AnthropicProvider } from "@/app/lib/ai-agents/providers/anthropic-provider";

/**
 * AI-powered content rewrite for landing page components
 * Uses Claude Sonnet 4.5 for high-quality content generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { componentType, currentContent, field, context } = body;

    // Validate required fields
    if (!componentType || !field) {
      return NextResponse.json(
        { error: "Missing required fields: componentType, field" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI content generation is not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Initialize Anthropic provider with Sonnet 4.5
    const anthropic = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(componentType, field);

    // Build user prompt with current content
    const userPrompt = buildUserPrompt(componentType, field, currentContent, context);

    // Execute AI generation
    const result = await anthropic.execute(
      [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      {
        model: "claude-sonnet-4-20250514", // Sonnet 4.5
        temperature: 0.8, // Higher creativity for marketing content
        max_tokens: 2048,
        system: systemPrompt,
      }
    );

    if (!result.success || !result.content) {
      return NextResponse.json(
        { error: result.error || "AI generation failed" },
        { status: 500 }
      );
    }

    // Extract text content from response
    const textContent = result.content.find((c) => c.type === "text");
    if (!textContent || !textContent.text) {
      return NextResponse.json(
        { error: "No text content generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: textContent.text,
      cost: result.cost,
    });
  } catch (error) {
    console.error("[AI Rewrite] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Build system prompt based on component type and field
 */
function buildSystemPrompt(componentType: string, field: string): string {
  const basePrompt = `You are an expert copywriter specializing in high-converting landing pages for fitness businesses (gyms, studios, coaches).

Your writing style:
- Clear, compelling, action-oriented
- Benefits-focused (not features)
- Emotional connection with fitness goals
- Professional but energetic tone
- Short, punchy sentences
- Strong calls-to-action

Generate ${field} content for a ${componentType} component that:
1. Grabs attention immediately
2. Speaks directly to the target audience's pain points
3. Highlights transformation and results
4. Creates urgency and desire to take action
5. Uses power words and emotional triggers

Keep it concise, impactful, and conversion-focused.`;

  return basePrompt;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(
  componentType: string,
  field: string,
  currentContent?: string,
  context?: any
): string {
  let prompt = `Generate ${field} content for a ${componentType} component on a fitness business landing page.\n\n`;

  // Add current content for improvement
  if (currentContent) {
    prompt += `Current content: "${currentContent}"\n\n`;
    prompt += `Improve this content to be more compelling, clear, and conversion-focused.\n\n`;
  }

  // Add contextual information
  if (context) {
    if (context.businessName) {
      prompt += `Business name: ${context.businessName}\n`;
    }
    if (context.targetAudience) {
      prompt += `Target audience: ${context.targetAudience}\n`;
    }
    if (context.mainBenefit) {
      prompt += `Main benefit: ${context.mainBenefit}\n`;
    }
    if (context.tone) {
      prompt += `Desired tone: ${context.tone}\n`;
    }
    prompt += `\n`;
  }

  // Component-specific guidance
  switch (componentType) {
    case "hero":
      if (field === "title") {
        prompt += `Generate a powerful headline that immediately captures attention and communicates the core value proposition. Max 10 words.`;
      } else if (field === "subtitle") {
        prompt += `Generate a compelling subheadline that expands on the headline and creates desire. Max 15 words.`;
      } else if (field === "description") {
        prompt += `Generate supporting body copy that addresses pain points and highlights benefits. 2-3 sentences max.`;
      }
      break;

    case "cta":
      if (field === "title") {
        prompt += `Generate an urgent, action-oriented headline that creates FOMO. Max 12 words.`;
      } else if (field === "description") {
        prompt += `Generate a persuasive description that gives one final reason to take action. 1-2 sentences.`;
      }
      break;

    case "text":
      prompt += `Generate ${field === "content" ? "body copy" : field} that is engaging, scannable, and persuasive. Use short paragraphs.`;
      break;

    default:
      prompt += `Generate compelling ${field} content that drives conversions.`;
  }

  prompt += `\n\nReturn ONLY the generated content, no explanations or formatting.`;

  return prompt;
}
