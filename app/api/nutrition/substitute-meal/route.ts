import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { generateMealSubstitution } from "@/app/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const { originalMeal, reason, nutritionProfile, preferences } =
      await request.json();

    if (!originalMeal || !nutritionProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Original meal and nutrition profile are required",
        },
        { status: 400 },
      );
    }

    // Generate substitution using OpenAI
    console.log("Generating meal substitution for:", originalMeal.name);
    const substitutions = await generateMealSubstitution(
      originalMeal,
      reason || "User requested alternative",
      nutritionProfile,
      preferences,
    );

    return NextResponse.json({
      success: true,
      data: substitutions,
    });
  } catch (error: any) {
    console.error("Error generating substitution:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate substitution",
      },
      { status: 500 },
    );
  }
}
