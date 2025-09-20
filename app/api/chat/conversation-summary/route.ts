import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

interface MessageSummary {
  date: string;
  message_count: number;
  key_topics: string[];
  sentiment: "positive" | "neutral" | "negative";
  action_items: string[];
  resolution_status: "resolved" | "pending" | "escalated";
}

interface ConversationSummary {
  conversation_id: string;
  customer_name: string;
  total_messages: number;
  date_range: {
    start: string;
    end: string;
  };
  overall_sentiment: "positive" | "neutral" | "negative";
  key_topics: string[];
  outcomes: string[];
  next_steps: string[];
  timeline: MessageSummary[];
  stats: {
    response_time_avg: number;
    customer_satisfaction: number;
    resolution_time: number;
  };
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

    const { conversation_id, time_period } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: "Missing conversation_id" },
        { status: 400 },
      );
    }

    // Get conversation data from database
    // In a real implementation, this would fetch from your messages table
    const messages = await fetchConversationMessages(
      conversation_id,
      time_period,
    );
    const customerInfo = await fetchCustomerInfo(conversation_id);

    // Generate comprehensive summary
    const summary = await generateConversationSummary(
      conversation_id,
      messages,
      customerInfo,
      time_period,
    );

    // Store metrics for analytics
    await supabase.from("ai_conversation_metrics").insert({
      organization_id: userOrg.organization_id,
      conversation_id,
      customer_phone: customerInfo?.phone,
      response_time_seconds: summary.stats.response_time_avg,
      conversation_length_messages: summary.total_messages,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Unexpected error in conversation summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function fetchConversationMessages(
  conversationId: string,
  timePeriod?: string,
) {
  // Mock data - in real implementation, fetch from your database
  const mockMessages = [
    {
      id: "1",
      content:
        "Hi! I'm interested in joining your gym. What membership plans do you have?",
      type: "whatsapp",
      direction: "inbound",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: "2",
      content:
        "Hi Sarah! Great to hear from you. We have several membership options including monthly, 6-month, and annual plans. Would you like me to send you our current pricing? 💪",
      type: "whatsapp",
      direction: "outbound",
      timestamp: new Date(
        Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000,
      ).toISOString(),
      read: true,
      ai_generated: false,
    },
    {
      id: "3",
      content: "Yes please! Also, do you offer trial sessions?",
      type: "whatsapp",
      direction: "inbound",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: "4",
      content:
        "Absolutely! We offer a complimentary trial session for all new members. I can book you in for tomorrow if you'd like? 📅",
      type: "whatsapp",
      direction: "outbound",
      timestamp: new Date(
        Date.now() - 1 * 60 * 60 * 1000 + 3 * 60 * 1000,
      ).toISOString(),
      read: true,
      ai_generated: true,
    },
  ];

  return mockMessages;
}

async function fetchCustomerInfo(conversationId: string) {
  // Mock customer data
  return {
    id: "customer_1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+447123456789",
    membership_status: "Prospective Member",
  };
}

async function generateConversationSummary(
  conversationId: string,
  messages: any[],
  customerInfo: any,
  timePeriod?: string,
): Promise<ConversationSummary> {
  // Analyze messages for key metrics
  const inboundMessages = messages.filter((m) => m.direction === "inbound");
  const outboundMessages = messages.filter((m) => m.direction === "outbound");

  // Calculate response times (in minutes)
  const responseTimes: number[] = [];
  for (let i = 1; i < messages.length; i++) {
    const prevMsg = messages[i - 1];
    const currentMsg = messages[i];

    if (
      prevMsg.direction === "inbound" &&
      currentMsg.direction === "outbound"
    ) {
      const responseTime =
        (new Date(currentMsg.timestamp).getTime() -
          new Date(prevMsg.timestamp).getTime()) /
        (1000 * 60);
      responseTimes.push(responseTime);
    }
  }

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Analyze sentiment from message content
  let overallSentiment: "positive" | "neutral" | "negative" = "neutral";
  const allContent = messages.map((m) => m.content.toLowerCase()).join(" ");

  const positiveWords = [
    "great",
    "thanks",
    "good",
    "awesome",
    "perfect",
    "yes",
    "interested",
    "love",
    "amazing",
  ];
  const negativeWords = [
    "no",
    "cancel",
    "problem",
    "issue",
    "complaint",
    "disappointed",
    "bad",
    "terrible",
  ];

  const positiveCount = positiveWords.filter((word) =>
    allContent.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    allContent.includes(word),
  ).length;

  if (positiveCount > negativeCount) {
    overallSentiment = "positive";
  } else if (negativeCount > positiveCount) {
    overallSentiment = "negative";
  }

  // Extract key topics using keyword analysis
  const keyTopics: string[] = [];
  if (allContent.includes("member") || allContent.includes("plan"))
    keyTopics.push("Membership");
  if (
    allContent.includes("class") ||
    allContent.includes("session") ||
    allContent.includes("book")
  )
    keyTopics.push("Class Booking");
  if (allContent.includes("trial") || allContent.includes("tour"))
    keyTopics.push("Trial/Tour");
  if (
    allContent.includes("price") ||
    allContent.includes("cost") ||
    allContent.includes("fee")
  )
    keyTopics.push("Pricing");
  if (allContent.includes("personal") || allContent.includes("trainer"))
    keyTopics.push("Personal Training");
  if (
    allContent.includes("hour") ||
    allContent.includes("time") ||
    allContent.includes("schedule")
  )
    keyTopics.push("Schedule/Hours");

  // Determine outcomes based on conversation flow
  const outcomes: string[] = [];
  const nextSteps: string[] = [];

  if (
    allContent.includes("trial") &&
    messages.some(
      (m) => m.direction === "outbound" && m.content.includes("book"),
    )
  ) {
    outcomes.push("Trial session discussed");
    nextSteps.push("Schedule trial session");
  }

  if (allContent.includes("pricing") || allContent.includes("plan")) {
    outcomes.push("Membership plans discussed");
    nextSteps.push("Follow up on membership decision");
  }

  if (allContent.includes("interested") && overallSentiment === "positive") {
    outcomes.push("High interest expressed");
    nextSteps.push("Schedule follow-up call");
  }

  // Create timeline summary
  const timeline: MessageSummary[] = [];
  const messagesByDate = groupMessagesByDate(messages);

  for (const [date, dayMessages] of Object.entries(messagesByDate)) {
    const dayTopics = extractTopicsFromMessages(dayMessages);
    const daySentiment = analyzeSentiment(
      dayMessages.map((m) => m.content).join(" "),
    );

    timeline.push({
      date,
      message_count: dayMessages.length,
      key_topics: dayTopics,
      sentiment: daySentiment,
      action_items: extractActionItems(dayMessages),
      resolution_status: determineResolutionStatus(dayMessages),
    });
  }

  // Calculate customer satisfaction based on sentiment and engagement
  const customerSatisfaction =
    overallSentiment === "positive"
      ? 85
      : overallSentiment === "negative"
        ? 35
        : 60;

  // Calculate resolution time (time from first message to last)
  const resolutionTime =
    messages.length > 1
      ? (new Date(messages[messages.length - 1].timestamp).getTime() -
          new Date(messages[0].timestamp).getTime()) /
        (1000 * 60)
      : 0;

  return {
    conversation_id: conversationId,
    customer_name: customerInfo?.name || "Unknown Customer",
    total_messages: messages.length,
    date_range: {
      start: messages[0]?.timestamp || new Date().toISOString(),
      end: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
    },
    overall_sentiment: overallSentiment,
    key_topics: keyTopics,
    outcomes,
    next_steps: nextSteps,
    timeline,
    stats: {
      response_time_avg: Math.round(avgResponseTime * 100) / 100,
      customer_satisfaction: customerSatisfaction,
      resolution_time: Math.round(resolutionTime * 100) / 100,
    },
  };
}

function groupMessagesByDate(messages: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  messages.forEach((message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(message);
  });

  return grouped;
}

function extractTopicsFromMessages(messages: any[]): string[] {
  const content = messages.map((m) => m.content.toLowerCase()).join(" ");
  const topics: string[] = [];

  if (content.includes("book") || content.includes("class"))
    topics.push("Booking");
  if (content.includes("member") || content.includes("plan"))
    topics.push("Membership");
  if (content.includes("trial")) topics.push("Trial");
  if (content.includes("price")) topics.push("Pricing");

  return topics;
}

function analyzeSentiment(
  content: string,
): "positive" | "neutral" | "negative" {
  const lowerContent = content.toLowerCase();
  const positiveWords = [
    "great",
    "thanks",
    "good",
    "awesome",
    "perfect",
    "yes",
  ];
  const negativeWords = ["no", "cancel", "problem", "issue", "complaint"];

  const positiveCount = positiveWords.filter((word) =>
    lowerContent.includes(word),
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    lowerContent.includes(word),
  ).length;

  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

function extractActionItems(messages: any[]): string[] {
  const content = messages.map((m) => m.content.toLowerCase()).join(" ");
  const actions: string[] = [];

  if (content.includes("book") && content.includes("trial")) {
    actions.push("Schedule trial session");
  }
  if (content.includes("send") && content.includes("pricing")) {
    actions.push("Send pricing information");
  }
  if (content.includes("call") || content.includes("phone")) {
    actions.push("Schedule phone call");
  }

  return actions;
}

function determineResolutionStatus(
  messages: any[],
): "resolved" | "pending" | "escalated" {
  const lastMessage = messages[messages.length - 1];
  const content = messages.map((m) => m.content.toLowerCase()).join(" ");

  if (content.includes("thanks") && content.includes("booked")) {
    return "resolved";
  }
  if (content.includes("manager") || content.includes("escalate")) {
    return "escalated";
  }
  if (lastMessage?.direction === "inbound") {
    return "pending";
  }

  return "pending";
}
