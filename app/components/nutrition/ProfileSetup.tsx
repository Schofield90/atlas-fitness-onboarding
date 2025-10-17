'use client'

import { useState } from 'react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'
import { ArrowRight, ArrowLeft, Check, User, Target, Activity, Apple, Bot, Sparkles } from 'lucide-react'
import ChatWizard from './ChatWizard'

interface ProfileSetupProps {
  client: any
  onComplete: (profile: any) => void
  existingProfile?: any
}

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
  { value: 'lightly_active', label: 'Lightly Active', description: '1-3 days/week' },
  { value: 'moderately_active', label: 'Moderately Active', description: '3-5 days/week' },
  { value: 'very_active', label: 'Very Active', description: '6-7 days/week' },
  { value: 'extra_active', label: 'Extra Active', description: 'Very hard exercise & physical job' }
]

const GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', description: 'Create a caloric deficit' },
  { value: 'maintain_weight', label: 'Maintain Weight', description: 'Keep current weight' },
  { value: 'build_muscle', label: 'Build Muscle', description: 'Gain lean muscle mass' }
]

const DIETARY_PREFERENCES = [
  { value: 'none', label: 'No Restrictions' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'dairy_free', label: 'Dairy Free' }
]

export default function ProfileSetup({ client, onComplete, existingProfile }: ProfileSetupProps) {
  const [step, setStep] = useState(0) // Start at 0 for method selection
  const [loading, setLoading] = useState(false)
  const [useWizard, setUseWizard] = useState(false)
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    age: existingProfile?.age || '',
    weight: existingProfile?.weight || '',
    height: existingProfile?.height || '',
    gender: existingProfile?.gender || '',
    activity_level: existingProfile?.activity_level || '',
    goal: existingProfile?.goal || '',
    dietary_preferences: existingProfile?.dietary_preferences || [],
    allergies: existingProfile?.allergies || '',
    meal_count: existingProfile?.meal_count || 3
  })

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const calculateMacros = () => {
    // Basic macro calculation based on goals
    const weight = parseFloat(formData.weight)
    let calories = 0
    let protein = 0
    let carbs = 0
    let fat = 0

    // Calculate BMR using Mifflin-St Jeor equation
    let bmr = 0
    if (formData.gender === 'male') {
      bmr = 10 * weight + 6.25 * parseFloat(formData.height) - 5 * parseInt(formData.age) + 5
    } else {
      bmr = 10 * weight + 6.25 * parseFloat(formData.height) - 5 * parseInt(formData.age) - 161
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    }

    const tdee = bmr * activityMultipliers[formData.activity_level as keyof typeof activityMultipliers]

    // Adjust based on goal
    switch (formData.goal) {
      case 'lose_weight':
        calories = Math.round(tdee - 500) // 500 calorie deficit
        protein = Math.round(weight * 2.2) // Higher protein for muscle preservation
        fat = Math.round(calories * 0.25 / 9) // 25% from fat
        carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4)
        break
      case 'maintain_weight':
        calories = Math.round(tdee)
        protein = Math.round(weight * 1.8)
        fat = Math.round(calories * 0.3 / 9) // 30% from fat
        carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4)
        break
      case 'build_muscle':
        calories = Math.round(tdee + 300) // 300 calorie surplus
        protein = Math.round(weight * 2.2)
        fat = Math.round(calories * 0.25 / 9) // 25% from fat
        carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4)
        break
    }

    return { calories, protein, carbs, fat }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const macros = calculateMacros()
      
      const profileData = {
        client_id: client.id,
        ...formData,
        daily_calories: macros.calories,
        protein_grams: macros.protein,
        carbs_grams: macros.carbs,
        fat_grams: macros.fat,
        updated_at: new Date().toISOString()
      }

      let result
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('nutrition_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select()
          .single()
        
        if (error) throw error
        result = data
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('nutrition_profiles')
          .insert([profileData])
          .select()
          .single()
        
        if (error) throw error
        result = data
      }

      onComplete(result)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 0:
        return true // Method selection is always valid
      case 1:
        return formData.age && formData.weight && formData.height && formData.gender
      case 2:
        return formData.activity_level
      case 3:
        return formData.goal
      case 4:
        return formData.dietary_preferences.length > 0
      default:
        return false
    }
  }
  
  const handleWizardComplete = async (wizardData: any) => {
    // Map wizard data to our profile format
    const profileData = {
      client_id: client.id,
      age: wizardData.age,
      weight: wizardData.current_weight,
      height: wizardData.height,
      gender: wizardData.sex?.toLowerCase() || wizardData.gender,
      activity_level: wizardData.activity_level?.toLowerCase().replace('_', '_'),
      goal: wizardData.goal_weight < wizardData.current_weight ? 'lose_weight' : 
            wizardData.goal_weight > wizardData.current_weight ? 'build_muscle' : 'maintain_weight',
      dietary_preferences: wizardData.dietary_preferences || ['none'],
      allergies: wizardData.allergies?.join(', ') || '',
      meal_count: 3,
      // Calculate macros based on wizard data
      daily_calories: 0,
      protein_grams: 0,
      carbs_grams: 0,
      fat_grams: 0,
      updated_at: new Date().toISOString()
    }
    
    // Calculate macros
    const macros = calculateMacrosForWizard(wizardData)
    profileData.daily_calories = macros.calories
    profileData.protein_grams = macros.protein
    profileData.carbs_grams = macros.carbs
    profileData.fat_grams = macros.fat
    
    try {
      let result
      if (existingProfile) {
        const { data, error } = await supabase
          .from('nutrition_profiles')
          .update(profileData)
          .eq('id', existingProfile.id)
          .select()
          .single()
        
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('nutrition_profiles')
          .insert([profileData])
          .select()
          .single()
        
        if (error) throw error
        result = data
      }
      
      onComplete(result)
    } catch (error) {
      console.error('Error saving profile from wizard:', error)
      alert('Failed to save profile. Please try again.')
    }
  }
  
  const calculateMacrosForWizard = (wizardData: any) => {
    const weight = parseFloat(wizardData.current_weight)
    const height = parseFloat(wizardData.height)
    const age = parseInt(wizardData.age)
    const gender = wizardData.sex?.toLowerCase() || wizardData.gender
    
    let bmr = 0
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161
    }
    
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
      extra_active: 1.9
    }
    
    const activityLevel = wizardData.activity_level?.toLowerCase().replace(' ', '_') || 'moderately_active'
    const tdee = bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55)
    
    let calories = Math.round(tdee)
    let protein = Math.round(weight * 2.0)
    let fat = Math.round(calories * 0.25 / 9)
    let carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4)
    
    // Adjust based on goals
    if (wizardData.goal_weight < wizardData.current_weight) {
      calories = Math.round(tdee - 500) // Weight loss
      protein = Math.round(weight * 2.2) // Higher protein
    } else if (wizardData.goal_weight > wizardData.current_weight) {
      calories = Math.round(tdee + 300) // Muscle gain
      protein = Math.round(weight * 2.2)
    }
    
    return { calories, protein, carbs, fat }
  }

  // If using wizard, show the ChatWizard component instead
  if (useWizard) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ChatWizard 
          profile={existingProfile}
          onProfileComplete={handleWizardComplete}
          onCancel={() => {
            setUseWizard(false)
            setStep(1) // Go to first form step
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Set Up Your Nutrition Profile</h2>
            {step > 0 && <span className="text-sm text-gray-500">Step {step} of 4</span>}
          </div>
          {step > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Step 0: Method Selection */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-lg font-semibold mb-2">How would you like to set up your profile?</h3>
              <p className="text-gray-600">Choose the method that works best for you</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setUseWizard(true)
                }}
                className="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-start">
                  <Bot className="h-8 w-8 text-blue-600 mr-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center">
                      Let AI help me set up
                      <Sparkles className="h-4 w-4 text-yellow-500 ml-2" />
                    </h4>
                    <p className="text-gray-600 text-sm">
                      Have a conversation with our AI nutrition coach who will guide you through the setup process
                    </p>
                    <p className="text-blue-600 text-sm font-medium mt-2">Recommended - Faster & easier</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="p-6 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left group"
              >
                <div className="flex items-start">
                  <User className="h-8 w-8 text-gray-600 mr-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Use the form</h4>
                    <p className="text-gray-600 text-sm">
                      Fill out a step-by-step form with your information and preferences
                    </p>
                    <p className="text-gray-500 text-sm mt-2">Traditional method</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <User className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="175"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Activity Level */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Activity Level</h3>
                <p className="text-gray-600">How active are you?</p>
              </div>
            </div>

            <div className="space-y-3">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, activity_level: level.value })}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    formData.activity_level === level.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-sm text-gray-600">{level.description}</p>
                    </div>
                    {formData.activity_level === level.value && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Goals */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Your Goal</h3>
                <p className="text-gray-600">What do you want to achieve?</p>
              </div>
            </div>

            <div className="space-y-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setFormData({ ...formData, goal: goal.value })}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    formData.goal === goal.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{goal.label}</p>
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    </div>
                    {formData.goal === goal.value && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Dietary Preferences */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <Apple className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold">Dietary Preferences</h3>
                <p className="text-gray-600">Select all that apply</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIETARY_PREFERENCES.map((pref) => (
                <button
                  key={pref.value}
                  onClick={() => {
                    const current = formData.dietary_preferences || []
                    if (current.includes(pref.value)) {
                      setFormData({
                        ...formData,
                        dietary_preferences: current.filter(p => p !== pref.value)
                      })
                    } else {
                      setFormData({
                        ...formData,
                        dietary_preferences: [...current, pref.value]
                      })
                    }
                  }}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.dietary_preferences?.includes(pref.value)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{pref.label}</span>
                    {formData.dietary_preferences?.includes(pref.value) && (
                      <Check className="h-4 w-4 text-blue-600 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergies or Foods to Avoid (Optional)
              </label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., nuts, shellfish, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meals per day
              </label>
              <select
                value={formData.meal_count}
                onChange={(e) => setFormData({ ...formData, meal_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 meals</option>
                <option value={4}>4 meals</option>
                <option value={5}>5 meals</option>
                <option value={6}>6 meals</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button onClick={handleNext} disabled={!isStepValid()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!isStepValid() || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}