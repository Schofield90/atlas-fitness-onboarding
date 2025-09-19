import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";
import { generatePersonalizedMealPlan } from "@/app/lib/nutrition/personalized-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nutritionProfile,
      mealType,
      mealIndex,
      date,
      preferences = {},
      conversationHistory = [],
      usePersonalizedAI = true,
    } = body;

    const supabase = createClient();

    if (!nutritionProfile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile required" },
        { status: 400 },
      );
    }

    // Fetch stored preferences if available
    let storedPreferences = {};
    if (nutritionProfile.client_id) {
      const { data: prefData } = await supabase
        .from("nutrition_profiles")
        .select("preferences, dietary_preferences")
        .eq("client_id", nutritionProfile.client_id)
        .single();

      if (prefData) {
        storedPreferences = {
          ...prefData.preferences,
          ...prefData.dietary_preferences,
        };
      }
    }

    // Merge stored preferences with any passed preferences
    const mergedPreferences = {
      ...storedPreferences,
      ...preferences,
    };

    // Use personalized AI if preferences exist
    if (usePersonalizedAI && Object.keys(mergedPreferences).length > 0) {
      try {
        const personalizedMeal = await generatePersonalizedMealPlan(
          mergedPreferences,
          nutritionProfile,
          mealType as any,
          date || new Date().toLocaleDateString(),
        );

        return NextResponse.json({
          success: true,
          meal: personalizedMeal,
        });
      } catch (error) {
        console.error("Personalized meal generation failed:", error);
        // Fall back to standard generation
      }
    }

    // Create a prompt that includes user preferences
    const preferencesSummary = mergedPreferences
      ? `
User Preferences:
- Dietary restrictions: ${mergedPreferences.dietary_restrictions?.join(", ") || "None"}
- Allergies: ${mergedPreferences.allergies?.join(", ") || "None"}
- Favorite foods: ${mergedPreferences.favorite_foods?.join(", ") || "None specified"}
- Disliked foods: ${mergedPreferences.disliked_foods?.join(", ") || "None specified"}
- Cooking skill: ${mergedPreferences.cooking_skill || "intermediate"}
- Time availability: ${mergedPreferences.time_availability || "moderate"}
- Cultural preferences: ${mergedPreferences.cultural_preferences || "None specified"}
`
      : "";

    // Include conversation context if available
    const conversationContext =
      conversationHistory && conversationHistory.length > 0
        ? `
Recent feedback:
${conversationHistory
  .filter((msg: any) => msg.role === "user")
  .slice(-3)
  .map((msg: any) => `- ${msg.content}`)
  .join("\n")}
`
        : "";

    const prompt = `Generate a single meal replacement for ${mealType}.

${preferencesSummary}
${conversationContext}

Nutrition targets:
- Calories: ${Math.round(nutritionProfile.target_calories / 5)} (approx 20% of daily)
- Protein: ${Math.round(nutritionProfile.target_protein / 5)}g
- Carbs: ${Math.round(nutritionProfile.target_carbs / 5)}g
- Fat: ${Math.round(nutritionProfile.target_fat / 5)}g

Generate a meal that:
1. Respects ALL dietary restrictions and allergies
2. Incorporates favorite foods when possible
3. Avoids disliked foods
4. Matches the cooking skill level and time availability
5. Considers any specific feedback from the conversation

Return a JSON object with:
{
  "name": "meal name",
  "description": "brief description",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "prep_time": "X minutes",
  "cook_time": "X minutes",
  "ingredients": [
    {"item": "ingredient", "amount": "quantity", "unit": "unit"}
  ],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"]
}`;

    // Call OpenAI API (you'll need to implement this based on your setup)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition expert creating personalized meal plans. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const mealData = JSON.parse(aiResponse.choices[0].message.content);

    // Save the regenerated meal to database if needed
    const adminSupabase = await createAdminClient();

    // Update meal plan in database if date is provided
    if (date && nutritionProfile.id) {
      const mealDate = new Date(date);
      mealDate.setHours(0, 0, 0, 0);

      // Get existing meal plan for this date
      const { data: existingPlan } = await adminSupabase
        .from("meal_plans")
        .select("*")
        .eq("nutrition_profile_id", nutritionProfile.id)
        .eq("date", mealDate.toISOString().split("T")[0])
        .single();

      if (existingPlan && existingPlan.meal_data) {
        // Update the specific meal
        const updatedMealData = { ...existingPlan.meal_data };
        if (updatedMealData.meals && updatedMealData.meals[mealIndex]) {
          updatedMealData.meals[mealIndex] = mealData;

          // Recalculate totals
          updatedMealData.totals = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };

          updatedMealData.meals.forEach((meal: any) => {
            updatedMealData.totals.calories += meal.calories || 0;
            updatedMealData.totals.protein += meal.protein || 0;
            updatedMealData.totals.carbs += meal.carbs || 0;
            updatedMealData.totals.fat += meal.fat || 0;
          });

          // Update in database
          await adminSupabase
            .from("meal_plans")
            .update({
              meal_data: updatedMealData,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingPlan.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: mealData,
    });
  } catch (error: any) {
    console.error("Error regenerating meal:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to regenerate meal",
      },
      { status: 500 },
    );
  }
}
