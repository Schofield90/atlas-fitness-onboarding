import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { MealPlan } from '@/app/lib/types/nutrition'
import OpenAI from 'openai'
import { computeMacros } from '@/app/lib/services/nutrition/macro-calculator'

// Initialize OpenAI client
// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  return openai
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const includeMeals = searchParams.get('include_meals') === 'true'
    
    // Get user's meal plans
    let query = supabase
      .from('nutrition_meal_plans')
      .select(includeMeals ? `
        *,
        nutrition_meals (
          *,
          nutrition_ingredients (*)
        )
      ` : '*')
      .eq('user_id', userWithOrg.id)
      .eq('organization_id', userWithOrg.organizationId)
      .order('created_at', { ascending: false })
    
    const { data: mealPlans, error } = await query
    
    if (error) {
      console.error('Error fetching meal plans:', error)
      return createErrorResponse(error, 500)
    }
    
    // Format the response to group meals by plan if included
    const formattedPlans = mealPlans?.map(plan => {
      if (includeMeals && plan.nutrition_meals) {
        return {
          ...plan,
          meals: plan.nutrition_meals.map((meal: any) => ({
            ...meal,
            ingredients: meal.nutrition_ingredients || []
          }))
        }
      }
      return plan
    })
    
    return NextResponse.json({
      success: true,
      data: formattedPlans || []
    })
  } catch (error) {
    console.error('Error in GET /api/nutrition/meal-plans:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    // Create Supabase client
    const supabase = await createClient()
    
    const body = await request.json()
    const { weeks = 1, regenerate = false } = body
    
    // Validate weeks parameter
    if (![1, 2, 3, 4].includes(weeks)) {
      return NextResponse.json(
        { error: 'Invalid weeks parameter. Must be 1, 2, 3, or 4.' },
        { status: 400 }
      )
    }
    
    // Get user's nutrition profile
    const { data: profile, error: profileError } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('user_id', userWithOrg.id)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json(
        { 
          error: 'Profile not found',
          message: 'Please complete your nutrition profile before generating a meal plan.'
        },
        { status: 404 }
      )
    }
    
    // Calculate macros
    const macroTargets = computeMacros(profile)
    
    // Check if user already has an active meal plan (unless regenerating)
    if (!regenerate) {
      const { data: existingPlan } = await supabase
        .from('nutrition_meal_plans')
        .select('id')
        .eq('user_id', userWithOrg.id)
        .eq('organization_id', userWithOrg.organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (existingPlan) {
        return NextResponse.json(
          { 
            error: 'Meal plan already exists',
            message: 'You already have an active meal plan. Set regenerate=true to create a new one.'
          },
          { status: 400 }
        )
      }
    }
    
    // If regenerating, delete existing meal plans
    if (regenerate) {
      await supabase
        .from('nutrition_meal_plans')
        .delete()
        .eq('user_id', userWithOrg.id)
        .eq('organization_id', userWithOrg.organizationId)
    }
    
    // Generate meal plan using OpenAI
    const generatedPlan = await generateMealPlan(profile, macroTargets, weeks)
    
    // Create new meal plan
    const { data: mealPlan, error: mealPlanError } = await supabase
      .from('nutrition_meal_plans')
      .insert({
        user_id: userWithOrg.id,
        organization_id: userWithOrg.organizationId,
        weeks: generatedPlan.weeks,
        days: generatedPlan.days,
        target_calories: macroTargets.calories,
        target_protein: macroTargets.protein,
        target_carbs: macroTargets.carbs,
        target_fat: macroTargets.fat,
        target_fiber: macroTargets.fiber,
      })
      .select()
      .single()
    
    if (mealPlanError) {
      console.error('Error creating meal plan:', mealPlanError)
      return createErrorResponse(mealPlanError, 500)
    }
    
    // Create meals and ingredients
    for (const mealData of generatedPlan.meals) {
      const { data: meal, error: mealError } = await supabase
        .from('nutrition_meals')
        .insert({
          meal_plan_id: mealPlan.id,
          day: mealData.day,
          name: mealData.name,
          calories: mealData.calories,
          protein: mealData.protein,
          carbs: mealData.carbs,
          fat: mealData.fat,
          fiber: mealData.fiber || 0,
          recipe: mealData.recipe,
          prep_minutes: mealData.prepMinutes,
        })
        .select()
        .single()
      
      if (mealError) {
        console.error('Error creating meal:', mealError)
        continue
      }
      
      // Create ingredients
      if (mealData.ingredients && mealData.ingredients.length > 0) {
        await supabase
          .from('nutrition_ingredients')
          .insert(
            mealData.ingredients.map((ingredient: any) => ({
              meal_id: meal.id,
              item: ingredient.item,
              grams: ingredient.grams,
              calories: ingredient.calories || 0,
              protein: ingredient.protein || 0,
              carbs: ingredient.carbs || 0,
              fat: ingredient.fat || 0,
            }))
          )
      }
    }
    
    // Generate shopping lists for the meal plan
    await generateShoppingListsForMealPlan(mealPlan.id, userWithOrg.id, userWithOrg.organizationId)
    
    return NextResponse.json({
      success: true,
      message: 'Meal plan generated successfully',
      data: mealPlan
    })
  } catch (error) {
    console.error('Error in POST /api/nutrition/meal-plans:', error)
    return createErrorResponse(error)
  }
}

async function generateMealPlan(profile: any, macroTargets: any, weeks: number) {
  const days = weeks * 7
  
  const systemPrompt = `You are a professional nutritionist creating a personalized meal plan.
  Create a ${weeks}-week meal plan (${days} days) that meets these macro targets:
  - Calories: ${macroTargets.calories}
  - Protein: ${macroTargets.protein}g
  - Carbs: ${macroTargets.carbs}g
  - Fat: ${macroTargets.fat}g
  - Fiber: ${macroTargets.fiber}g
  
  User preferences:
  - Dietary preferences: ${profile.dietary_preferences?.join(', ') || 'None'}
  - Allergies: ${profile.allergies?.join(', ') || 'None'}
  - Likes: ${profile.food_likes?.join(', ') || 'Various foods'}
  - Dislikes: ${profile.food_dislikes?.join(', ') || 'None'}
  - Cooking time: ${profile.cooking_time || 'MODERATE'}
  - Budget: ${profile.budget_constraint || 'MODERATE'}
  
  Return a JSON object with this structure:
  {
    "weeks": ${weeks},
    "days": ${days},
    "meals": [
      {
        "day": 1,
        "name": "BREAKFAST",
        "calories": 400,
        "protein": 30,
        "carbs": 45,
        "fat": 12,
        "fiber": 5,
        "recipe": "Step by step recipe instructions",
        "prepMinutes": 15,
        "ingredients": [
          {
            "item": "Oats",
            "grams": 50,
            "calories": 190,
            "protein": 6.5,
            "carbs": 33,
            "fat": 3.5
          }
        ]
      }
    ]
  }
  
  Create 4 meals per day (BREAKFAST, LUNCH, DINNER, SNACK) for all ${days} days.
  Ensure daily totals match the macro targets closely.
  Provide variety while respecting preferences and restrictions.`

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate the ${weeks}-week meal plan now.` }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })

    const mealPlanData = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return mealPlanData
  } catch (error) {
    console.error('Error generating meal plan:', error)
    // Return a basic meal plan structure as fallback
    return {
      weeks,
      days,
      meals: []
    }
  }
}

async function generateShoppingListsForMealPlan(
  mealPlanId: string,
  userId: string,
  organizationId: string
) {
  try {
    const supabase = await createClient()
    
    // Get all meals and ingredients for the meal plan
    const { data: meals, error } = await supabase
      .from('nutrition_meals')
      .select(`
        *,
        nutrition_ingredients (*)
      `)
      .eq('meal_plan_id', mealPlanId)
    
    if (error || !meals) {
      console.error('Error fetching meals for shopping list:', error)
      return
    }
    
    // Group ingredients by week
    const weeklyIngredients: { [week: number]: { [ingredient: string]: { quantity: number; unit: string; category: string } } } = {}
    
    for (const meal of meals) {
      const week = Math.ceil(meal.day / 7)
      
      if (!weeklyIngredients[week]) {
        weeklyIngredients[week] = {}
      }
      
      for (const ingredient of meal.nutrition_ingredients || []) {
        const key = ingredient.item.toLowerCase()
        
        if (!weeklyIngredients[week][key]) {
          weeklyIngredients[week][key] = {
            quantity: 0,
            unit: 'g',
            category: categorizeIngredient(ingredient.item)
          }
        }
        
        weeklyIngredients[week][key].quantity += ingredient.grams
      }
    }
    
    // Create shopping list items
    for (const [week, ingredients] of Object.entries(weeklyIngredients)) {
      const shoppingItems = Object.entries(ingredients).map(([ingredient, data]) => ({
        user_id: userId,
        organization_id: organizationId,
        ingredient: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
        quantity: Math.round(data.quantity),
        unit: data.unit,
        category: data.category,
        week: parseInt(week),
        purchased: false,
      }))
      
      await supabase
        .from('nutrition_shopping_list')
        .insert(shoppingItems)
    }
  } catch (error) {
    console.error('Error generating shopping lists:', error)
  }
}

function categorizeIngredient(ingredient: string): string {
  const categories: { [key: string]: string[] } = {
    'Produce': ['apple', 'banana', 'berry', 'tomato', 'lettuce', 'spinach', 'carrot', 'onion', 'garlic', 'pepper', 'broccoli', 'cucumber', 'avocado', 'fruit', 'vegetable'],
    'Protein': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'egg', 'tofu', 'beans', 'lentils', 'nuts', 'meat', 'turkey', 'shrimp'],
    'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'cottage'],
    'Grains': ['rice', 'bread', 'pasta', 'oats', 'quinoa', 'flour', 'cereal', 'wheat'],
    'Pantry': ['oil', 'salt', 'pepper', 'spice', 'sauce', 'vinegar', 'honey', 'sugar', 'seasoning']
  }
  
  const lower = ingredient.toLowerCase()
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category
    }
  }
  
  return 'Other'
}