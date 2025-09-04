'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  Send, 
  Loader2, 
  ChefHat, 
  Apple, 
  TrendingUp, 
  ListChecks,
  Target,
  Calculator,
  Edit2,
  Save,
  MessageCircle,
  User,
  Heart,
  Activity,
  AlertCircle,
  Check,
  X,
  Plus,
  Minus,
  Bot,
  Coffee,
  Pizza,
  Salad
} from 'lucide-react'
import toast from '@/app/lib/toast'

interface NutritionProfile {
  currentWeight: number
  currentWeightUnit: 'kg' | 'lbs'
  targetWeight: number
  targetWeightUnit: 'kg' | 'lbs'
  height: number
  heightUnit: 'cm' | 'ft'
  heightInches?: number // For feet and inches input
  age: number
  gender: 'male' | 'female' | 'other'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal: 'lose_weight' | 'maintain' | 'gain_muscle' | 'improve_health'
  dietaryPreferences: string[]
  allergies: string[]
  struggles: string[]
  mealsPerDay: number
  macroSplit?: {
    protein: number
    carbs: number
    fats: number
  }
  tdee?: number
  targetCalories?: number
  bmr?: number
}

interface MealPlan {
  id?: string
  date: string
  meals: {
    name: string
    time: string
    foods: {
      name: string
      amount: string
      calories: number
      protein: number
      carbs: number
      fats: number
    }[]
    totals: {
      calories: number
      protein: number
      carbs: number
      fats: number
    }
  }[]
  dailyTotals: {
    calories: number
    protein: number
    carbs: number
    fats: number
  }
  notes?: string
  coachComments?: {
    id: string
    comment: string
    createdAt: string
    coachName: string
  }[]
}

interface ChatMessage {
  id: string
  content: string
  sender_type: 'member' | 'coach' | 'ai'
  sender_id: string
  sender_name?: string
  created_at: string
  read: boolean
}

const ONBOARDING_QUESTIONS = [
  {
    id: 'basics',
    title: 'Let\'s start with the basics',
    fields: ['currentWeight', 'targetWeight', 'height', 'age', 'gender']
  },
  {
    id: 'activity',
    title: 'Tell me about your lifestyle',
    fields: ['activityLevel', 'goal', 'mealsPerDay']
  },
  {
    id: 'preferences',
    title: 'Your food preferences',
    fields: ['dietaryPreferences', 'allergies']
  },
  {
    id: 'struggles',
    title: 'What do you struggle with?',
    fields: ['struggles']
  }
]

export default function AINutritionCoach({ memberData }: { memberData: any }) {
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [nutritionProfile, setNutritionProfile] = useState<Partial<NutritionProfile>>({
    currentWeightUnit: 'kg',
    targetWeightUnit: 'kg',
    heightUnit: 'cm',
    gender: 'other',
    activityLevel: 'moderate',
    goal: 'maintain',
    mealsPerDay: 3,
    dietaryPreferences: [],
    allergies: [],
    struggles: []
  })
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [editingMeal, setEditingMeal] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMacroCalculator, setShowMacroCalculator] = useState(false)
  const [assignedCoach, setAssignedCoach] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!memberData || !memberData.id) return
    loadNutritionProfile()
    loadAssignedCoach()
    loadChatHistory()
  }, [memberData?.id, memberData?.organization_id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAssignedCoach = async () => {
    try {
      // First check if member has an assigned coach
      const { data: assignment } = await supabase
        .from('member_coach_assignments')
        .select('coach_id')
        .eq('member_id', memberData.id)
        .single()

      if (assignment) {
        // Load coach details
        const { data: coach } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', assignment.coach_id)
          .single()
        
        if (coach) {
          setAssignedCoach(coach)
        }
      } else {
        // If no assigned coach, get the organization owner as default coach
        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('org_id', memberData.organization_id)
          .eq('role', 'owner')
          .single()
        
        if (orgMember) {
          const { data: owner } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', orgMember.user_id)
            .single()
          
          if (owner) {
            setAssignedCoach(owner)
            // Create assignment
            await supabase
              .from('member_coach_assignments')
              .insert({
                member_id: memberData.id,
                coach_id: owner.id,
                organization_id: memberData.organization_id
              })
          }
        }
      }
    } catch (error) {
      console.error('Error loading assigned coach:', error)
    }
  }

  const loadChatHistory = async () => {
    try {
      const { data } = await supabase
        .from('member_coach_messages')
        .select('*')
        .eq('member_id', memberData.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const loadNutritionProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .eq('member_id', memberData.id)
        .single()

      if (data) {
        setNutritionProfile(data.profile_data)
        setIsOnboarding(false)
        loadMealPlan()
      }
    } catch (error) {
      console.error('Error loading nutrition profile:', error)
    }
  }

  const loadMealPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          coach_comments:meal_plan_comments(
            id,
            comment,
            created_at,
            coach:users(full_name)
          )
        `)
        .eq('member_id', memberData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setMealPlan({
          ...data.plan_data,
          id: data.id,
          coachComments: data.coach_comments?.map((c: any) => ({
            id: c.id,
            comment: c.comment,
            createdAt: c.created_at,
            coachName: c.coach?.full_name || 'Coach'
          }))
        })
      }
    } catch (error) {
      console.error('Error loading meal plan:', error)
    }
  }

  const saveNutritionProfile = async () => {
    try {
      const { error } = await supabase
        .from('nutrition_profiles')
        .upsert({
          member_id: memberData.id,
          organization_id: memberData.organization_id,
          profile_data: nutritionProfile,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'member_id'
        })

      if (error) throw error
      
      // Sync to customer profile
      await supabase
        .from('clients')
        .update({
          nutrition_profile: nutritionProfile,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberData.id)
        
    } catch (error) {
      console.error('Error saving nutrition profile:', error)
    }
  }

  // Debounced save function to prevent excessive API calls
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      await saveNutritionProfile()
    }, 1000) // Save after 1 second of inactivity
  }, [nutritionProfile, memberData.id, memberData.organization_id])

  const calculateMacros = () => {
    const profile = nutritionProfile as NutritionProfile
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr: number
    const weightInKg = profile.currentWeightUnit === 'lbs' 
      ? profile.currentWeight * 0.453592 
      : profile.currentWeight
    
    // Fix height conversion - properly handle feet and inches
    let heightInCm: number
    if (profile.heightUnit === 'ft') {
      const totalInches = (profile.height * 12) + (profile.heightInches || 0)
      heightInCm = totalInches * 2.54
    } else {
      heightInCm = profile.height
    }

    if (profile.gender === 'male') {
      bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * profile.age) + 5
    } else {
      bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * profile.age) - 161
    }

    // Calculate TDEE based on activity level with more conservative multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.35,  // Reduced from 1.375
      moderate: 1.5, // Reduced from 1.55
      active: 1.65,  // Reduced from 1.725
      very_active: 1.8 // Reduced from 1.9
    }

    const tdee = Math.round(bmr * activityMultipliers[profile.activityLevel])

    // Calculate target calories based on goal with more moderate adjustments
    let targetCalories = tdee
    if (profile.goal === 'lose_weight') {
      targetCalories = Math.round(tdee * 0.85) // 15% deficit (was 20%)
    } else if (profile.goal === 'gain_muscle') {
      targetCalories = Math.round(tdee * 1.08) // 8% surplus (was 10%)
    }

    // Calculate macro split
    let proteinRatio = 0.3
    let carbRatio = 0.4
    let fatRatio = 0.3

    if (profile.goal === 'gain_muscle') {
      proteinRatio = 0.35
      carbRatio = 0.45
      fatRatio = 0.2
    } else if (profile.goal === 'lose_weight') {
      proteinRatio = 0.4
      carbRatio = 0.3
      fatRatio = 0.3
    }

    const macros = {
      protein: Math.round((targetCalories * proteinRatio) / 4), // 4 cal per gram
      carbs: Math.round((targetCalories * carbRatio) / 4), // 4 cal per gram
      fats: Math.round((targetCalories * fatRatio) / 9) // 9 cal per gram
    }

    setNutritionProfile(prev => ({
      ...prev,
      tdee,
      targetCalories,
      macroSplit: macros
    }))

    return { tdee, targetCalories, macros }
  }

  // If member data is not yet available, render a lightweight placeholder to avoid runtime errors
  if (!memberData || !memberData.id) {
    return (
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span className="text-sm text-gray-300">Loading your nutrition coach…</span>
        </div>
      </div>
    )
  }

  const generateMealPlan = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/nutrition/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: nutritionProfile,
          memberData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate meal plan')
      }

      const data = await response.json()
      if (data.mealPlan) {
        setMealPlan(data.mealPlan)
        
        // Save meal plan to database
        const { data: savedPlan } = await supabase
          .from('meal_plans')
          .insert({
            member_id: memberData.id,
            organization_id: memberData.organization_id,
            plan_data: data.mealPlan,
            created_at: new Date().toISOString()
          })
          .select()
          .single()
          
        // Sync to customer profile
        await supabase
          .from('clients')
          .update({
            current_meal_plan: data.mealPlan,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberData.id)
          
        toast.success('Meal plan generated and saved!')
      } else {
        toast.error('Failed to generate meal plan - no data received')
      }
    } catch (error) {
      console.error('Error generating meal plan:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate meal plan'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessageToCoach = async () => {
    if (!inputMessage.trim() || isLoading || !assignedCoach) return

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: inputMessage.trim(),
      sender_type: 'member',
      sender_id: memberData.id,
      sender_name: memberData.first_name || 'Member',
      created_at: new Date().toISOString(),
      read: false
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Save message to database
      await supabase
        .from('member_coach_messages')
        .insert({
          member_id: memberData.id,
          coach_id: assignedCoach.id,
          organization_id: memberData.organization_id,
          ...newMessage
        })

      // Create notification for coach
      await supabase
        .from('notifications')
        .insert({
          user_id: assignedCoach.id,
          type: 'new_nutrition_message',
          title: 'New nutrition message',
          message: `${memberData.first_name} sent you a message about nutrition`,
          data: {
            member_id: memberData.id,
            message: newMessage.content
          }
        })

      // Check if message is nutrition-related and get AI response
      if (inputMessage.toLowerCase().includes('meal') || 
          inputMessage.toLowerCase().includes('food') || 
          inputMessage.toLowerCase().includes('nutrition') ||
          inputMessage.toLowerCase().includes('macro') ||
          inputMessage.toLowerCase().includes('calorie')) {
        
        // Get AI response
        const response = await fetch('/api/nutrition/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputMessage,
            profile: nutritionProfile,
            mealPlan,
            memberData
          })
        })

        const data = await response.json()
        
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          content: data.response,
          sender_type: 'ai',
          sender_id: 'ai-nutrition-coach',
          sender_name: 'AI Coach',
          created_at: new Date().toISOString(),
          read: false
        }

        setMessages(prev => [...prev, aiMessage])
        
        // Save AI response
        await supabase
          .from('member_coach_messages')
          .insert({
            member_id: memberData.id,
            coach_id: assignedCoach.id,
            organization_id: memberData.organization_id,
            ...aiMessage
          })
      }
      
      toast.success('Message sent to your coach!')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOnboardingNext = async () => {
    if (onboardingStep < ONBOARDING_QUESTIONS.length - 1) {
      setOnboardingStep(prev => prev + 1)
    } else {
      // Calculate macros and save profile
      calculateMacros()
      await saveNutritionProfile()
      setIsOnboarding(false)
      setShowMacroCalculator(true)
    }
  }

  const updateMealItem = (mealIndex: number, foodIndex: number, field: string, value: any) => {
    if (!mealPlan) return
    
    const updatedPlan = { ...mealPlan }
    const meal = updatedPlan.meals[mealIndex]
    const food = meal.foods[foodIndex]
    
    food[field as keyof typeof food] = value
    
    // Recalculate meal totals
    meal.totals = meal.foods.reduce((acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fats: acc.fats + f.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
    
    // Recalculate daily totals
    updatedPlan.dailyTotals = updatedPlan.meals.reduce((acc, m) => ({
      calories: acc.calories + m.totals.calories,
      protein: acc.protein + m.totals.protein,
      carbs: acc.carbs + m.totals.carbs,
      fats: acc.fats + m.totals.fats
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 })
    
    setMealPlan(updatedPlan)
  }

  const saveMealPlan = async () => {
    if (!mealPlan) return
    
    try {
      await supabase
        .from('meal_plans')
        .update({
          plan_data: mealPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlan.id)
      
      // Sync to customer profile
      await supabase
        .from('clients')
        .update({
          current_meal_plan: mealPlan,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberData.id)
      
      setEditingMeal(null)
      toast.success('Meal plan saved!')
    } catch (error) {
      console.error('Error saving meal plan:', error)
      toast.error('Failed to save meal plan')
    }
  }

  if (isOnboarding) {
    const currentQuestion = ONBOARDING_QUESTIONS[onboardingStep]
    
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Nutrition Profile Setup</h2>
            <span className="text-sm text-gray-400">
              Step {onboardingStep + 1} of {ONBOARDING_QUESTIONS.length}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((onboardingStep + 1) / ONBOARDING_QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl text-white">{currentQuestion.title}</h3>
          
          {currentQuestion.fields.includes('currentWeight') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Weight
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={nutritionProfile.currentWeight || ''}
                    onChange={(e) => setNutritionProfile(prev => ({ 
                      ...prev, 
                      currentWeight: parseFloat(e.target.value) 
                    }))}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="Enter weight"
                  />
                  <select
                    value={nutritionProfile.currentWeightUnit}
                    onChange={(e) => setNutritionProfile(prev => ({ 
                      ...prev, 
                      currentWeightUnit: e.target.value as 'kg' | 'lbs' 
                    }))}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Weight
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={nutritionProfile.targetWeight || ''}
                    onChange={(e) => setNutritionProfile(prev => ({ 
                      ...prev, 
                      targetWeight: parseFloat(e.target.value) 
                    }))}
                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                    placeholder="Enter target"
                  />
                  <select
                    value={nutritionProfile.targetWeightUnit}
                    onChange={(e) => setNutritionProfile(prev => ({ 
                      ...prev, 
                      targetWeightUnit: e.target.value as 'kg' | 'lbs' 
                    }))}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentQuestion.fields.includes('height') && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Height
                </label>
                <div className="flex gap-2">
                  {nutritionProfile.heightUnit === 'ft' ? (
                    <>
                      <input
                        type="number"
                        value={nutritionProfile.height || ''}
                        onChange={(e) => setNutritionProfile(prev => ({ 
                          ...prev, 
                          height: parseFloat(e.target.value) 
                        }))}
                        className="w-20 px-3 py-2 bg-gray-700 text-white rounded-lg"
                        placeholder="Feet"
                        min="3"
                        max="8"
                      />
                      <span className="text-gray-400 self-center">ft</span>
                      <input
                        type="number"
                        value={nutritionProfile.heightInches || ''}
                        onChange={(e) => setNutritionProfile(prev => ({ 
                          ...prev, 
                          heightInches: parseFloat(e.target.value) 
                        }))}
                        className="w-20 px-3 py-2 bg-gray-700 text-white rounded-lg"
                        placeholder="Inches"
                        min="0"
                        max="11"
                      />
                      <span className="text-gray-400 self-center">in</span>
                    </>
                  ) : (
                    <input
                      type="number"
                      value={nutritionProfile.height || ''}
                      onChange={(e) => setNutritionProfile(prev => ({ 
                        ...prev, 
                        height: parseFloat(e.target.value) 
                      }))}
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg"
                      placeholder="Height in cm"
                      min="100"
                      max="250"
                    />
                  )}
                  <select
                    value={nutritionProfile.heightUnit}
                    onChange={(e) => setNutritionProfile(prev => ({ 
                      ...prev, 
                      heightUnit: e.target.value as 'cm' | 'ft',
                      heightInches: 0 // Reset inches when switching units
                    }))}
                    className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft/in</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={nutritionProfile.age || ''}
                  onChange={(e) => setNutritionProfile(prev => ({ 
                    ...prev, 
                    age: parseInt(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                  placeholder="Age"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={nutritionProfile.gender}
                  onChange={(e) => setNutritionProfile(prev => ({ 
                    ...prev, 
                    gender: e.target.value as 'male' | 'female' | 'other' 
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {currentQuestion.fields.includes('activityLevel') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Activity Level
              </label>
              <select
                value={nutritionProfile.activityLevel}
                onChange={(e) => setNutritionProfile(prev => ({ 
                  ...prev, 
                  activityLevel: e.target.value as any 
                }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Light (1-3 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very_active">Very Active (twice a day)</option>
              </select>
            </div>
          )}

          {currentQuestion.fields.includes('goal') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Primary Goal
              </label>
              <select
                value={nutritionProfile.goal}
                onChange={(e) => setNutritionProfile(prev => ({ 
                  ...prev, 
                  goal: e.target.value as any 
                }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="lose_weight">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain_muscle">Gain Muscle</option>
                <option value="improve_health">Improve Health</option>
              </select>
            </div>
          )}

          {currentQuestion.fields.includes('mealsPerDay') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                How many meals per day?
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={nutritionProfile.mealsPerDay}
                onChange={(e) => setNutritionProfile(prev => ({ 
                  ...prev, 
                  mealsPerDay: parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
              />
            </div>
          )}

          {currentQuestion.fields.includes('dietaryPreferences') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Dietary Preferences (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Low-Carb'].map(pref => (
                  <label key={pref} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={nutritionProfile.dietaryPreferences?.includes(pref)}
                      onChange={(e) => {
                        const prefs = nutritionProfile.dietaryPreferences || []
                        if (e.target.checked) {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            dietaryPreferences: [...prefs, pref] 
                          }))
                        } else {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            dietaryPreferences: prefs.filter(p => p !== pref) 
                          }))
                        }
                      }}
                      className="rounded text-green-500"
                    />
                    <span className="text-white">{pref}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.fields.includes('allergies') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allergies or Intolerances (select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy', 'Wheat', 'Fish', 'None'].map(allergy => (
                  <label key={allergy} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={nutritionProfile.allergies?.includes(allergy)}
                      onChange={(e) => {
                        const allergies = nutritionProfile.allergies || []
                        if (e.target.checked) {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            allergies: [...allergies, allergy] 
                          }))
                        } else {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            allergies: allergies.filter(a => a !== allergy) 
                          }))
                        }
                      }}
                      className="rounded text-red-500"
                    />
                    <span className="text-white">{allergy}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentQuestion.fields.includes('struggles') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What do you struggle with? (select all that apply)
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  'Late night snacking',
                  'Emotional eating',
                  'Meal planning',
                  'Portion control',
                  'Eating out too often',
                  'Not enough time to cook',
                  'Sweet tooth',
                  'Weekend overeating'
                ].map(struggle => (
                  <label key={struggle} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={nutritionProfile.struggles?.includes(struggle)}
                      onChange={(e) => {
                        const struggles = nutritionProfile.struggles || []
                        if (e.target.checked) {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            struggles: [...struggles, struggle] 
                          }))
                        } else {
                          setNutritionProfile(prev => ({ 
                            ...prev, 
                            struggles: struggles.filter(s => s !== struggle) 
                          }))
                        }
                      }}
                      className="rounded text-yellow-500"
                    />
                    <span className="text-white">{struggle}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setOnboardingStep(prev => Math.max(0, prev - 1))}
              disabled={onboardingStep === 0}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={handleOnboardingNext}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              {onboardingStep === ONBOARDING_QUESTIONS.length - 1 ? 'Complete Setup' : 'Next'}
              <ChefHat className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showMacroCalculator) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Your Macro Targets</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Daily Calorie Target</h3>
            <p className="text-3xl font-bold text-green-500">{nutritionProfile.targetCalories} kcal</p>
            <p className="text-sm text-gray-400 mt-1">TDEE: {nutritionProfile.tdee} kcal</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Macro Split</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Protein:</span>
                <span className="text-white font-semibold">{nutritionProfile.macroSplit?.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Carbs:</span>
                <span className="text-white font-semibold">{nutritionProfile.macroSplit?.carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Fats:</span>
                <span className="text-white font-semibold">{nutritionProfile.macroSplit?.fats}g</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Adjust Your Macros</h3>
          <p className="text-sm text-gray-400 mb-4">
            These are recommendations based on your goals. Macros auto-balance to match your calorie target.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Protein</span>
                <span>{nutritionProfile.macroSplit?.protein}g ({Math.round((nutritionProfile.macroSplit?.protein || 0) * 4 / (nutritionProfile.targetCalories || 1) * 100)}%)</span>
              </label>
              <input
                type="range"
                min="50"
                max="300"
                value={nutritionProfile.macroSplit?.protein || 100}
                onChange={(e) => {
                  const protein = parseInt(e.target.value)
                  const targetCals = nutritionProfile.targetCalories || 2000
                  const proteinCals = protein * 4
                  const remainingCals = targetCals - proteinCals
                  
                  // Auto-balance carbs and fats (40/60 split of remaining)
                  const carbCals = remainingCals * 0.6
                  const fatCals = remainingCals * 0.4
                  const carbs = Math.round(carbCals / 4)
                  const fats = Math.round(fatCals / 9)
                  
                  setNutritionProfile(prev => ({
                    ...prev,
                    macroSplit: {
                      protein,
                      carbs: Math.max(50, carbs),
                      fats: Math.max(20, fats)
                    }
                  }))
                  
                  // Trigger debounced save
                  debouncedSave()
                }}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Carbs</span>
                <span>{nutritionProfile.macroSplit?.carbs}g ({Math.round((nutritionProfile.macroSplit?.carbs || 0) * 4 / (nutritionProfile.targetCalories || 1) * 100)}%)</span>
              </label>
              <input
                type="range"
                min="50"
                max="400"
                value={nutritionProfile.macroSplit?.carbs || 150}
                onChange={(e) => {
                  const carbs = parseInt(e.target.value)
                  const targetCals = nutritionProfile.targetCalories || 2000
                  const protein = nutritionProfile.macroSplit?.protein || 100
                  const proteinCals = protein * 4
                  const carbCals = carbs * 4
                  const remainingCals = targetCals - proteinCals - carbCals
                  
                  // Auto-adjust fats
                  const fats = Math.round(remainingCals / 9)
                  
                  setNutritionProfile(prev => ({
                    ...prev,
                    macroSplit: {
                      ...prev.macroSplit!,
                      carbs,
                      fats: Math.max(20, fats)
                    }
                  }))
                  
                  // Trigger debounced save
                  debouncedSave()
                }}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Fats</span>
                <span>{nutritionProfile.macroSplit?.fats}g ({Math.round((nutritionProfile.macroSplit?.fats || 0) * 9 / (nutritionProfile.targetCalories || 1) * 100)}%)</span>
              </label>
              <input
                type="range"
                min="20"
                max="150"
                value={nutritionProfile.macroSplit?.fats || 50}
                onChange={(e) => {
                  const fats = parseInt(e.target.value)
                  const targetCals = nutritionProfile.targetCalories || 2000
                  const protein = nutritionProfile.macroSplit?.protein || 100
                  const proteinCals = protein * 4
                  const fatCals = fats * 9
                  const remainingCals = targetCals - proteinCals - fatCals
                  
                  // Auto-adjust carbs
                  const carbs = Math.round(remainingCals / 4)
                  
                  setNutritionProfile(prev => ({
                    ...prev,
                    macroSplit: {
                      ...prev.macroSplit!,
                      carbs: Math.max(50, carbs),
                      fats
                    }
                  }))
                  
                  // Trigger debounced save
                  debouncedSave()
                }}
                className="w-full"
              />
            </div>
            
            <div className="pt-2 border-t border-gray-600">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Calories:</span>
                <span className="text-white font-semibold">
                  {((nutritionProfile.macroSplit?.protein || 0) * 4) + 
                   ((nutritionProfile.macroSplit?.carbs || 0) * 4) + 
                   ((nutritionProfile.macroSplit?.fats || 0) * 9)} kcal
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Target:</span>
                <span className="text-green-400 font-semibold">{nutritionProfile.targetCalories} kcal</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowMacroCalculator(false)
            saveNutritionProfile()
            generateMealPlan()
          }}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
        >
          Generate Personalized Meal Plan
          <ChefHat className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Meal Plan Display */}
      {mealPlan && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Meal Plan</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMacroCalculator(true)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Adjust Macros
              </button>
              <button
                onClick={generateMealPlan}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <ChefHat className="h-4 w-4" />
                New Plan
              </button>
            </div>
          </div>

          {/* Daily Totals */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-400">Calories</p>
              <p className="text-xl font-bold text-white">
                {mealPlan.dailyTotals.calories}
                <span className="text-sm text-gray-400">/{nutritionProfile.targetCalories}</span>
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-400">Protein</p>
              <p className="text-xl font-bold text-blue-400">
                {mealPlan.dailyTotals.protein}g
                <span className="text-sm text-gray-400">/{nutritionProfile.macroSplit?.protein}g</span>
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-400">Carbs</p>
              <p className="text-xl font-bold text-green-400">
                {mealPlan.dailyTotals.carbs}g
                <span className="text-sm text-gray-400">/{nutritionProfile.macroSplit?.carbs}g</span>
              </p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-400">Fats</p>
              <p className="text-xl font-bold text-yellow-400">
                {mealPlan.dailyTotals.fats}g
                <span className="text-sm text-gray-400">/{nutritionProfile.macroSplit?.fats}g</span>
              </p>
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-4">
            {mealPlan.meals.map((meal, mealIndex) => (
              <div key={mealIndex} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {meal.name} - {meal.time}
                  </h3>
                  <button
                    onClick={() => setEditingMeal(editingMeal === meal.name ? null : meal.name)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    {editingMeal === meal.name ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="space-y-2">
                  {meal.foods.map((food, foodIndex) => (
                    <div key={foodIndex} className="flex justify-between items-center py-2 border-b border-gray-600">
                      {editingMeal === meal.name ? (
                        <div className="flex-1 grid grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={food.name}
                            onChange={(e) => updateMealItem(mealIndex, foodIndex, 'name', e.target.value)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          />
                          <input
                            type="text"
                            value={food.amount}
                            onChange={(e) => updateMealItem(mealIndex, foodIndex, 'amount', e.target.value)}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          />
                          <input
                            type="number"
                            value={food.calories}
                            onChange={(e) => updateMealItem(mealIndex, foodIndex, 'calories', parseInt(e.target.value))}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          />
                          <input
                            type="number"
                            value={food.protein}
                            onChange={(e) => updateMealItem(mealIndex, foodIndex, 'protein', parseInt(e.target.value))}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          />
                          <input
                            type="number"
                            value={food.carbs}
                            onChange={(e) => updateMealItem(mealIndex, foodIndex, 'carbs', parseInt(e.target.value))}
                            className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-white">{food.name}</p>
                            <p className="text-sm text-gray-400">{food.amount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white">{food.calories} cal</p>
                            <p className="text-xs text-gray-400">
                              P: {food.protein}g | C: {food.carbs}g | F: {food.fats}g
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {editingMeal === meal.name && (
                  <button
                    onClick={saveMealPlan}
                    className="mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                )}

                <div className="mt-3 pt-3 border-t border-gray-600 flex justify-between text-sm">
                  <span className="text-gray-400">Meal Total:</span>
                  <span className="text-white">
                    {meal.totals.calories} cal | P: {meal.totals.protein}g | C: {meal.totals.carbs}g | F: {meal.totals.fats}g
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Coach Comments */}
          {mealPlan.coachComments && mealPlan.coachComments.length > 0 && (
            <div className="mt-6 bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Coach Comments
              </h3>
              <div className="space-y-3">
                {mealPlan.coachComments.map((comment) => (
                  <div key={comment.id} className="bg-gray-600 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-green-400">{comment.coachName}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat with Coach */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat with Your Coach
          </h3>
          {assignedCoach && (
            <span className="text-sm text-gray-400">
              Coach: {assignedCoach.full_name}
            </span>
          )}
        </div>
        
        <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto mb-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Send a message to your coach about nutrition, meal plans, or fitness!</p>
              <p className="text-sm mt-2">Your coach will receive notifications for new messages.</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.sender_type === 'member' ? 'text-right' : 'text-left'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.sender_type !== 'member' && (
                  <div className={`p-2 rounded-full ${
                    message.sender_type === 'ai' ? 'bg-purple-600' : 'bg-blue-600'
                  }`}>
                    {message.sender_type === 'ai' ? (
                      <Bot className="h-4 w-4 text-white" />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>
                )}
                <div
                  className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                    message.sender_type === 'member'
                      ? 'bg-green-600 text-white ml-auto' 
                      : message.sender_type === 'ai'
                      ? 'bg-purple-700 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {message.sender_type !== 'member' && (
                    <p className="text-xs font-semibold mb-1">
                      {message.sender_name || (message.sender_type === 'ai' ? 'AI Assistant' : 'Coach')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {message.sender_type === 'member' && (
                  <div className="p-2 rounded-full bg-green-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="text-left mb-4">
              <div className="inline-block px-4 py-2 rounded-lg bg-gray-700">
                <Loader2 className="h-5 w-5 animate-spin text-green-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessageToCoach()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask your coach about nutrition, recipes, or your meal plan..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !assignedCoach}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        
        {!assignedCoach && (
          <p className="text-xs text-red-400 mt-2">
            No coach assigned. Messages will be saved for when a coach is assigned.
          </p>
        )}
      </div>
    </div>
  )
}