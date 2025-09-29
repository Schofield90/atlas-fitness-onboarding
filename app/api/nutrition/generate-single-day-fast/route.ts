import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Set max duration for ultra-fast generation
export const maxDuration = 30; // 30 seconds max

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();

    const { nutritionProfile, date } = await request.json();

    if (!nutritionProfile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile is required" },
        { status: 400 },
      );
    }

    console.log("Generating FAST single day meal plan for date:", date);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Calculate daily targets
    const dailyCalories = nutritionProfile.target_calories || 2000;
    const dailyProtein = nutritionProfile.protein_grams || 150;
    const dailyCarbs = nutritionProfile.carbs_grams || 250;
    const dailyFat = nutritionProfile.fat_grams || 67;

    // Build dietary preferences string
    const dietaryPrefs =
      nutritionProfile.dietary_preferences?.join(", ") || "none";
    const allergies = nutritionProfile.allergies?.join(", ") || "none";

    // Simplified prompt for faster generation
    const prompt = `Generate 5 meals (breakfast, snack, lunch, snack, dinner) totaling ${dailyCalories}cal, ${dailyProtein}g protein.
Diet: ${dietaryPrefs}. Avoid: ${allergies}.
Use grams/ml only. Return JSON:
{
  "meals": [
    {
      "name": "meal name",
      "description": "brief description",
      "prep_time": "X minutes",
      "cook_time": "Y minutes",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "ingredients": [
        {"item": "name", "amount": "100", "unit": "g"}
      ],
      "instructions": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "totals": {
    "calories": ${dailyCalories},
    "protein": ${dailyProtein},
    "carbs": ${dailyCarbs},
    "fat": ${dailyFat}
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Faster model
      messages: [
        {
          role: "system",
          content:
            "You are a nutritionist. Return only valid JSON. Use British measurements (g, ml). Be brief and precise.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500, // Even smaller limit
      response_format: { type: "json_object" },
    });

    const mealPlan = JSON.parse(completion.choices[0].message.content || "{}");

    // Validate and ensure 5 meals
    if (!mealPlan.meals || mealPlan.meals.length !== 5) {
      // Use predefined meals as fallback
      mealPlan.meals = getQuickFallbackMeals(
        dailyCalories,
        dailyProtein,
        dailyCarbs,
        dailyFat,
      );
    }

    // Label meals properly
    const mealTypes = [
      "Breakfast",
      "Morning Snack",
      "Lunch",
      "Afternoon Snack",
      "Dinner",
    ];
    mealPlan.meals = mealPlan.meals.map((meal: any, index: number) => ({
      ...meal,
      type: mealTypes[index],
      prep_time:
        meal.prep_time ||
        (index === 1 || index === 3 ? "5 minutes" : "15 minutes"),
      cook_time:
        meal.cook_time ||
        (index === 1 || index === 3 ? "0 minutes" : "20 minutes"),
      instructions: meal.instructions || [
        "Prepare ingredients",
        "Cook as directed",
        "Serve and enjoy",
      ],
      ingredients: meal.ingredients || [],
    }));

    // Save to database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Store the meal plan
    const { data: savedPlan, error: saveError } = await supabaseAdmin
      .from("meal_plans")
      .insert({
        profile_id: nutritionProfile.id,
        organization_id: userWithOrg.organizationId,
        date: date,
        meal_data: mealPlan,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving meal plan:", saveError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedPlan?.id,
        date,
        ...mealPlan,
      },
    });
  } catch (error: any) {
    console.error("Error generating fast meal plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate meal plan",
      },
      { status: 500 },
    );
  }
}

function getQuickFallbackMeals(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
) {
  return [
    {
      name: "Porridge with Berries",
      description: "Hearty oats with fresh berries",
      calories: Math.round(calories * 0.25),
      protein: Math.round(protein * 0.25),
      carbs: Math.round(carbs * 0.25),
      fat: Math.round(fat * 0.25),
      prep_time: "5 minutes",
      cook_time: "10 minutes",
      ingredients: [
        { item: "oats", amount: "60", unit: "g" },
        { item: "milk", amount: "250", unit: "ml" },
        { item: "berries", amount: "100", unit: "g" },
      ],
      instructions: [
        "Heat milk in a saucepan",
        "Add oats and simmer for 5 minutes",
        "Top with berries and serve",
      ],
    },
    {
      name: "Protein Bar",
      description: "Nutritious snack bar",
      calories: Math.round(calories * 0.1),
      protein: Math.round(protein * 0.1),
      carbs: Math.round(carbs * 0.1),
      fat: Math.round(fat * 0.1),
      prep_time: "1 minute",
      cook_time: "0 minutes",
      ingredients: [{ item: "protein bar", amount: "1", unit: "bar" }],
      instructions: ["Unwrap and enjoy"],
    },
    {
      name: "Chicken Wrap",
      description: "Grilled chicken with salad in a wrap",
      calories: Math.round(calories * 0.3),
      protein: Math.round(protein * 0.3),
      carbs: Math.round(carbs * 0.3),
      fat: Math.round(fat * 0.3),
      prep_time: "10 minutes",
      cook_time: "15 minutes",
      ingredients: [
        { item: "chicken breast", amount: "120", unit: "g" },
        { item: "tortilla wrap", amount: "1", unit: "large" },
        { item: "salad mix", amount: "50", unit: "g" },
        { item: "hummus", amount: "30", unit: "g" },
      ],
      instructions: [
        "Grill chicken breast until cooked",
        "Warm the wrap",
        "Spread hummus, add chicken and salad",
        "Roll up and serve",
      ],
    },
    {
      name: "Nuts and Fruit",
      description: "Mixed nuts with dried fruit",
      calories: Math.round(calories * 0.1),
      protein: Math.round(protein * 0.1),
      carbs: Math.round(carbs * 0.1),
      fat: Math.round(fat * 0.1),
      prep_time: "1 minute",
      cook_time: "0 minutes",
      ingredients: [
        { item: "mixed nuts", amount: "25", unit: "g" },
        { item: "dried fruit", amount: "20", unit: "g" },
      ],
      instructions: ["Mix together and enjoy"],
    },
    {
      name: "Beef Stir-Fry",
      description: "Lean beef with vegetables and rice",
      calories: Math.round(calories * 0.25),
      protein: Math.round(protein * 0.25),
      carbs: Math.round(carbs * 0.25),
      fat: Math.round(fat * 0.25),
      prep_time: "15 minutes",
      cook_time: "20 minutes",
      ingredients: [
        { item: "lean beef", amount: "120", unit: "g" },
        { item: "mixed vegetables", amount: "150", unit: "g" },
        { item: "brown rice", amount: "60", unit: "g" },
        { item: "soy sauce", amount: "15", unit: "ml" },
      ],
      instructions: [
        "Cook rice according to package instructions",
        "Stir-fry beef until browned",
        "Add vegetables and soy sauce",
        "Cook until tender and serve over rice",
      ],
    },
  ];
}
