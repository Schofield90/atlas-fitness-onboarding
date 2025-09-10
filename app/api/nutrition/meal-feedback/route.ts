import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { adjustMealPlanFromFeedback } from "@/app/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      mealId,
      mealPlanId,
      clientId,
      rating,
      tasteRating,
      easeRating,
      satietyRating,
      wouldRepeat,
      feedbackText,
      nutritionProfile,
      preferences,
    } = body;

    if (!mealId || !clientId) {
      return NextResponse.json(
        { success: false, error: "Meal ID and client ID are required" },
        { status: 400 },
      );
    }

    // Save feedback to database
    const { data: feedback, error: feedbackError } = await supabase
      .from("meal_feedback")
      .insert({
        meal_id: mealId,
        client_id: clientId,
        rating,
        taste_rating: tasteRating,
        ease_rating: easeRating,
        satiety_rating: satietyRating,
        would_repeat: wouldRepeat,
        feedback_text: feedbackText,
        ai_notes: {
          timestamp: new Date().toISOString(),
          mealPlanId,
          context: "user_feedback",
        },
      })
      .select()
      .single();

    if (feedbackError) {
      console.error("Error saving feedback:", feedbackError);
      // Continue even if saving fails - we can still provide AI suggestions
    }

    // If we have enough context, get AI recommendations for improvements
    let aiRecommendations = null;
    if (nutritionProfile && feedbackText) {
      try {
        aiRecommendations = await adjustMealPlanFromFeedback(
          {
            mealId,
            rating,
            tasteRating,
            easeRating,
            satietyRating,
            wouldRepeat,
            feedbackText,
          },
          nutritionProfile,
          preferences,
        );
      } catch (aiError) {
        console.error("Error getting AI recommendations:", aiError);
        // Non-critical error, continue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        feedback: feedback || body, // Return the input if DB save failed
        recommendations: aiRecommendations,
      },
    });
  } catch (error: any) {
    console.error("Error processing meal feedback:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process feedback",
      },
      { status: 500 },
    );
  }
}
