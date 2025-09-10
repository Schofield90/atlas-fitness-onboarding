import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Helper function to generate meal plans
export async function generateMealPlan(
  nutritionProfile: any,
  preferences: any,
  daysToGenerate: number = 7,
) {
  const systemPrompt = `You are an expert nutritionist and meal planning AI. 
  Create detailed, personalized meal plans that match the user's exact macronutrient requirements and preferences.
  
  IMPORTANT RULES:
  1. The daily totals MUST match the target calories and macros as closely as possible
  2. Distribute calories evenly across meals and snacks
  3. Include variety - don't repeat the same meals too often
  4. Consider cooking time and skill level
  5. Avoid all allergens and disliked foods
  6. Include foods from the liked foods list when possible
  7. Provide exact measurements and portion sizes
  8. Make meals practical and achievable
  
  Return the meal plan in a structured JSON format.`;

  const userPrompt = `Create a ${daysToGenerate}-day meal plan for this profile:
  
  NUTRITIONAL TARGETS:
  - Daily Calories: ${nutritionProfile.target_calories}
  - Protein: ${nutritionProfile.protein_grams}g
  - Carbs: ${nutritionProfile.carbs_grams}g  
  - Fat: ${nutritionProfile.fat_grams}g
  - Fiber: ${nutritionProfile.fiber_grams || 25}g
  
  MEAL STRUCTURE:
  - Meals per day: ${nutritionProfile.meals_per_day}
  - Snacks per day: ${nutritionProfile.snacks_per_day}
  
  PREFERENCES:
  - Dietary Type: ${preferences?.dietary_type || "None"}
  - Allergies: ${preferences?.allergies?.join(", ") || "None"}
  - Intolerances: ${preferences?.intolerances?.join(", ") || "None"}
  - Liked Foods: ${preferences?.liked_foods?.join(", ") || "Various"}
  - Disliked Foods: ${preferences?.disliked_foods?.join(", ") || "None"}
  - Cooking Time: ${preferences?.cooking_time || "moderate"}
  - Cooking Skill: ${preferences?.cooking_skill || "intermediate"}
  
  GOAL: ${nutritionProfile.goal.replace("_", " ")}
  
  Return a JSON object with this structure:
  {
    "meal_plan": {
      "day_1": {
        "meals": [
          {
            "type": "breakfast",
            "name": "Meal Name",
            "description": "Brief description",
            "prep_time": 10,
            "cook_time": 15,
            "calories": 400,
            "protein": 30,
            "carbs": 40,
            "fat": 15,
            "fiber": 5,
            "ingredients": [
              {
                "name": "Ingredient",
                "amount": 100,
                "unit": "grams"
              }
            ],
            "instructions": ["Step 1", "Step 2"]
          }
        ],
        "daily_totals": {
          "calories": 2000,
          "protein": 150,
          "carbs": 200,
          "fat": 70,
          "fiber": 25
        }
      }
    },
    "shopping_list": [
      {
        "item": "Chicken breast",
        "quantity": "1kg",
        "category": "Protein"
      }
    ],
    "meal_prep_tips": ["Tip 1", "Tip 2"]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using faster model to avoid timeouts
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const mealPlan = JSON.parse(response.choices[0].message.content || "{}");
    return mealPlan;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    throw error;
  }
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
