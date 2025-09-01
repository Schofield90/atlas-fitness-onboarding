import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// System prompt for nutrition coaching
const NUTRITION_COACH_PROMPT = `You are an expert AI nutrition coach with deep knowledge of:
- Macro and micronutrients
- Sports nutrition and performance
- Weight management strategies
- Dietary restrictions and allergies
- Meal planning and prep
- Supplement recommendations
- Evidence-based nutrition science

Your role is to provide personalized nutrition advice based on the user's:
- Current fitness goals
- Dietary preferences and restrictions
- Activity level
- Body composition goals
- Health conditions

Guidelines:
1. Be encouraging and supportive
2. Provide specific, actionable advice
3. Include macro breakdowns when relevant
4. Suggest practical meal ideas
5. Consider the user's lifestyle and preferences
6. Use metric measurements (grams, kg)
7. Reference scientific evidence when appropriate
8. Never provide medical advice - suggest consulting healthcare providers for medical issues

Keep responses concise but comprehensive. Use bullet points for clarity when listing multiple items.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      message, 
      profile, 
      memberData, 
      todaysMacros,
      conversationHistory 
    } = await request.json()

    // Build context from user profile and current data
    const userContext = `
User Profile:
- Name: ${memberData?.first_name || 'User'}
- Goals: ${profile?.goals?.join(', ') || 'General fitness'}
- Dietary Restrictions: ${profile?.dietaryRestrictions?.join(', ') || 'None'}
- Target Calories: ${profile?.targetCalories || 2000} kcal
- Target Macros: Protein ${profile?.targetMacros?.protein || 150}g, Carbs ${profile?.targetMacros?.carbs || 200}g, Fats ${profile?.targetMacros?.fats || 60}g
- Current Weight: ${profile?.currentWeight || 'Unknown'} kg
- Target Weight: ${profile?.targetWeight || 'Maintain'} kg
- Activity Level: ${profile?.activityLevel || 'Moderate'}

Today's Progress:
- Calories: ${todaysMacros?.calories || 0} kcal consumed
- Protein: ${todaysMacros?.protein || 0}g
- Carbs: ${todaysMacros?.carbs || 0}g
- Fats: ${todaysMacros?.fats || 0}g
`

    // Format conversation history for context
    const conversationContext = conversationHistory
      ?.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Coach'}: ${msg.content}`)
      .join('\n') || ''

    // Analyze message intent for special handling
    const isAskingForMealPlan = /meal plan|what.*eat|menu|recipes/i.test(message)
    const isAskingForMacros = /macros|protein|carbs|fats|calories/i.test(message)
    const isLoggingFood = /ate|had|consumed|just|finished/i.test(message)

    let aiResponse = ''
    let mealPlan = null

    // Use Claude for complex reasoning, OpenAI for structured data
    if (isAskingForMealPlan) {
      // Generate structured meal plan with OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: NUTRITION_COACH_PROMPT + '\n\nGenerate a detailed meal plan based on the user\'s profile and request.'
          },
          {
            role: 'user',
            content: `${userContext}\n\nUser request: ${message}\n\nProvide a detailed meal plan with specific foods, portions, and macro breakdowns.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
      
      aiResponse = completion.choices[0].message.content || 'I can help you create a meal plan. Could you provide more details about your preferences?'
      
      // Extract meal plan data if generated
      if (aiResponse.includes('Breakfast') || aiResponse.includes('Lunch')) {
        mealPlan = {
          date: new Date().toISOString().split('T')[0],
          meals: extractMealsFromResponse(aiResponse),
          totalCalories: profile?.targetCalories || 2000,
          macros: profile?.targetMacros || { protein: 150, carbs: 200, fats: 60 }
        }
      }
    } else {
      // Use Claude for conversational responses
      try {
        const claudeResponse = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 800,
          temperature: 0.7,
          system: NUTRITION_COACH_PROMPT,
          messages: [
            {
              role: 'user',
              content: `${userContext}\n\nConversation History:\n${conversationContext}\n\nUser: ${message}`
            }
          ]
        })
        
        aiResponse = claudeResponse.content[0].type === 'text' 
          ? claudeResponse.content[0].text 
          : 'I can help you with that. Could you provide more details?'
      } catch (claudeError) {
        console.error('Claude API error:', claudeError)
        
        // Fallback to OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: NUTRITION_COACH_PROMPT
            },
            {
              role: 'user',
              content: `${userContext}\n\nUser: ${message}`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
        
        aiResponse = completion.choices[0].message.content || 'I understand. Let me help you with your nutrition goals.'
      }
    }

    // Add smart suggestions based on context
    if (isAskingForMacros && todaysMacros) {
      const remaining = {
        calories: (profile?.targetCalories || 2000) - todaysMacros.calories,
        protein: (profile?.targetMacros?.protein || 150) - todaysMacros.protein,
        carbs: (profile?.targetMacros?.carbs || 200) - todaysMacros.carbs,
        fats: (profile?.targetMacros?.fats || 60) - todaysMacros.fats
      }
      
      aiResponse += `\n\n📊 **Remaining for today:**\n• Calories: ${remaining.calories} kcal\n• Protein: ${remaining.protein}g\n• Carbs: ${remaining.carbs}g\n• Fats: ${remaining.fats}g`
    }

    // Parse food logging attempts
    let foodLog = null
    if (isLoggingFood) {
      foodLog = await parseFoodFromMessage(message)
    }

    return NextResponse.json({
      response: aiResponse,
      mealPlan,
      foodLog,
      suggestions: generateSmartSuggestions(profile, todaysMacros)
    })

  } catch (error: any) {
    console.error('Nutrition coach error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process nutrition request',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper function to extract meals from AI response
function extractMealsFromResponse(response: string): any {
  const meals = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: []
  }
  
  // Simple extraction logic - would be more sophisticated in production
  const lines = response.split('\n')
  let currentMeal = ''
  
  for (const line of lines) {
    if (/breakfast/i.test(line)) currentMeal = 'breakfast'
    else if (/lunch/i.test(line)) currentMeal = 'lunch'
    else if (/dinner/i.test(line)) currentMeal = 'dinner'
    else if (/snack/i.test(line)) currentMeal = 'snacks'
    else if (currentMeal && line.includes('•') || line.includes('-')) {
      meals[currentMeal as keyof typeof meals].push(line.replace(/[•\-]/g, '').trim())
    }
  }
  
  return meals
}

// Helper function to parse food from natural language
async function parseFoodFromMessage(message: string): Promise<any> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Extract food items and estimate their macros from the user message. Return JSON format: { foods: [{ name, calories, protein, carbs, fats }] }'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    })
    
    const response = completion.choices[0].message.content
    if (response) {
      return JSON.parse(response)
    }
  } catch (error) {
    console.error('Error parsing food:', error)
  }
  
  return null
}

// Generate smart suggestions based on user data
function generateSmartSuggestions(profile: any, todaysMacros: any): string[] {
  const suggestions = []
  
  if (!profile) {
    suggestions.push('Set up your nutrition profile for personalized recommendations')
    return suggestions
  }
  
  const remainingCalories = (profile.targetCalories || 2000) - (todaysMacros?.calories || 0)
  const remainingProtein = (profile.targetMacros?.protein || 150) - (todaysMacros?.protein || 0)
  
  if (remainingCalories > 500) {
    suggestions.push(`You have ${remainingCalories} calories remaining today`)
  }
  
  if (remainingProtein > 30) {
    suggestions.push(`Consider a high-protein snack (${remainingProtein}g protein remaining)`)
  }
  
  const hour = new Date().getHours()
  if (hour < 10 && !todaysMacros?.calories) {
    suggestions.push('Start your day with a balanced breakfast')
  } else if (hour > 20 && remainingCalories > 200) {
    suggestions.push('Consider a light evening snack to meet your calorie goals')
  }
  
  return suggestions
}