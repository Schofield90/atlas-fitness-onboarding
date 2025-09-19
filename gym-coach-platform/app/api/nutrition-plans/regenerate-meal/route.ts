import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

const regenerateMealSchema = z.object({
  client_id: z.string().uuid(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snacks']),
  macro_targets: z.object({
    protein: z.number(),
    carbs: z.number(),
    fats: z.number(),
    calories: z.number()
  }),
  profile_data: z.object({
    age: z.number(),
    gender: z.enum(['male', 'female']),
    weight: z.number(),
    height: z.number(),
    activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']),
    goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight', 'gain_muscle']),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional()
  }),
  existing_meal_plan: z.any().optional()
})

interface MealItem {
  id: string
  name: string
  quantity: string
  calories: number
  protein: number
  carbs: number
  fats: number
  ingredients: string[]
  instructions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { client_id, meal_type, macro_targets, profile_data, existing_meal_plan } = regenerateMealSchema.parse(body)

    // Verify client belongs to user's organization
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Generate new meal based on meal type and requirements
    const newMeal = generateMealForType(meal_type, macro_targets, profile_data)

    // Return the new meal
    return NextResponse.json({
      success: true,
      data: {
        meal_type,
        meal: newMeal
      }
    })
  } catch (error) {
    console.error('API error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid data',
        details: error.errors
      }, { status: 400 })
    }
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

function generateMealForType(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks',
  macroTargets: any,
  profileData: any
): MealItem {
  // Meal-specific calorie and macro distributions
  const mealDistributions = {
    breakfast: { calories: 0.25, protein: 0.25, carbs: 0.35, fats: 0.20 },
    lunch: { calories: 0.35, protein: 0.40, carbs: 0.25, fats: 0.35 },
    dinner: { calories: 0.30, protein: 0.30, carbs: 0.30, fats: 0.35 },
    snacks: { calories: 0.10, protein: 0.15, carbs: 0.10, fats: 0.10 }
  }

  const distribution = mealDistributions[mealType]

  const mealCalories = Math.round(macroTargets.calories * distribution.calories)
  const mealProtein = Math.round(macroTargets.protein * distribution.protein)
  const mealCarbs = Math.round(macroTargets.carbs * distribution.carbs)
  const mealFats = Math.round(macroTargets.fats * distribution.fats)

  // Generate meal options based on meal type and user goals
  const mealOptions = {
    breakfast: [
      {
        name: 'Protein Oats with Berries',
        ingredients: ['50g oats', '1 scoop protein powder', '200ml almond milk', 'Mixed berries', 'Almonds'],
        instructions: ['Mix oats with milk and let sit', 'Add protein powder and stir', 'Top with berries and almonds']
      },
      {
        name: 'Greek Yogurt Parfait',
        ingredients: ['200g Greek yogurt', 'Granola', 'Honey', 'Banana', 'Chia seeds'],
        instructions: ['Layer yogurt in bowl', 'Add granola and sliced banana', 'Drizzle with honey and sprinkle chia seeds']
      },
      {
        name: 'Veggie Scramble',
        ingredients: ['3 eggs', 'Spinach', 'Bell peppers', 'Mushrooms', 'Avocado', 'Whole grain toast'],
        instructions: ['Sauté vegetables', 'Scramble eggs with veggies', 'Serve with avocado and toast']
      }
    ],
    lunch: [
      {
        name: 'Grilled Chicken Quinoa Bowl',
        ingredients: ['150g chicken breast', '100g quinoa', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Tahini dressing'],
        instructions: ['Grill seasoned chicken breast', 'Cook quinoa according to package', 'Assemble bowl with greens and vegetables', 'Top with sliced chicken and dressing']
      },
      {
        name: 'Salmon and Sweet Potato',
        ingredients: ['150g salmon fillet', '200g sweet potato', 'Asparagus', 'Lemon', 'Olive oil', 'Herbs'],
        instructions: ['Roast sweet potato wedges', 'Pan-sear salmon with lemon', 'Steam asparagus', 'Serve with herbs and olive oil drizzle']
      },
      {
        name: 'Turkey and Hummus Wrap',
        ingredients: ['Whole wheat tortilla', '120g turkey breast', 'Hummus', 'Lettuce', 'Tomato', 'Cucumber', 'Red onion'],
        instructions: ['Spread hummus on tortilla', 'Layer turkey and vegetables', 'Roll tightly and slice in half']
      }
    ],
    dinner: [
      {
        name: 'Lean Beef Stir-fry',
        ingredients: ['150g lean beef strips', 'Brown rice', 'Broccoli', 'Bell peppers', 'Snap peas', 'Ginger', 'Garlic', 'Soy sauce'],
        instructions: ['Cook brown rice', 'Stir-fry beef until browned', 'Add vegetables and aromatics', 'Serve over rice with soy sauce']
      },
      {
        name: 'Baked Cod with Vegetables',
        ingredients: ['150g cod fillet', 'Roasted vegetables', 'Quinoa', 'Lemon', 'Herbs', 'Olive oil'],
        instructions: ['Season cod with herbs and lemon', 'Bake with mixed vegetables', 'Serve over quinoa with olive oil']
      },
      {
        name: 'Chicken and Vegetable Curry',
        ingredients: ['150g chicken thigh', 'Coconut milk', 'Curry spices', 'Cauliflower rice', 'Bell peppers', 'Onion', 'Garlic'],
        instructions: ['Sauté aromatics and spices', 'Add chicken and cook through', 'Simmer with coconut milk and vegetables', 'Serve over cauliflower rice']
      }
    ],
    snacks: [
      {
        name: 'Apple with Almond Butter',
        ingredients: ['1 medium apple', '2 tbsp almond butter', 'Cinnamon'],
        instructions: ['Slice apple', 'Serve with almond butter for dipping', 'Sprinkle with cinnamon']
      },
      {
        name: 'Protein Smoothie',
        ingredients: ['1 scoop protein powder', '1 banana', 'Spinach', 'Almond milk', 'Ice'],
        instructions: ['Blend all ingredients until smooth', 'Add ice for desired consistency']
      },
      {
        name: 'Cottage Cheese Bowl',
        ingredients: ['150g cottage cheese', 'Cucumber', 'Cherry tomatoes', 'Everything bagel seasoning'],
        instructions: ['Place cottage cheese in bowl', 'Top with diced vegetables', 'Sprinkle with seasoning']
      }
    ]
  }

  // Select a random meal option for the meal type
  const options = mealOptions[mealType]
  const selectedMeal = options[Math.floor(Math.random() * options.length)]

  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: selectedMeal.name,
    quantity: mealType === 'snacks' ? '1 portion' : '1 serving',
    calories: mealCalories,
    protein: mealProtein,
    carbs: mealCarbs,
    fats: mealFats,
    ingredients: selectedMeal.ingredients,
    instructions: selectedMeal.instructions
  }
}