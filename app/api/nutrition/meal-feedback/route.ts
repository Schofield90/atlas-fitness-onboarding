import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();

    const {
      meal,
      feedback,
      nutritionProfile,
      day,
      mealIndex,
      conversationHistory,
    } = await request.json();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build conversation context
    const messages: any[] = [
      {
        role: "system",
        content: `You are a helpful nutrition assistant. The user is giving feedback about a meal in their meal plan. 
        Current meal details:
        - Name: ${meal.name}
        - Type: ${meal.type}
        - Calories: ${meal.calories}
        - Protein: ${meal.protein}g
        - Carbs: ${meal.carbs}g
        - Fat: ${meal.fat}g
        
        User's nutrition requirements:
        - Daily calories: ${nutritionProfile.target_calories}
        - Daily protein: ${nutritionProfile.protein_grams}g
        - Daily carbs: ${nutritionProfile.carbs_grams}g
        - Daily fat: ${nutritionProfile.fat_grams}g
        - Goal: ${nutritionProfile.goal}
        - Dietary type: ${nutritionProfile.dietary_type || "balanced"}
        - Allergies: ${nutritionProfile.allergies?.join(", ") || "none"}
        
        Based on their feedback, either:
        1. Ask clarifying questions to better understand their needs
        2. Suggest a replacement meal that addresses their concerns
        3. Modify the existing meal to meet their requirements
        
        If generating a replacement meal, ensure it fits the same meal type (${meal.type}) and maintains similar macro ratios.
        Always be conversational and helpful.`,
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: feedback,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content || "";

    // Check if the response includes a meal suggestion
    let updatedMeal = null;
    if (
      response.toLowerCase().includes("here's a replacement") ||
      response.toLowerCase().includes("try this instead") ||
      response.toLowerCase().includes("how about")
    ) {
      // Generate a new meal based on the feedback
      const mealGeneration = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Generate a replacement meal in JSON format based on the user's feedback. Return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Create a ${meal.type} meal that addresses this feedback: "${feedback}"
            
            Requirements:
            - Calories: ${meal.calories} (±50)
            - Protein: ${meal.protein}g (±5)
            - Carbs: ${meal.carbs}g (±5)
            - Fat: ${meal.fat}g (±5)
            - Dietary type: ${nutritionProfile.dietary_type || "balanced"}
            - Avoid: ${nutritionProfile.allergies?.join(", ") || "nothing specific"}
            
            Return JSON in this format:
            {
              "type": "${meal.type}",
              "name": "Meal Name",
              "calories": ${meal.calories},
              "protein": ${meal.protein},
              "carbs": ${meal.carbs},
              "fat": ${meal.fat},
              "ingredients": ["ingredient1", "ingredient2"],
              "instructions": "Brief cooking instructions"
            }`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      try {
        updatedMeal = JSON.parse(
          mealGeneration.choices[0].message.content || "{}",
        );
      } catch (e) {
        console.error("Failed to parse meal JSON:", e);
      }
    }

    return NextResponse.json({
      success: true,
      response,
      updatedMeal,
    });
  } catch (error: any) {
    console.error("Error processing meal feedback:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
