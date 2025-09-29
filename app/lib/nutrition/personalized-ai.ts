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

interface UserPreferences {
  dietary_restrictions?: string[];
  allergies?: string[];
  favorite_foods?: string[];
  disliked_foods?: string[];
  meal_timings?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string;
  };
  cooking_skill?: "beginner" | "intermediate" | "advanced";
  time_availability?: "minimal" | "moderate" | "plenty";
  kitchen_equipment?: string[];
  shopping_preferences?: string;
  cultural_preferences?: string;
  specific_goals?: string;
}

interface NutritionProfile {
  goals?: string;
  activity_level?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
}

export async function generatePersonalizedMealPlan(
  preferences: UserPreferences,
  profile: NutritionProfile,
  mealType: "breakfast" | "lunch" | "dinner" | "snack",
  dayOfWeek?: string,
) {
  // Log preferences to debug
  console.log("[PersonalizedAI] Generating meal with preferences:", {
    allergies: preferences.allergies,
    dietary_restrictions: preferences.dietary_restrictions,
    disliked_foods: preferences.disliked_foods,
    favorite_foods: preferences.favorite_foods,
    cultural_preferences: preferences.cultural_preferences,
  });

  // Build a comprehensive context about the user
  const userContext = buildUserContext(preferences, profile);

  // Create cooking complexity based on skill and time
  const complexity = determineCookingComplexity(
    preferences.cooking_skill,
    preferences.time_availability,
  );

  // Build equipment constraints
  const equipmentContext = preferences.kitchen_equipment?.length
    ? `Available equipment: ${preferences.kitchen_equipment.join(", ")}.`
    : "Standard kitchen equipment (stove, oven).";

  const prompt = `You are a personal nutrition coach creating a meal for someone you know well.

USER PROFILE:
${userContext}

MEAL REQUEST:
Create a personalized ${mealType} recipe for ${dayOfWeek || "today"}.

CRITICAL REQUIREMENTS (ABSOLUTELY MANDATORY - DO NOT VIOLATE):
- MUST COMPLETELY AVOID (allergies/intolerances): ${preferences.allergies?.length ? preferences.allergies.join(", ").toUpperCase() : "no allergies"}
- MUST respect dietary restrictions: ${preferences.dietary_restrictions?.length ? preferences.dietary_restrictions.join(", ") : "none"}
- NEVER INCLUDE these disliked foods: ${preferences.disliked_foods?.length ? preferences.disliked_foods.join(", ").toUpperCase() : "no specific dislikes"}

PERSONALIZATION (STRONGLY PREFERRED):
- PRIORITIZE their favorite foods: ${preferences.favorite_foods?.length ? preferences.favorite_foods.join(", ").toUpperCase() : "no specific favorites mentioned"}
- Match their cultural preferences: ${preferences.cultural_preferences ? `${preferences.cultural_preferences} cuisine STRONGLY PREFERRED` : "no specific preference"}
- Align with their goals: ${preferences.specific_goals || profile.goals || "general health"}
- Typical ${mealType} time: ${preferences.meal_timings?.[mealType] || "flexible"}

COOKING CONSTRAINTS:
- Skill level: ${preferences.cooking_skill || "intermediate"}
- Time available: ${preferences.time_availability || "moderate"}
- ${equipmentContext}
- Complexity: ${complexity}

NUTRITIONAL TARGETS:
- Calories: ~${getMealCalories(mealType, profile.target_calories)}
- Protein: ~${getMealMacros(mealType, profile.target_protein || 0)}g
- Carbs: ~${getMealMacros(mealType, profile.target_carbs || 0)}g
- Fat: ~${getMealMacros(mealType, profile.target_fat || 0)}g

VALIDATION CHECKLIST (The AI MUST verify before generating):
- ✅ Recipe contains NO ingredients from allergies list: ${preferences.allergies?.length ? preferences.allergies.join(", ") : "none"}
- ✅ Recipe contains NO ingredients from dislikes list: ${preferences.disliked_foods?.length ? preferences.disliked_foods.join(", ") : "none"}  
- ✅ Recipe matches cultural preference: ${preferences.cultural_preferences || "any"}
- ✅ Recipe includes favorites when possible: ${preferences.favorite_foods?.length ? preferences.favorite_foods.join(", ") : "none"}

If the recipe violates ANY of the above, regenerate it.

Include:
1. Recipe name (creative, appealing)
2. Brief description (2-3 sentences explaining why this is perfect for them)
3. Ingredients list with amounts
4. Step-by-step instructions appropriate to their skill level
5. Nutritional information
6. Tips for meal prep or variations they might enjoy

Format as JSON with structure:
{
  "name": "Recipe Name",
  "description": "Why this is perfect for you",
  "personalizedNote": "A note about how this aligns with their preferences",
  "prepTime": "X minutes",
  "cookTime": "Y minutes",
  "ingredients": [{"item": "ingredient", "amount": "amount", "notes": "optional notes"}],
  "instructions": ["step 1", "step 2"],
  "nutrition": {"calories": X, "protein": X, "carbs": X, "fat": X},
  "tips": ["tip 1", "tip 2"],
  "mealPrepAdvice": "How to prep ahead if applicable"
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are a personal nutrition coach who MUST follow dietary restrictions and preferences EXACTLY. Never include ingredients the client is allergic to or dislikes. Always respect their cultural cuisine preferences. If they ask for Mexican food, give them Mexican food. If they say no eggs, NEVER include eggs in any form.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7, // Lower temperature for more consistent adherence to instructions
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  // Validate the result doesn't include disliked or allergic ingredients
  if (result.ingredients && Array.isArray(result.ingredients)) {
    const allAllergens = [
      ...(preferences.allergies || []),
      ...(preferences.disliked_foods || []),
    ];
    const ingredientTexts = result.ingredients.map((i: any) =>
      (typeof i === "string" ? i : i.item || "").toLowerCase(),
    );

    for (const allergen of allAllergens) {
      if (
        allergen &&
        ingredientTexts.some((ing: string) =>
          ing.includes(allergen.toLowerCase()),
        )
      ) {
        console.error(
          `[PersonalizedAI] Recipe contains prohibited ingredient: ${allergen}`,
        );
        console.error(
          `[PersonalizedAI] Ingredients: ${ingredientTexts.join(", ")}`,
        );
        // Log but don't reject - let the user see what was generated
        result.warning = `Warning: This recipe may contain ${allergen} which you asked to avoid.`;
      }
    }
  }

  return result;
}

export async function getPersonalizedNutritionQuestions(
  existingPreferences: UserPreferences,
  conversationHistory: any[],
) {
  // Analyze what we already know
  const knownAspects = analyzeKnownPreferences(existingPreferences);

  const prompt = `You are a nutrition coach having a conversation with a client to better understand their preferences.

WHAT YOU ALREADY KNOW:
${JSON.stringify(knownAspects, null, 2)}

CONVERSATION HISTORY:
${conversationHistory.map((m) => `${m.type}: ${m.content}`).join("\n")}

Based on what you know and don't know, generate 3 highly personalized follow-up questions that:
1. Build on their existing preferences
2. Explore gaps in your knowledge
3. Get specific details that would help create better meal plans

For example:
- If they're vegetarian, ask about specific protein preferences
- If they have limited time, ask about meal prep on weekends
- If they mentioned favorites, ask about cooking methods they prefer

Return as JSON:
{
  "questions": [
    {"question": "text", "category": "category", "reason": "why this matters"},
    {"question": "text", "category": "category", "reason": "why this matters"},
    {"question": "text", "category": "category", "reason": "why this matters"}
  ],
  "completeness": X (0-100 percentage of how well you know their preferences),
  "nextFocus": "what aspect to explore next"
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are a thoughtful nutrition coach who asks personalized, relevant questions based on what you already know about the client.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Helper functions
function buildUserContext(
  preferences: UserPreferences,
  profile: NutritionProfile,
): string {
  const aspects = [];

  if (preferences.dietary_restrictions?.length) {
    aspects.push(`Follows ${preferences.dietary_restrictions.join(", ")} diet`);
  }

  if (preferences.allergies?.length) {
    aspects.push(`Allergic to ${preferences.allergies.join(", ")}`);
  }

  if (preferences.favorite_foods?.length) {
    aspects.push(`Loves ${preferences.favorite_foods.slice(0, 3).join(", ")}`);
  }

  if (preferences.cultural_preferences) {
    aspects.push(`Prefers ${preferences.cultural_preferences} cuisine`);
  }

  if (profile.goals) {
    aspects.push(`Goal: ${profile.goals}`);
  }

  if (profile.activity_level) {
    aspects.push(`Activity level: ${profile.activity_level}`);
  }

  return aspects.join(". ") || "General healthy eating preferences";
}

function determineCookingComplexity(
  skill?: "beginner" | "intermediate" | "advanced",
  time?: "minimal" | "moderate" | "plenty",
): string {
  if (skill === "beginner" || time === "minimal") {
    return "Keep it simple with minimal steps and common ingredients";
  }
  if (skill === "advanced" && time === "plenty") {
    return "Can handle complex techniques and longer preparation times";
  }
  return "Moderate complexity with reasonable prep time";
}

function getMealCalories(mealType: string, totalCalories?: number): number {
  const total = totalCalories || 2000;
  const distribution = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.05,
  };
  return Math.round(total * (distribution[mealType] || 0.25));
}

function getMealMacros(mealType: string, totalMacro: number): number {
  const distribution = {
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.05,
  };
  return Math.round(totalMacro * (distribution[mealType] || 0.25));
}

function analyzeKnownPreferences(preferences: UserPreferences): object {
  const known = {
    dietary: preferences.dietary_restrictions?.length ? "Known" : "Unknown",
    allergies: preferences.allergies?.length ? "Known" : "Unknown",
    favorites: preferences.favorite_foods?.length ? "Known" : "Unknown",
    dislikes: preferences.disliked_foods?.length ? "Known" : "Unknown",
    schedule: preferences.meal_timings ? "Partially known" : "Unknown",
    cooking_ability: preferences.cooking_skill || "Unknown",
    time_constraints: preferences.time_availability || "Unknown",
    equipment: preferences.kitchen_equipment?.length ? "Known" : "Unknown",
    cultural: preferences.cultural_preferences || "Unknown",
    goals: preferences.specific_goals || "Unknown",
  };

  return known;
}

export async function generateSmartSubstitution(
  originalIngredient: string,
  preferences: UserPreferences,
  reason: "allergy" | "dislike" | "unavailable",
) {
  const prompt = `Suggest a substitution for "${originalIngredient}".

Reason: ${reason}
User allergies: ${preferences.allergies?.join(", ") || "none"}
User dislikes: ${preferences.disliked_foods?.join(", ") || "none"}
Dietary restrictions: ${preferences.dietary_restrictions?.join(", ") || "none"}
User favorites: ${preferences.favorite_foods?.join(", ") || "none"}

Provide a smart substitution that:
1. Maintains similar nutritional profile
2. Works in the same cooking method
3. Respects all their restrictions
4. Ideally uses something they like

Return as JSON:
{
  "substitute": "ingredient name",
  "amount_adjustment": "same/increase/decrease",
  "notes": "any cooking adjustments needed",
  "why_good_fit": "explanation of why this works for this user"
}`;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}
