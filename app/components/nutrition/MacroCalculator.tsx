'use client'

import { useEffect, useState } from 'react'
import { Target, TrendingUp, Activity, Award } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface MacroCalculatorProps {
  profile: any
}

export default function MacroCalculator({ profile }: MacroCalculatorProps) {
  const [macros, setMacros] = useState({
    calories: profile?.daily_calories || profile?.target_calories || 0,
    protein: profile?.protein_grams || profile?.target_protein || 0,
    carbs: profile?.carbs_grams || profile?.target_carbs || 0,
    fat: profile?.fat_grams || profile?.target_fat || 0
  })
  const [latestBodyMetric, setLatestBodyMetric] = useState<any>(null)
  const [actualTrainingFrequency, setActualTrainingFrequency] = useState<number>(0)
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      fetchLatestBodyMetric()
      fetchTrainingFrequency()
    }
  }, [profile])

  const fetchLatestBodyMetric = async () => {
    try {
      const { data, error } = await supabase
        .from('nutrition_body_metrics')
        .select('*')
        .eq('profile_id', profile.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .single()

      if (data && !error) {
        setLatestBodyMetric(data)
        
        // If we have InBody BMR, recalculate macros using it
        if (data.basal_metabolic_rate) {
          recalculateWithInBodyData(data)
        }
      }
    } catch (error) {
      console.error('Error fetching body metrics:', error)
    }
  }

  const fetchTrainingFrequency = async () => {
    try {
      // Get training sessions from the last 4 weeks
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

      const { data, error } = await supabase
        .from('nutrition_training_sessions')
        .select('id')
        .eq('profile_id', profile.id)
        .gte('session_date', fourWeeksAgo.toISOString())

      if (data && !error) {
        // Calculate average sessions per week
        const avgPerWeek = Math.round(data.length / 4)
        setActualTrainingFrequency(avgPerWeek)
      }
    } catch (error) {
      console.error('Error fetching training frequency:', error)
    }
  }

  const recalculateWithInBodyData = (bodyMetric: any) => {
    // Use InBody BMR if available
    const bmr = bodyMetric.basal_metabolic_rate || profile.bmr
    
    // Use actual training frequency if we have it
    const trainingFreq = actualTrainingFrequency || profile.training_frequency || 0
    
    // Calculate TDEE with more accurate data
    let activityMultiplier = 1.2 // Sedentary base
    
    if (trainingFreq >= 6) activityMultiplier = 1.725 // Very Active
    else if (trainingFreq >= 4) activityMultiplier = 1.55 // Moderately Active
    else if (trainingFreq >= 2) activityMultiplier = 1.375 // Lightly Active
    
    const tdee = Math.round(bmr * activityMultiplier)
    
    // Adjust calories based on goal
    let targetCalories = tdee
    if (profile.goal === 'weight_loss') targetCalories = Math.round(tdee * 0.85)
    else if (profile.goal === 'muscle_gain') targetCalories = Math.round(tdee * 1.1)
    
    // Calculate macros based on body composition
    const leanMass = bodyMetric.lean_body_mass || (bodyMetric.weight * (1 - (bodyMetric.body_fat_percentage || 20) / 100))
    
    // Protein: 2.2g per kg of lean mass for active individuals
    const proteinGrams = Math.round(leanMass * 2.2)
    
    // Fat: 25-30% of calories
    const fatCalories = targetCalories * 0.275
    const fatGrams = Math.round(fatCalories / 9)
    
    // Carbs: Fill the rest
    const carbCalories = targetCalories - (proteinGrams * 4) - (fatGrams * 9)
    const carbGrams = Math.round(carbCalories / 4)
    
    setMacros({
      calories: targetCalories,
      protein: proteinGrams,
      carbs: carbGrams,
      fat: fatGrams
    })
  }

  // Calculate percentages
  const totalCalories = macros.calories
  const proteinCalories = macros.protein * 4
  const carbsCalories = macros.carbs * 4
  const fatCalories = macros.fat * 9

  const proteinPercentage = totalCalories > 0 ? Math.round((proteinCalories / totalCalories) * 100) : 0
  const carbsPercentage = totalCalories > 0 ? Math.round((carbsCalories / totalCalories) * 100) : 0
  const fatPercentage = totalCalories > 0 ? Math.round((fatCalories / totalCalories) * 100) : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Daily Macro Targets</h3>
          {latestBodyMetric && latestBodyMetric.device_type === 'INBODY' && (
            <div className="flex items-center mt-1">
              <Award className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-xs text-blue-600">Personalized with InBody scan data</span>
            </div>
          )}
        </div>
        <Target className="h-5 w-5 text-gray-400" />
      </div>

      {/* Total Calories */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500 mb-1">Daily Calorie Target</p>
        <p className="text-4xl font-bold text-gray-900">{macros.calories.toLocaleString()}</p>
        <p className="text-sm text-gray-600 mt-1">calories/day</p>
      </div>

      {/* Macro Breakdown */}
      <div className="space-y-4">
        {/* Protein */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="font-medium">Protein</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{macros.protein}g</span>
              <span className="text-sm text-gray-500 ml-2">({proteinPercentage}%)</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${proteinPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{proteinCalories} calories</p>
        </div>

        {/* Carbs */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">Carbohydrates</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{macros.carbs}g</span>
              <span className="text-sm text-gray-500 ml-2">({carbsPercentage}%)</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${carbsPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{carbsCalories} calories</p>
        </div>

        {/* Fat */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="font-medium">Fat</span>
            </div>
            <div className="text-right">
              <span className="font-semibold">{macros.fat}g</span>
              <span className="text-sm text-gray-500 ml-2">({fatPercentage}%)</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${fatPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{fatCalories} calories</p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Per Meal</p>
            <p className="font-semibold">{Math.round(macros.calories / (profile?.meal_count || 3))}</p>
            <p className="text-xs text-gray-600">calories</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Activity</p>
            {actualTrainingFrequency > 0 ? (
              <>
                <p className="font-semibold">{actualTrainingFrequency}x/week</p>
                <p className="text-xs text-gray-600">actual</p>
              </>
            ) : (
              <>
                <p className="font-semibold capitalize">{profile?.activity_level?.replace('_', ' ') || 'N/A'}</p>
                <p className="text-xs text-gray-600">estimated</p>
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Goal</p>
            <p className="font-semibold capitalize">{profile?.goal?.replace('_', ' ') || 'N/A'}</p>
            <p className="text-xs text-gray-600">target</p>
          </div>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="mt-6">
        <div className="flex justify-center">
          <div className="relative w-40 h-40">
            <svg className="transform -rotate-90 w-40 h-40">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="20"
                fill="none"
                className="text-gray-200"
              />
              {/* Protein */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="20"
                fill="none"
                strokeDasharray={`${(proteinPercentage / 100) * 440} 440`}
                strokeDashoffset="0"
                className="text-blue-500"
              />
              {/* Carbs */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="20"
                fill="none"
                strokeDasharray={`${(carbsPercentage / 100) * 440} 440`}
                strokeDashoffset={`-${(proteinPercentage / 100) * 440}`}
                className="text-green-500"
              />
              {/* Fat */}
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="20"
                fill="none"
                strokeDasharray={`${(fatPercentage / 100) * 440} 440`}
                strokeDashoffset={`-${((proteinPercentage + carbsPercentage) / 100) * 440}`}
                className="text-yellow-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">{macros.calories}</p>
                <p className="text-xs text-gray-500">cal/day</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}