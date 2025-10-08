import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import {
  generateAIResponse,
  formatKnowledgeContext,
} from "@/app/lib/ai/anthropic";
import { fetchRelevantKnowledge } from "@/app/lib/knowledge";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const messageData = {
      from: params.get("From") || "",
      to: params.get("To") || "",
      body: params.get("Body") || "",
      messageSid: params.get("MessageSid") || "",
      accountSid: params.get("AccountSid") || "",
      smsStatus: params.get("SmsStatus") || "",
    };

    console.log("Debug webhook received:", messageData);

    // Test the knowledge fetching
    const knowledge = await fetchRelevantKnowledge(messageData.body);
    const knowledgeContext = formatKnowledgeContext(knowledge);

    console.log("Knowledge debug:", {
      query: messageData.body,
      knowledgeCount: knowledge.length,
      hasLocationData: knowledge.some(
        (k) => k.content.includes("Harrogate") || k.content.includes("York"),
      ),
      knowledgePreview: knowledge
        .slice(0, 3)
        .map((k) => k.content.substring(0, 100)),
    });

    // Generate AI response
    const aiResponse = await generateAIResponse(
      messageData.body,
      messageData.from,
      knowledgeContext,
    );

    // Create TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${aiResponse.response}</Message>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Debug webhook error:", error);

    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Thanks for your message! There was a technical issue. Please call us for assistance.</Message>
</Response>`;

    return new NextResponse(fallbackTwiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
