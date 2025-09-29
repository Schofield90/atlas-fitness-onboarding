import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import OpenAI from "openai";

// Lazy load OpenAI client to avoid browser environment errors during build
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Set max duration for single day generation
export const maxDuration = 60; // 60 seconds for single day to avoid timeouts

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userWithOrg = await requireAuth();

    const {
      nutritionProfile,
      date,
      existingMeals = [], // Meals already generated to avoid repetition
    } = await request.json();

    if (!nutritionProfile) {
      return NextResponse.json(
        { success: false, error: "Nutrition profile is required" },
        { status: 400 },
      );
    }

    console.log("Generating single day meal plan for date:", date);

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
    const dislikes = nutritionProfile.food_dislikes?.join(", ") || "none";

    // Build existing meals context to avoid repetition
    const existingMealsContext =
      existingMeals.length > 0
        ? `\nAvoid repeating these recent meals: ${existingMeals.slice(-10).join(", ")}`
        : "";

    const prompt = `Generate a detailed meal plan for one day with EXACTLY 5 meals (3 main meals + 2 snacks).

REQUIREMENTS:
- Total daily targets: ${dailyCalories} calories, ${dailyProtein}g protein, ${dailyCarbs}g carbs, ${dailyFat}g fat
- Dietary preferences: ${dietaryPrefs}
- Allergies: ${allergies}
- Foods to avoid: ${dislikes}
- Use BRITISH measurements (grams, millilitres, etc.) - NO cups, ounces, or pounds
- Include detailed cooking instructions
- Include prep and cooking times
${existingMealsContext}

MEAL DISTRIBUTION:
1. Breakfast (25% of daily calories)
2. Morning Snack (10% of daily calories)
3. Lunch (30% of daily calories)
4. Afternoon Snack (10% of daily calories)
5. Dinner (25% of daily calories)

For EACH meal provide:
- Name (creative, appetizing)
- Description (1 sentence)
- Prep time (e.g., "10 minutes")
- Cook time (e.g., "20 minutes")
- Calories
- Protein (grams)
- Carbs (grams)
- Fat (grams)
- Ingredients (3-8 items with amounts in British measurements)
- Instructions (3-5 clear steps)

Return as JSON in this exact format:
{
  "meals": [
    {
      "name": "meal name",
      "description": "appetizing description",
      "prep_time": "X minutes",
      "cook_time": "Y minutes",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "ingredients": [
        {"item": "ingredient name", "amount": "100", "unit": "g"},
        {"item": "ingredient name", "amount": "250", "unit": "ml"}
      ],
      "instructions": [
        "Step 1 detailed instruction",
        "Step 2 detailed instruction"
      ]
    }
  ],
  "totals": {
    "calories": total_calories,
    "protein": total_protein,
    "carbs": total_carbs,
    "fat": total_fat
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional nutritionist and chef specializing in British cuisine and measurements. Always use grams, millilitres, etc. Never use cups, ounces, or pounds. Be concise but complete.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7, // Slightly less random for faster generation
      max_tokens: 2500, // Limit response size to avoid timeouts
      response_format: { type: "json_object" },
    });

    const mealPlan = JSON.parse(completion.choices[0].message.content || "{}");

    // Validate the response has 5 meals
    if (!mealPlan.meals || mealPlan.meals.length !== 5) {
      console.error("Invalid meal count:", mealPlan.meals?.length);

      // Create a fallback plan if needed
      mealPlan.meals = ensureFiveMeals(mealPlan.meals || [], {
        dailyCalories,
        dailyProtein,
        dailyCarbs,
        dailyFat,
      });
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
      // Ensure all fields exist
      prep_time: meal.prep_time || "10 minutes",
      cook_time:
        meal.cook_time ||
        (index === 1 || index === 3 ? "0 minutes" : "20 minutes"),
      instructions: Array.isArray(meal.instructions)
        ? meal.instructions
        : typeof meal.instructions === "string"
          ? [meal.instructions]
          : ["Prepare and serve as directed"],
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
      // Continue anyway - return the generated plan
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
    console.error("Error generating single day meal plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate meal plan",
      },
      { status: 500 },
    );
  }
}

function ensureFiveMeals(meals: any[], targets: any) {
  // Ensure we have exactly 5 meals
  const fullMeals = [...meals];

  const defaults = [
    {
      name: "Scrambled Eggs on Toast",
      description: "Protein-rich breakfast with wholemeal toast",
      calories: Math.round(targets.dailyCalories * 0.25),
      protein: Math.round(targets.dailyProtein * 0.25),
      carbs: Math.round(targets.dailyCarbs * 0.25),
      fat: Math.round(targets.dailyFat * 0.25),
      prep_time: "5 minutes",
      cook_time: "10 minutes",
      ingredients: [
        { item: "eggs", amount: "2", unit: "large" },
        { item: "wholemeal bread", amount: "2", unit: "slices" },
        { item: "butter", amount: "10", unit: "g" },
      ],
      instructions: [
        "Beat eggs in a bowl with a splash of milk",
        "Heat butter in a non-stick pan over medium heat",
        "Pour in eggs and stir gently until scrambled",
        "Toast bread and serve eggs on top",
      ],
    },
    {
      name: "Greek Yogurt with Berries",
      description: "Refreshing high-protein snack",
      calories: Math.round(targets.dailyCalories * 0.1),
      protein: Math.round(targets.dailyProtein * 0.1),
      carbs: Math.round(targets.dailyCarbs * 0.1),
      fat: Math.round(targets.dailyFat * 0.1),
      prep_time: "2 minutes",
      cook_time: "0 minutes",
      ingredients: [
        { item: "Greek yogurt", amount: "150", unit: "g" },
        { item: "mixed berries", amount: "80", unit: "g" },
        { item: "honey", amount: "1", unit: "tsp" },
      ],
      instructions: ["Mix yogurt with berries and drizzle with honey"],
    },
    {
      name: "Grilled Chicken Salad",
      description: "Nutritious lunch with lean protein and fresh vegetables",
      calories: Math.round(targets.dailyCalories * 0.3),
      protein: Math.round(targets.dailyProtein * 0.3),
      carbs: Math.round(targets.dailyCarbs * 0.3),
      fat: Math.round(targets.dailyFat * 0.3),
      prep_time: "10 minutes",
      cook_time: "15 minutes",
      ingredients: [
        { item: "chicken breast", amount: "150", unit: "g" },
        { item: "mixed salad leaves", amount: "100", unit: "g" },
        { item: "cherry tomatoes", amount: "100", unit: "g" },
        { item: "cucumber", amount: "50", unit: "g" },
        { item: "olive oil", amount: "15", unit: "ml" },
      ],
      instructions: [
        "Season chicken breast with salt and pepper",
        "Grill chicken for 6-7 minutes each side until cooked through",
        "Prepare salad with leaves, tomatoes, and cucumber",
        "Slice chicken and place on salad",
        "Drizzle with olive oil and serve",
      ],
    },
    {
      name: "Apple with Almond Butter",
      description: "Simple and satisfying afternoon snack",
      calories: Math.round(targets.dailyCalories * 0.1),
      protein: Math.round(targets.dailyProtein * 0.1),
      carbs: Math.round(targets.dailyCarbs * 0.1),
      fat: Math.round(targets.dailyFat * 0.1),
      prep_time: "2 minutes",
      cook_time: "0 minutes",
      ingredients: [
        { item: "apple", amount: "1", unit: "medium" },
        { item: "almond butter", amount: "20", unit: "g" },
      ],
      instructions: ["Slice apple and serve with almond butter for dipping"],
    },
    {
      name: "Baked Salmon with Vegetables",
      description: "Omega-3 rich dinner with roasted seasonal vegetables",
      calories: Math.round(targets.dailyCalories * 0.25),
      protein: Math.round(targets.dailyProtein * 0.25),
      carbs: Math.round(targets.dailyCarbs * 0.25),
      fat: Math.round(targets.dailyFat * 0.25),
      prep_time: "10 minutes",
      cook_time: "25 minutes",
      ingredients: [
        { item: "salmon fillet", amount: "150", unit: "g" },
        { item: "broccoli", amount: "150", unit: "g" },
        { item: "sweet potato", amount: "150", unit: "g" },
        { item: "olive oil", amount: "15", unit: "ml" },
        { item: "lemon", amount: "1/2", unit: "" },
      ],
      instructions: [
        "Preheat oven to 200°C",
        "Cut sweet potato into wedges and toss with oil",
        "Place salmon on a baking tray with vegetables",
        "Drizzle with oil and lemon juice",
        "Bake for 20-25 minutes until salmon is cooked and vegetables are tender",
      ],
    },
  ];

  // Fill in missing meals
  while (fullMeals.length < 5) {
    fullMeals.push(defaults[fullMeals.length]);
  }

  return fullMeals.slice(0, 5);
}
