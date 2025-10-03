import { NextRequest, NextResponse } from "next/server";
import { getPersonalizedNutritionQuestions } from "@/app/lib/nutrition/personalized-ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { existingPreferences, conversationHistory } = body;

    // Generate personalized questions using AI
    const result = await getPersonalizedNutritionQuestions(
      existingPreferences || {},
      conversationHistory || [],
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error generating personalized questions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate questions",
        // Fallback questions if AI fails
        questions: [
          {
            question: "What type of meals do you enjoy most?",
            category: "favorite_foods",
            reason: "Understanding meal preferences",
          },
          {
            question: "How often do you cook at home vs eat out?",
            category: "lifestyle",
            reason: "Tailoring meal complexity",
          },
          {
            question: "Are there any ingredients you find hard to get locally?",
            category: "shopping_preferences",
            reason: "Ensuring practical meal plans",
          },
        ],
        completeness: 0,
      },
      { status: 200 }, // Return 200 even on error to avoid breaking the UI
    );
  }
}
