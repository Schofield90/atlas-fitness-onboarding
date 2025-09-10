import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Helper function to generate a single meal with better error handling
export async function generateSingleMeal(
  mealType: string,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  preferences: any,
  dayNumber: number,
  retryCount: number = 0,
): Promise<any> {
  const maxRetries = 2;

  // Simplified prompt for faster generation
  const systemPrompt = `You are a nutritionist. Create a meal matching the exact targets. Return valid JSON only.`;

  const userPrompt = `Create a ${mealType} for Day ${dayNumber}:
  
  TARGETS:
  Calories: ${targetCalories}, Protein: ${targetProtein}g, Carbs: ${targetCarbs}g, Fat: ${targetFat}g
  
  Return ONLY this JSON (no extra text):
  {
    "type": "${mealType}",
    "name": "Meal Name",
    "description": "Brief description",
    "prep_time": 15,
    "cook_time": 20,
    "calories": ${targetCalories},
    "protein": ${targetProtein},
    "carbs": ${targetCarbs},
    "fat": ${targetFat},
    "fiber": 5,
    "ingredients": [
      {"name": "Ingredient", "amount": 100, "unit": "g", "calories": 100, "protein": 10, "carbs": 10, "fat": 5}
    ],
    "instructions": ["Step 1", "Step 2", "Step 3"],
    "tips": "Quick tip"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // Use faster model with JSON mode
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500, // Reduced for faster response
      response_format: { type: "json_object" },
      timeout: 8000, // 8 second timeout per meal
    });

    const content = response.choices[0].message.content || "{}";

    // Clean up the response - remove any trailing commas or incomplete JSON
    const cleanedContent = content
      .replace(/,\s*}/g, "}") // Remove trailing commas before }
      .replace(/,\s*]/g, "]") // Remove trailing commas before ]
      .trim();

    try {
      const parsed = JSON.parse(cleanedContent);
      // Ensure all required fields exist
      return {
        type: parsed.type || mealType,
        name:
          parsed.name ||
          `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
        description: parsed.description || "Nutritious and delicious meal",
        prep_time: parsed.prep_time || 15,
        cook_time: parsed.cook_time || 20,
        calories: parsed.calories || targetCalories,
        protein: parsed.protein || targetProtein,
        carbs: parsed.carbs || targetCarbs,
        fat: parsed.fat || targetFat,
        fiber: parsed.fiber || 5,
        ingredients: parsed.ingredients || [
          {
            name: "Protein Source",
            amount: 200,
            unit: "g",
            calories: targetCalories * 0.4,
            protein: targetProtein * 0.8,
            carbs: 0,
            fat: targetFat * 0.3,
          },
          {
            name: "Complex Carbs",
            amount: 150,
            unit: "g",
            calories: targetCalories * 0.4,
            protein: targetProtein * 0.1,
            carbs: targetCarbs * 0.8,
            fat: targetFat * 0.2,
          },
          {
            name: "Vegetables",
            amount: 200,
            unit: "g",
            calories: targetCalories * 0.2,
            protein: targetProtein * 0.1,
            carbs: targetCarbs * 0.2,
            fat: targetFat * 0.5,
          },
        ],
        instructions: parsed.instructions || [
          "Prepare ingredients",
          "Cook main components",
          "Combine and serve",
        ],
        tips: parsed.tips || "Adjust seasoning to taste",
      };
    } catch (parseError) {
      // If parsing fails and we haven't retried yet, try again
      if (retryCount < maxRetries) {
        console.log(
          `Retrying ${mealType} generation for day ${dayNumber} (attempt ${retryCount + 2})`,
        );
        return generateSingleMeal(
          mealType,
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
          preferences,
          dayNumber,
          retryCount + 1,
        );
      }

      // Final fallback - return a simple but valid meal
      console.error(
        `JSON parse failed for ${mealType} day ${dayNumber} after ${maxRetries} retries`,
      );
      return createFallbackMeal(
        mealType,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        dayNumber,
      );
    }
  } catch (error: any) {
    // Handle timeout or API errors
    if (retryCount < maxRetries && error.code !== "insufficient_quota") {
      console.log(
        `API error for ${mealType} day ${dayNumber}, retrying (attempt ${retryCount + 2})`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      return generateSingleMeal(
        mealType,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        preferences,
        dayNumber,
        retryCount + 1,
      );
    }

    console.error(
      `Error generating ${mealType} for day ${dayNumber}:`,
      error.message,
    );
    return createFallbackMeal(
      mealType,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      dayNumber,
    );
  }
}

// Create a fallback meal with realistic nutrition
function createFallbackMeal(
  mealType: string,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  dayNumber: number,
) {
  const mealTemplates: any = {
    breakfast: {
      name: "Protein Oatmeal Bowl",
      description: "Hearty oatmeal with protein powder and berries",
      ingredients: [
        { name: "Oatmeal", amount: 80, unit: "g" },
        { name: "Protein Powder", amount: 30, unit: "g" },
        { name: "Berries", amount: 100, unit: "g" },
        { name: "Almond Butter", amount: 20, unit: "g" },
      ],
    },
    lunch: {
      name: "Grilled Chicken Salad",
      description: "Lean chicken with mixed greens and quinoa",
      ingredients: [
        { name: "Chicken Breast", amount: 150, unit: "g" },
        { name: "Quinoa", amount: 80, unit: "g" },
        { name: "Mixed Greens", amount: 150, unit: "g" },
        { name: "Olive Oil", amount: 15, unit: "ml" },
      ],
    },
    dinner: {
      name: "Salmon with Sweet Potato",
      description: "Baked salmon with roasted sweet potato and vegetables",
      ingredients: [
        { name: "Salmon", amount: 150, unit: "g" },
        { name: "Sweet Potato", amount: 200, unit: "g" },
        { name: "Broccoli", amount: 150, unit: "g" },
        { name: "Olive Oil", amount: 10, unit: "ml" },
      ],
    },
    snack: {
      name: "Greek Yogurt Parfait",
      description: "High-protein yogurt with nuts and fruit",
      ingredients: [
        { name: "Greek Yogurt", amount: 150, unit: "g" },
        { name: "Almonds", amount: 20, unit: "g" },
        { name: "Honey", amount: 10, unit: "g" },
      ],
    },
  };

  const template = mealTemplates[mealType] || mealTemplates.lunch;

  return {
    type: mealType,
    name: `Day ${dayNumber} ${template.name}`,
    description: template.description,
    prep_time: 10,
    cook_time: 20,
    calories: targetCalories,
    protein: targetProtein,
    carbs: targetCarbs,
    fat: targetFat,
    fiber: 5,
    ingredients: template.ingredients.map((ing: any) => ({
      ...ing,
      calories: Math.round(targetCalories / template.ingredients.length),
      protein: Math.round(targetProtein / template.ingredients.length),
      carbs: Math.round(targetCarbs / template.ingredients.length),
      fat: Math.round(targetFat / template.ingredients.length),
    })),
    instructions: [
      "Prepare all ingredients",
      "Cook according to standard methods",
      "Season to taste and serve",
    ],
    tips: "Meal prep on Sunday for the week",
  };
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

    // Generate meals in smaller batches to avoid timeouts
    const mealPlan: any = {};
    const batchSize = 2; // Process 2 days at a time

    for (
      let batchStart = 1;
      batchStart <= daysToGenerate;
      batchStart += batchSize
    ) {
      const batchEnd = Math.min(batchStart + batchSize - 1, daysToGenerate);
      const batchPromises = [];

      console.log(`Generating meals for days ${batchStart} to ${batchEnd}`);

      for (let day = batchStart; day <= batchEnd; day++) {
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
            Math.round(
              nutritionProfile.carbs_grams * mealDistribution.breakfast,
            ),
            Math.round(nutritionProfile.fat_grams * mealDistribution.breakfast),
            preferences,
            day,
          ),
        );

        // Generate lunch
        dayMeals.push(
          generateSingleMeal(
            "lunch",
            Math.round(
              nutritionProfile.target_calories * mealDistribution.lunch,
            ),
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
            Math.round(
              nutritionProfile.protein_grams * mealDistribution.dinner,
            ),
            Math.round(nutritionProfile.carbs_grams * mealDistribution.dinner),
            Math.round(nutritionProfile.fat_grams * mealDistribution.dinner),
            preferences,
            day,
          ),
        );

        // Generate snacks - limit to 1 for faster generation
        const actualSnacks = Math.min(snacksPerDay, 1);
        for (let s = 1; s <= actualSnacks; s++) {
          dayMeals.push(
            generateSingleMeal(
              "snack",
              Math.round(
                nutritionProfile.target_calories *
                  mealDistribution.snack *
                  snacksPerDay,
              ),
              Math.round(
                nutritionProfile.protein_grams *
                  mealDistribution.snack *
                  snacksPerDay,
              ),
              Math.round(
                nutritionProfile.carbs_grams *
                  mealDistribution.snack *
                  snacksPerDay,
              ),
              Math.round(
                nutritionProfile.fat_grams *
                  mealDistribution.snack *
                  snacksPerDay,
              ),
              preferences,
              day,
            ),
          );
        }

        batchPromises.push(
          Promise.all(dayMeals).then((meals) => ({
            day: `day_${day}`,
            meals,
          })),
        );
      }

      // Wait for this batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Add batch results to meal plan
      batchResults.forEach(({ day, meals }) => {
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
    }

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
