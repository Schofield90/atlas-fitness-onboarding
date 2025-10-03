'use client'

import { useState, useEffect } from 'react'
import Button from '@/app/components/ui/Button'
import MealCard from './MealCard'
import { Calendar, RefreshCw, Download, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

interface MealPlanProps {
  profile: any
  mealPlan: any
  loading: boolean
  onRegenerate: () => Promise<void>
  onRegenerateMeal: (mealId: string, constraints?: string) => Promise<void>
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MealPlan({ profile, mealPlan, loading, onRegenerate, onRegenerateMeal }: MealPlanProps) {
  const [currentWeek, setCurrentWeek] = useState(0) // 0 = current week, 1 = next week, etc.
  const [regenerating, setRegenerating] = useState(false)
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null)

  // Organize meals by day
  const getMealsByDay = () => {
    if (!mealPlan || !mealPlan.meals) return {}
    
    const mealsByDay: any = {}
    
    // Initialize all days
    for (let i = 1; i <= (mealPlan.days || 7); i++) {
      const dayIndex = ((i - 1) % 7)
      const dayName = DAYS_OF_WEEK[dayIndex]
      if (!mealsByDay[dayName]) {
        mealsByDay[dayName] = {}
      }
    }
    
    // Group meals by day
    mealPlan.meals.forEach((meal: any) => {
      const dayIndex = ((meal.day - 1) % 7)
      const dayName = DAYS_OF_WEEK[dayIndex]
      const mealType = meal.name.toLowerCase()
      
      if (!mealsByDay[dayName]) {
        mealsByDay[dayName] = {}
      }
      
      mealsByDay[dayName][mealType] = {
        ...meal,
        ingredients: meal.ingredients || []
      }
    })
    
    return mealsByDay
  }

  const regenerateMealPlan = async () => {
    setRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setRegenerating(false)
    }
  }

  const swapMeal = async (mealId: string) => {
    setRegeneratingMeal(mealId)
    try {
      await onRegenerateMeal(mealId)
    } finally {
      setRegeneratingMeal(null)
    }
  }

  const downloadMealPlan = () => {
    // In production, this would generate a PDF or CSV
    alert('Meal plan download feature coming soon!')
  }

  const calculateDayTotals = (dayMeals: any) => {
    if (!dayMeals) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    
    return Object.values(dayMeals).reduce((totals: any, meal: any) => ({
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.protein || 0),
      carbs: totals.carbs + (meal.carbs || 0),
      fat: totals.fat + (meal.fat || 0),
      fiber: totals.fiber + (meal.fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  }

  const getWeekDateRange = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7)) // Monday
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday
    
    const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meal plan...</p>
        </div>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Meal Plan Found</h3>
        <p className="text-gray-600 mb-4">You don't have a meal plan yet. Generate one to get started!</p>
      </div>
    )
  }

  const mealsByDay = getMealsByDay()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Weekly Meal Plan</h3>
          <p className="text-sm text-gray-600 mt-1">{getWeekDateRange()}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
            disabled={currentWeek === 0 || !mealPlan || mealPlan.weeks <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(currentWeek + 1)}
            disabled={!mealPlan || currentWeek >= mealPlan.weeks - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={regenerateMealPlan}
            disabled={regenerating || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button
            variant="outline"
            onClick={downloadMealPlan}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Meal Plan Grid */}
      <div className="space-y-6">
        {DAYS_OF_WEEK.map(day => {
          const dayMeals = mealsByDay[day] || {}
          const dayTotals = calculateDayTotals(dayMeals)
          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day && currentWeek === 0
          const hasMeals = Object.keys(dayMeals).length > 0
          
          return (
            <div key={day} className={`border rounded-lg p-6 ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold flex items-center">
                  {day}
                  {isToday && <span className="ml-2 text-sm bg-blue-600 text-white px-2 py-1 rounded">Today</span>}
                </h4>
                <div className="text-sm text-gray-600">
                  {dayTotals.calories} cal | {dayTotals.protein}g protein | {dayTotals.carbs}g carbs | {dayTotals.fat}g fat
                </div>
              </div>
              
              {hasMeals ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(dayMeals).map(([mealType, meal]: [string, any]) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      mealType={mealType}
                      onSwap={() => swapMeal(meal.id)}
                      isSwapping={regeneratingMeal === meal.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No meals planned for this day</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Weekly Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-semibold mb-4">Weekly Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Target Daily Calories</p>
            <p className="text-2xl font-bold">{mealPlan?.target_calories || profile?.target_calories || profile?.daily_calories || 2500}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Target Daily Protein</p>
            <p className="text-2xl font-bold">{mealPlan?.target_protein || profile?.target_protein || profile?.protein_grams || 150}g</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Meals</p>
            <p className="text-2xl font-bold">{mealPlan?.meals?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Plan Duration</p>
            <p className="text-2xl font-bold">{mealPlan?.weeks || 1} week{mealPlan?.weeks > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  )
}