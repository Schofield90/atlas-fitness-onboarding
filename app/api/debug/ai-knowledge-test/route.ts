import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import {
  fetchRelevantKnowledge,
  fetchCoreKnowledge,
} from "@/app/lib/knowledge";
import {
  generateAIResponse,
  formatKnowledgeContext,
} from "@/app/lib/ai/anthropic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testMessage =
      searchParams.get("message") || "where is the gym located";

    // Step 1: Check if Supabase is connected
    const supabase = createClient();
    const { count: knowledgeCount } = await supabase
      .from("knowledge")
      .select("*", { count: "exact", head: true });

    // Step 2: Fetch all knowledge
    const { data: allKnowledge } = await supabase
      .from("knowledge")
      .select("*")
      .order("created_at", { ascending: false });

    // Step 3: Test core knowledge fetching
    const coreKnowledge = await fetchCoreKnowledge();

    // Step 4: Test relevant knowledge fetching
    const relevantKnowledge = await fetchRelevantKnowledge(testMessage);

    // Step 5: Format knowledge context
    const knowledgeContext = formatKnowledgeContext(relevantKnowledge);

    // Step 6: Test AI response
    let aiResponse = null;
    let aiError = null;
    try {
      aiResponse = await generateAIResponse(
        testMessage,
        "+447123456789",
        knowledgeContext,
      );
    } catch (error) {
      aiError = error instanceof Error ? error.message : "Unknown error";
    }

    // Step 7: Look for real gym data in knowledge
    const hasRealData = {
      harrogate:
        allKnowledge?.some((k) =>
          k.content.toLowerCase().includes("harrogate"),
        ) || false,
      york:
        allKnowledge?.some((k) => k.content.toLowerCase().includes("york")) ||
        false,
      claroCount:
        allKnowledge?.some((k) =>
          k.content.toLowerCase().includes("claro court"),
        ) || false,
      austerRoad:
        allKnowledge?.some((k) =>
          k.content.toLowerCase().includes("auster road"),
        ) || false,
      hasAddresses:
        allKnowledge?.some(
          (k) =>
            k.content.toLowerCase().includes("hg1") ||
            k.content.toLowerCase().includes("yo31"),
        ) || false,
      hasPrices: allKnowledge?.some((k) => k.content.includes("£")) || false,
    };

    // Step 8: Extract location-specific knowledge
    const locationKnowledge =
      allKnowledge?.filter(
        (k) =>
          k.content.toLowerCase().includes("location") ||
          k.content.toLowerCase().includes("address") ||
          k.content.toLowerCase().includes("harrogate") ||
          k.content.toLowerCase().includes("york") ||
          k.content.toLowerCase().includes("situated"),
      ) || [];

    return NextResponse.json({
      diagnostics: {
        timestamp: new Date().toISOString(),
        testMessage,
        supabaseConnected: knowledgeCount !== null,
        totalKnowledgeItems: knowledgeCount || 0,
        coreKnowledgeCount: coreKnowledge.length,
        relevantKnowledgeCount: relevantKnowledge.length,
        knowledgeContextLength: knowledgeContext.length,
        hasRealData,
        locationKnowledgeCount: locationKnowledge.length,
      },
      knowledgeTypes:
        allKnowledge?.reduce(
          (acc, k) => {
            acc[k.type] = (acc[k.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
      locationKnowledge: locationKnowledge.map((k) => ({
        type: k.type,
        content: k.content,
        created: k.created_at,
      })),
      sampleKnowledge:
        allKnowledge?.slice(0, 5).map((k) => ({
          type: k.type,
          content: k.content.substring(0, 200) + "...",
          created: k.created_at,
        })) || [],
      knowledgeContextPreview: knowledgeContext.substring(0, 1000) + "...",
      aiTestResult: aiError
        ? {
            success: false,
            error: aiError,
          }
        : {
            success: true,
            response: aiResponse?.message,
            usesRealData:
              aiResponse?.message.includes("Harrogate") ||
              aiResponse?.message.includes("York") ||
              aiResponse?.message.includes("Claro Court") ||
              aiResponse?.message.includes("Auster Road"),
          },
      recommendations: generateRecommendations(
        hasRealData,
        locationKnowledge.length,
        aiResponse?.message || "",
      ),
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

function generateRecommendations(
  hasRealData: any,
  locationCount: number,
  aiResponse: string,
): string[] {
  const recommendations = [];

  if (!hasRealData.harrogate && !hasRealData.york) {
    recommendations.push(
      "No gym location data found. Add location information to knowledge base.",
    );
  }

  if (!hasRealData.hasPrices) {
    recommendations.push(
      "No pricing data found. Add membership prices to knowledge base.",
    );
  }

  if (locationCount === 0) {
    recommendations.push(
      "No location-specific knowledge entries. Create FAQ entries with gym addresses.",
    );
  }

  if (
    aiResponse &&
    !aiResponse.includes("Harrogate") &&
    !aiResponse.includes("York")
  ) {
    recommendations.push(
      "AI is not using real location data. Check knowledge formatting and AI prompt.",
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Knowledge base appears properly configured with real gym data.",
    );
  }

  return recommendations;
}
