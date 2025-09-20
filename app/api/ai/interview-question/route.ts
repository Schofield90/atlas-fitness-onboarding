import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Lazy initialization to avoid build-time instantiation
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (anthropic) return anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return null;
  }

  try {
    anthropic = new Anthropic({ apiKey });
    return anthropic;
  } catch (error) {
    console.error("Failed to initialize Anthropic:", error);
    return null;
  }
}

// Categories of information the AI needs to know
const questionCategories = [
  { category: "Basic Information", priority: 1 },
  { category: "Pricing & Memberships", priority: 1 },
  { category: "Services & Classes", priority: 2 },
  { category: "Facilities & Equipment", priority: 2 },
  { category: "Policies & Rules", priority: 3 },
  { category: "Target Audience", priority: 1 },
  { category: "Unique Selling Points", priority: 1 },
  { category: "Competition & Market", priority: 3 },
  { category: "Success Stories", priority: 2 },
  { category: "Common Objections", priority: 1 },
];

export async function POST(request: NextRequest) {
  try {
    const { previousAnswers = [] } = await request.json();

    // Get existing knowledge from database
    const { createClient } = await import("@/app/lib/supabase/server");
    const supabase = await createClient();

    const { data: existingKnowledge } = await supabase
      .from("knowledge")
      .select("type, content, metadata");

    // Extract what we already know
    const knownInfo =
      existingKnowledge?.map((k) => k.content.toLowerCase()) || [];

    // Determine which categories have been covered
    const answeredCategories = previousAnswers.map((a: any) => a.category);
    const unansweredCategories = questionCategories.filter(
      (cat) => !answeredCategories.includes(cat.category),
    );

    // Prioritize high-priority unanswered categories
    const nextCategory =
      unansweredCategories.sort((a, b) => a.priority - b.priority)[0] ||
      questionCategories[Math.floor(Math.random() * questionCategories.length)];

    // Check if we already have basic hours info
    const hasHours = knownInfo.some(
      (info) =>
        info.includes("hours") ||
        info.includes("open") ||
        info.includes("monday") ||
        info.includes("weekday"),
    );

    const hasPricing = knownInfo.some(
      (info) =>
        info.includes("membership") &&
        (info.includes("£") || info.includes("$") || info.includes("price")),
    );

    // Generate a smart question based on what we already know
    const prompt = `You are helping gather information about a gym business to train an AI sales assistant.

Existing knowledge in database:
${existingKnowledge
  ?.slice(0, 10)
  .map((k) => `- ${k.type}: ${k.content.substring(0, 100)}...`)
  .join("\n")}

Previous answers in this session:
${previousAnswers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}

${hasHours ? "NOTE: We already have operating hours information, do NOT ask about basic hours." : ""}
${hasPricing ? "NOTE: We already have membership pricing, do NOT ask about basic membership costs." : ""}

Generate ONE specific, practical question about the gym's "${nextCategory.category}" that we DON'T already know.

Rules:
1. Ask for concrete, specific information (prices, times, names, etc.)
2. Keep questions short and clear
3. NEVER ask for information already in the existing knowledge
4. Focus on what customers would actually ask about
5. Make it conversational, not formal
6. If category basics are covered, ask for more specific details (e.g., if we have general hours, ask about holiday hours)

Return JSON in this format:
{
  "question": "Your question here",
  "category": "${nextCategory.category}",
  "knowledgeType": "faq|pricing|policies|services|schedule",
  "context": "Brief explanation why this info is important (optional)"
}`;

    const client = getAnthropicClient();
    if (!client) {
      return NextResponse.json(
        { error: "Anthropic not configured" },
        { status: 500 },
      );
    }

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      temperature: 0.7,
      system:
        "You are a helpful assistant gathering information about a gym business. Return only valid JSON.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    try {
      const questionData = JSON.parse(content);
      return NextResponse.json(questionData);
    } catch (error) {
      // Fallback question if parsing fails
      return NextResponse.json({
        question: `What are the main ${nextCategory.category.toLowerCase()} at your gym?`,
        category: nextCategory.category,
        knowledgeType: "faq",
      });
    }
  } catch (error: any) {
    console.error("Interview question error:", error);

    // Return a default question
    return NextResponse.json({
      question: "What are your gym's operating hours?",
      category: "Basic Information",
      knowledgeType: "faq",
    });
  }
}
