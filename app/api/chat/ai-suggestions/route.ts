import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface ChatMessage {
  content: string;
  type: "sms" | "email" | "whatsapp";
  direction: "inbound" | "outbound";
  timestamp: string;
}

interface AIResponse {
  suggestions: string[];
  summary: string;
  next_actions: string[];
  sentiment: "positive" | "neutral" | "negative";
  urgency: "high" | "medium" | "low";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const { conversation_id, customer_info, recent_messages, context } = body;

    // Validate required fields
    if (!conversation_id || !recent_messages) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get AI chatbot settings for the organization
    const { data: aiSettings } = await supabase
      .from("integration_settings")
      .select("config")
      .eq("organization_id", userOrg.organization_id)
      .eq("integration_type", "ai_chatbot")
      .single();

    const personality = aiSettings?.config?.personality || {
      friendliness: "high",
      formality: "professional",
      enthusiasm: "medium",
      emoji_usage: true,
    };

    const businessInfo = aiSettings?.config?.business_hours || {};

    // Generate AI suggestions based on conversation context
    const aiResponse: AIResponse = await generateAISuggestions(
      recent_messages,
      customer_info,
      personality,
      businessInfo,
      context,
    );

    // Store conversation context for future reference
    await supabase.from("ai_conversation_contexts").upsert(
      {
        organization_id: userOrg.organization_id,
        customer_phone: customer_info?.phone || "",
        customer_email: customer_info?.email || "",
        conversation_history: recent_messages,
        context_summary: aiResponse.summary,
        last_interaction: new Date().toISOString(),
        personality_profile: personality,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id,customer_phone",
      },
    );

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("Unexpected error in AI suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateAISuggestions(
  messages: ChatMessage[],
  customerInfo: any,
  personality: any,
  businessInfo: any,
  context?: any,
): Promise<AIResponse> {
  // In a real implementation, this would call OpenAI/Claude API
  // For now, we'll use rule-based logic with templates

  const lastMessage = messages[messages.length - 1];
  const lastContent = lastMessage?.content?.toLowerCase() || "";

  // Determine sentiment
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  const positiveWords = [
    "great",
    "thanks",
    "good",
    "awesome",
    "perfect",
    "yes",
    "interested",
  ];
  const negativeWords = [
    "no",
    "cancel",
    "problem",
    "issue",
    "complaint",
    "disappointed",
  ];

  if (positiveWords.some((word) => lastContent.includes(word))) {
    sentiment = "positive";
  } else if (negativeWords.some((word) => lastContent.includes(word))) {
    sentiment = "negative";
  }

  // Determine urgency based on keywords and customer status
  let urgency: "high" | "medium" | "low" = "medium";
  const urgentWords = [
    "urgent",
    "asap",
    "immediately",
    "emergency",
    "now",
    "cancel",
    "refund",
  ];
  const lowPriorityWords = ["later", "eventually", "sometime", "when possible"];

  if (urgentWords.some((word) => lastContent.includes(word))) {
    urgency = "high";
  } else if (lowPriorityWords.some((word) => lastContent.includes(word))) {
    urgency = "low";
  }

  // Generate context-aware suggestions
  const suggestions: string[] = [];
  const nextActions: string[] = [];

  // Booking-related suggestions
  if (
    lastContent.includes("book") ||
    lastContent.includes("class") ||
    lastContent.includes("session")
  ) {
    suggestions.push(
      getPersonalizedMessage(
        "I'd be happy to help you book a class! What type of workout are you interested in?",
        personality,
      ),
    );
    suggestions.push(
      getPersonalizedMessage(
        "Our most popular classes are yoga, HIIT, and strength training. Which would you prefer?",
        personality,
      ),
    );
    nextActions.push("Show available class times");
    nextActions.push("Book preferred class");
  }

  // Membership inquiries
  if (
    lastContent.includes("member") ||
    lastContent.includes("plan") ||
    lastContent.includes("price")
  ) {
    suggestions.push(
      getPersonalizedMessage(
        "We have several membership options to suit different needs. Would you like me to send you our pricing?",
        personality,
      ),
    );
    suggestions.push(
      getPersonalizedMessage(
        "I can offer you a complimentary trial session to try our facilities first. Interested?",
        personality,
      ),
    );
    nextActions.push("Send membership pricing");
    nextActions.push("Schedule trial session");
  }

  // Information requests
  if (
    lastContent.includes("hour") ||
    lastContent.includes("open") ||
    lastContent.includes("time")
  ) {
    const hours =
      businessInfo.start && businessInfo.end
        ? `We're open ${businessInfo.start} to ${businessInfo.end} daily`
        : "We're open 6am-10pm Monday-Friday, 7am-8pm weekends";
    suggestions.push(getPersonalizedMessage(hours, personality));
    nextActions.push("Share opening hours");
  }

  // Default suggestions if no specific context
  if (suggestions.length === 0) {
    suggestions.push(
      getPersonalizedMessage(
        "Thanks for your message! How can I help you today?",
        personality,
      ),
    );
    suggestions.push(
      getPersonalizedMessage(
        "Is there anything specific you'd like to know about our gym?",
        personality,
      ),
    );
    suggestions.push(
      getPersonalizedMessage(
        "Would you like to book a class or learn about our membership options?",
        personality,
      ),
    );
  }

  // Generate summary
  const messageCount = messages.length;
  const customerName = customerInfo?.name || "Customer";
  const conversationTone =
    sentiment === "positive"
      ? "positive and engaged"
      : sentiment === "negative"
        ? "concerned or frustrated"
        : "neutral and informational";

  const summary = `Conversation with ${customerName} (${messageCount} messages). Customer appears ${conversationTone}. ${
    lastMessage.direction === "inbound"
      ? "Waiting for response"
      : "Last message sent"
  }.`;

  return {
    suggestions,
    summary,
    next_actions: nextActions,
    sentiment,
    urgency,
  };
}

function getPersonalizedMessage(baseMessage: string, personality: any): string {
  let personalizedMessage = baseMessage;

  // Adjust for enthusiasm level
  if (personality.enthusiasm === "high") {
    personalizedMessage = personalizedMessage.replace(/\!$/, "!!");
    if (!personalizedMessage.includes("!")) {
      personalizedMessage += "!";
    }
  }

  // Add emojis if enabled
  if (personality.emoji_usage) {
    // Add appropriate emojis based on message content
    if (
      personalizedMessage.includes("book") ||
      personalizedMessage.includes("class")
    ) {
      personalizedMessage += " 📅";
    } else if (
      personalizedMessage.includes("member") ||
      personalizedMessage.includes("trial")
    ) {
      personalizedMessage += " 💪";
    } else if (
      personalizedMessage.includes("help") ||
      personalizedMessage.includes("support")
    ) {
      personalizedMessage += " 😊";
    }
  }

  // Adjust formality
  if (personality.formality === "casual") {
    personalizedMessage = personalizedMessage.replace(
      /Would you like/,
      "Would you like",
    );
    personalizedMessage = personalizedMessage.replace(/I would/, "I'd");
    personalizedMessage = personalizedMessage.replace(/We are/, "We're");
  } else if (personality.formality === "formal") {
    personalizedMessage = personalizedMessage.replace(/I'd/, "I would");
    personalizedMessage = personalizedMessage.replace(/We're/, "We are");
    personalizedMessage = personalizedMessage.replace(/don't/, "do not");
  }

  return personalizedMessage;
}
