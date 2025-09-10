import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Helper function to generate a single meal
export async function generateSingleMeal(
  mealType: string,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  preferences: any,
  dayNumber: number,
) {
  const systemPrompt = `You are an expert nutritionist and chef. Create a detailed, delicious meal that matches the exact macronutrient targets provided. Be creative and specific with recipes.`;

  const userPrompt = `Create a ${mealType} meal for Day ${dayNumber}:
  
  EXACT TARGETS:
  - Calories: ${targetCalories}
  - Protein: ${targetProtein}g
  - Carbs: ${targetCarbs}g
  - Fat: ${targetFat}g
  
  PREFERENCES:
  - Dietary Type: ${preferences?.dietary_type || "Balanced"}
  - Allergies: ${preferences?.allergies?.join(", ") || "None"}
  - Disliked Foods: ${preferences?.disliked_foods?.join(", ") || "None"}
  - Cooking Skill: ${preferences?.cooking_skill || "intermediate"}
  
  Return a detailed JSON object with this structure:
  {
    "type": "${mealType}",
    "name": "Creative Meal Name",
    "description": "Appetizing description of the meal",
    "prep_time": 10,
    "cook_time": 20,
    "calories": ${targetCalories},
    "protein": ${targetProtein},
    "carbs": ${targetCarbs},
    "fat": ${targetFat},
    "fiber": 5,
    "ingredients": [
      {
        "name": "Specific Ingredient",
        "amount": 100,
        "unit": "grams",
        "calories": 150,
        "protein": 20,
        "carbs": 5,
        "fat": 6
      }
    ],
    "instructions": [
      "Detailed step 1",
      "Detailed step 2",
      "Detailed step 3"
    ],
    "tips": "Pro tip for making this meal even better"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Use GPT-4 for quality
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8, // Higher for creativity
      max_tokens: 800, // Enough for one detailed meal
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error(
        `Failed to parse JSON for ${mealType} day ${dayNumber}:`,
        content,
      );
      // Return a fallback meal structure
      return {
        type: mealType,
        name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
        description: "Healthy balanced meal",
        prep_time: 15,
        cook_time: 20,
        calories: targetCalories,
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat,
        fiber: 5,
        ingredients: [
          { name: "Main Protein", amount: 150, unit: "grams" },
          { name: "Vegetables", amount: 200, unit: "grams" },
          { name: "Grains", amount: 100, unit: "grams" },
        ],
        instructions: [
          "Prepare ingredients",
          "Cook protein",
          "Combine and serve",
        ],
        tips: "Season to taste",
      };
    }
  } catch (error) {
    console.error(`Error generating ${mealType} for day ${dayNumber}:`, error);
    // Return a basic meal structure as fallback
    return {
      type: mealType,
      name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
      description: "Healthy balanced meal",
      prep_time: 15,
      cook_time: 20,
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat,
      fiber: 5,
      ingredients: [
        { name: "Main Protein", amount: 150, unit: "grams" },
        { name: "Vegetables", amount: 200, unit: "grams" },
        { name: "Grains", amount: 100, unit: "grams" },
      ],
      instructions: [
        "Prepare ingredients",
        "Cook protein",
        "Combine and serve",
      ],
      tips: "Season to taste",
    };
  }
}

// Helper function to generate meal plans using parallel processing
export async function generateMealPlan(
  nutritionProfile: any,
  preferences: any,
  daysToGenerate: number = 7,
) {
  try {
    console.log(
      "Starting parallel meal generation for",
      daysToGenerate,
      "days",
    );

    const mealsPerDay = nutritionProfile.meals_per_day || 3;
    const snacksPerDay = nutritionProfile.snacks_per_day || 2;

    // Calculate macro distribution for each meal type
    const mealDistribution = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.35,
      snack: 0.05 / snacksPerDay, // Split remaining 5% among snacks
    };

    // Generate all meals in parallel for better performance
    const mealPromises = [];
    const mealPlan: any = {};

    for (let day = 1; day <= daysToGenerate; day++) {
      const dayMeals = [];

      // Generate breakfast
      dayMeals.push(
        generateSingleMeal(
          "breakfast",
          Math.round(
            nutritionProfile.target_calories * mealDistribution.breakfast,
          ),
          Math.round(
            nutritionProfile.protein_grams * mealDistribution.breakfast,
          ),
          Math.round(nutritionProfile.carbs_grams * mealDistribution.breakfast),
          Math.round(nutritionProfile.fat_grams * mealDistribution.breakfast),
          preferences,
          day,
        ),
      );

      // Generate lunch
      dayMeals.push(
        generateSingleMeal(
          "lunch",
          Math.round(nutritionProfile.target_calories * mealDistribution.lunch),
          Math.round(nutritionProfile.protein_grams * mealDistribution.lunch),
          Math.round(nutritionProfile.carbs_grams * mealDistribution.lunch),
          Math.round(nutritionProfile.fat_grams * mealDistribution.lunch),
          preferences,
          day,
        ),
      );

      // Generate dinner
      dayMeals.push(
        generateSingleMeal(
          "dinner",
          Math.round(
            nutritionProfile.target_calories * mealDistribution.dinner,
          ),
          Math.round(nutritionProfile.protein_grams * mealDistribution.dinner),
          Math.round(nutritionProfile.carbs_grams * mealDistribution.dinner),
          Math.round(nutritionProfile.fat_grams * mealDistribution.dinner),
          preferences,
          day,
        ),
      );

      // Generate snacks
      for (let s = 1; s <= snacksPerDay; s++) {
        dayMeals.push(
          generateSingleMeal(
            "snack",
            Math.round(
              nutritionProfile.target_calories * mealDistribution.snack,
            ),
            Math.round(nutritionProfile.protein_grams * mealDistribution.snack),
            Math.round(nutritionProfile.carbs_grams * mealDistribution.snack),
            Math.round(nutritionProfile.fat_grams * mealDistribution.snack),
            preferences,
            day,
          ),
        );
      }

      mealPromises.push(
        Promise.all(dayMeals).then((meals) => ({
          day: `day_${day}`,
          meals,
        })),
      );
    }

    // Wait for all meals to be generated
    const allDayMeals = await Promise.all(mealPromises);

    // Organize meals by day
    allDayMeals.forEach(({ day, meals }) => {
      mealPlan[day] = {
        meals,
        daily_totals: {
          calories: nutritionProfile.target_calories,
          protein: nutritionProfile.protein_grams,
          carbs: nutritionProfile.carbs_grams,
          fat: nutritionProfile.fat_grams,
          fiber: 25,
        },
      };
    });

    // Generate shopping list from all meals
    const allIngredients = new Map();
    Object.values(mealPlan).forEach((day: any) => {
      day.meals.forEach((meal: any) => {
        meal.ingredients?.forEach((ing: any) => {
          const key = ing.name.toLowerCase();
          if (allIngredients.has(key)) {
            const existing = allIngredients.get(key);
            existing.amount += ing.amount;
          } else {
            allIngredients.set(key, { ...ing });
          }
        });
      });
    });

    const shoppingList = Array.from(allIngredients.values()).map((ing) => ({
      item: ing.name,
      quantity: `${Math.round(ing.amount)}${ing.unit}`,
      category: categorizeIngredient(ing.name),
    }));

    return {
      meal_plan: mealPlan,
      shopping_list: shoppingList,
      meal_prep_tips: [
        "Prep all vegetables at the start of the week",
        "Cook grains in bulk and refrigerate",
        "Marinate proteins the night before",
        "Pre-portion snacks into containers",
        "Batch cook sauces and dressings",
      ],
    };
  } catch (error) {
    console.error("Error in parallel meal generation:", error);
    throw error;
  }
}

// Helper to categorize ingredients
function categorizeIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  if (
    lowerName.includes("chicken") ||
    lowerName.includes("beef") ||
    lowerName.includes("fish") ||
    lowerName.includes("salmon")
  ) {
    return "Protein";
  }
  if (
    lowerName.includes("rice") ||
    lowerName.includes("oat") ||
    lowerName.includes("bread") ||
    lowerName.includes("quinoa")
  ) {
    return "Grains";
  }
  if (
    lowerName.includes("milk") ||
    lowerName.includes("yogurt") ||
    lowerName.includes("cheese")
  ) {
    return "Dairy";
  }
  if (
    lowerName.includes("apple") ||
    lowerName.includes("banana") ||
    lowerName.includes("berr")
  ) {
    return "Fruits";
  }
  return "Vegetables";
}

// Helper function to generate meal substitutions
export async function generateMealSubstitution(
  originalMeal: any,
  reason: string,
  nutritionProfile: any,
  preferences: any,
) {
  const systemPrompt = `You are a nutrition expert. Generate a suitable meal substitution that matches the nutritional profile of the original meal while addressing the reason for substitution.`;

  const userPrompt = `Generate a substitution for this meal:
  
  ORIGINAL MEAL:
  Name: ${originalMeal.name}
  Calories: ${originalMeal.calories}
  Protein: ${originalMeal.protein_grams}g
  Carbs: ${originalMeal.carbs_grams}g
  Fat: ${originalMeal.fat_grams}g
  
  REASON FOR SUBSTITUTION: ${reason}
  
  DIETARY RESTRICTIONS:
  - Allergies: ${preferences?.allergies?.join(", ") || "None"}
  - Disliked Foods: ${preferences?.disliked_foods?.join(", ") || "None"}
  
  Provide 3 alternative meals with similar macros in JSON format.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using faster model to avoid timeouts
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error generating substitution:", error);
    throw error;
  }
}

// Helper function to adjust meal plan based on feedback
export async function adjustMealPlanFromFeedback(
  feedback: any,
  nutritionProfile: any,
  preferences: any,
) {
  const systemPrompt = `You are a nutrition AI that learns from user feedback. 
  Analyze the feedback and suggest improvements to future meal plans.`;

  const userPrompt = `Based on this feedback, suggest meal plan adjustments:
  
  FEEDBACK:
  ${JSON.stringify(feedback, null, 2)}
  
  CURRENT TARGETS:
  - Calories: ${nutritionProfile.target_calories}
  - Protein: ${nutritionProfile.protein_grams}g
  - Carbs: ${nutritionProfile.carbs_grams}g
  - Fat: ${nutritionProfile.fat_grams}g
  
  Provide specific recommendations for future meal plans in JSON format.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using faster model to avoid timeouts
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error processing feedback:", error);
    throw error;
  }
}
