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
  // Simplified prompt for faster generation
  const systemPrompt = `You are a meal planning AI. Create a simple ${daysToGenerate}-day meal plan matching the nutritional targets. Keep responses concise.`;

  const userPrompt = `Create a ${daysToGenerate}-day meal plan:
  
  TARGETS:
  - Calories: ${nutritionProfile.target_calories}
  - Protein: ${nutritionProfile.protein_grams}g
  - Carbs: ${nutritionProfile.carbs_grams}g  
  - Fat: ${nutritionProfile.fat_grams}g
  
  Create ${nutritionProfile.meals_per_day} meals and ${nutritionProfile.snacks_per_day} snacks per day.
  
  Return JSON with this exact structure (keep descriptions SHORT):
  {
    "meal_plan": {
      "day_1": {
        "meals": [
          {
            "type": "breakfast",
            "name": "Oatmeal with Berries",
            "calories": 400,
            "protein": 20,
            "carbs": 60,
            "fat": 10,
            "fiber": 8,
            "ingredients": [
              {"name": "Oats", "amount": 80, "unit": "g"},
              {"name": "Berries", "amount": 150, "unit": "g"}
            ]
          }
        ],
        "daily_totals": {
          "calories": ${nutritionProfile.target_calories},
          "protein": ${nutritionProfile.protein_grams},
          "carbs": ${nutritionProfile.carbs_grams},
          "fat": ${nutritionProfile.fat_grams},
          "fiber": 25
        }
      }
    },
    "shopping_list": [
      {"item": "Oats", "quantity": "500g", "category": "Grains"}
    ],
    "meal_prep_tips": ["Prep vegetables on Sunday", "Cook grains in bulk"]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using faster model to avoid timeouts
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5, // Lower temperature for more consistent output
      max_tokens: 2000, // Reduced for faster response
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
