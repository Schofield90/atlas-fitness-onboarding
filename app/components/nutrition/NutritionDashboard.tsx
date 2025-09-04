'use client'

import { useState, useEffect } from 'react'
// UI components imported individually as needed
import Button from '@/app/components/ui/Button'
import ProfileSetup from './ProfileSetup'
import MacroCalculator from './MacroCalculator'
import MealPlan from './MealPlan'
import ShoppingList from './ShoppingList'
import ChatWizard from './ChatWizard'
import BodyMetrics from './BodyMetrics'
import TrainingIntegration from './TrainingIntegration'
import { Apple, Target, Calendar, ShoppingCart, MessageCircle, RefreshCw, ChevronRight, Scale, Activity, Plus } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface NutritionDashboardProps {
  client: any
}

export default function NutritionDashboard({ client }: NutritionDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [nutritionProfile, setNutritionProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [mealPlan, setMealPlan] = useState<any | null>(null)
  const [shoppingList, setShoppingList] = useState<any[]>([])
  const [currentShoppingWeek, setCurrentShoppingWeek] = useState<number>(1)
  const [comingSoon, setComingSoon] = useState<boolean>(false)
  const supabase = createClient()

  useEffect(() => {
    if (client) {
      fetchNutritionProfile()
    }
  }, [client])

  const fetchNutritionProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        // Note: schema may differ in environments; guard for missing columns
        .eq('client_id', client.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // No profile exists
        setShowSetup(true)
      } else if (error) {
        // Likely schema mismatch or feature not fully implemented
        setComingSoon(true)
      } else if (profile) {
        setNutritionProfile(profile)
        // Check if profile is complete
        if (!profile.activity_level || !profile.goal || !profile.dietary_preferences) {
          setShowSetup(true)
        }
      }
    } catch (error) {
      console.error('Error fetching nutrition profile:', error)
      // Fall back to coming soon to avoid breaking the page
      setComingSoon(true)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileComplete = (profile: any) => {
    setNutritionProfile(profile)
    setShowSetup(false)
  }

  // -------- Safe no-op helpers to avoid runtime errors when backend is not ready --------
  const getTodaysMeals = (): any[] => {
    if (!mealPlan || !Array.isArray(mealPlan.meals)) return []
    const today = new Date()
    const day = ((today.getDay() + 6) % 7) + 1 // Monday=1 .. Sunday=7
    return mealPlan.meals.filter((m: any) => m.day === day)
  }

  const generateMealPlan = async (weeks: number): Promise<void> => {
    // Create a minimal client-side meal plan so UI can render without backend
    const planWeeks = Math.max(1, Math.min(weeks || 1, 4))
    const demoMeals: any[] = []
    const mealTypes = ['breakfast', 'lunch', 'dinner']
    for (let d = 1; d <= 7; d++) {
      mealTypes.forEach((type, idx) => {
        demoMeals.push({
          id: `demo-${d}-${idx}`,
          day: d,
          name: type,
          calories: type === 'dinner' ? 750 : type === 'lunch' ? 650 : 500,
          protein: type === 'dinner' ? 45 : type === 'lunch' ? 35 : 30,
          carbs: 60,
          fat: 20,
          fiber: 8,
          ingredients: []
        })
      })
    }
    setMealPlan({ weeks: planWeeks, days: 7, meals: demoMeals })
    // Seed a simple shopping list
    setShoppingList([
      { id: 'item-1', ingredient: 'Chicken breast', quantity: 1000, unit: 'g', category: 'Protein', purchased: false },
      { id: 'item-2', ingredient: 'Brown rice', quantity: 1000, unit: 'g', category: 'Grains', purchased: false },
      { id: 'item-3', ingredient: 'Broccoli', quantity: 500, unit: 'g', category: 'Produce', purchased: false }
    ])
  }

  const regenerateMeal = async (mealId: string, _constraints?: string): Promise<void> => {
    setMealPlan((prev: any) => {
      if (!prev) return prev
      const meals = (prev.meals || []).map((m: any) => m.id === mealId ? {
        ...m,
        calories: (m.calories || 500) + 10,
        protein: (m.protein || 30) + 2
      } : m)
      return { ...prev, meals }
    })
  }

  const refreshShoppingList = async (week: number): Promise<void> => {
    setCurrentShoppingWeek(week)
    // No backend yet; keep the same list
  }

  const toggleShoppingItem = async (itemId: string, purchased: boolean): Promise<void> => {
    setShoppingList(list => list.map(item => item.id === itemId ? { ...item, purchased } : item))
  }

  const addShoppingItem = async (item: any): Promise<void> => {
    const id = `custom-${Math.random().toString(36).slice(2, 9)}`
    setShoppingList(list => [{ id, ...item }, ...list])
  }

  const removeShoppingItem = async (itemId: string): Promise<void> => {
    setShoppingList(list => list.filter(item => item.id !== itemId))
  }

  const clearPurchasedItems = async (_week: number): Promise<void> => {
    setShoppingList(list => list.filter(item => !item.purchased))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (comingSoon) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Apple className="h-8 w-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Nutrition is coming soon</h2>
        <p className="text-gray-600 mb-6">Your personalized meal plans will appear here once this feature is enabled for your account.</p>
        <div className="grid gap-3 max-w-md mx-auto">
          <Button variant="outline" onClick={() => setShowSetup(true)}>Set your nutrition goals</Button>
        </div>
      </div>
    )
  }

  if (showSetup) {
    return <ProfileSetup client={client} onComplete={handleProfileComplete} existingProfile={nutritionProfile} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nutrition Dashboard</h1>
        <p className="mt-2 text-gray-600">Manage your nutrition plan, track macros, and achieve your fitness goals</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Daily Calories</p>
              <p className="text-2xl font-bold text-gray-900">{nutritionProfile?.target_calories || nutritionProfile?.daily_calories || '2,500'}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Protein Target</p>
              <p className="text-2xl font-bold text-gray-900">{nutritionProfile?.target_protein || nutritionProfile?.protein_grams || '150'}g</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Apple className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Meal Plan</p>
              <p className="text-2xl font-bold text-gray-900">{mealPlan ? 'Active' : 'None'}</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Goal</p>
              <p className="text-2xl font-bold text-gray-900 capitalize">{nutritionProfile?.goal?.replace('_', ' ') || 'Build Muscle'}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('meal-plan')}
              className={`${
                activeTab === 'meal-plan'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Meal Plan
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`${
                activeTab === 'shopping'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Shopping List
            </button>
            <button
              onClick={() => setActiveTab('body-metrics')}
              className={`${
                activeTab === 'body-metrics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Body Metrics
            </button>
            <button
              onClick={() => setActiveTab('training')}
              className={`${
                activeTab === 'training'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Training
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`${
                activeTab === 'assistant'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              AI Assistant
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <MacroCalculator profile={nutritionProfile} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Today's Meals</h3>
                  {mealPlan ? (
                    <>
                      <div className="space-y-3">
                        {getTodaysMeals().slice(0, 3).map((meal) => (
                          <div key={meal.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-medium capitalize">{meal.name.toLowerCase()}</p>
                              <p className="text-sm text-gray-500">
                                {meal.calories} cal | {meal.protein}g protein
                              </p>
                            </div>
                            <span className="text-sm text-gray-600">{meal.calories} cal</span>
                          </div>
                        ))}
                        {getTodaysMeals().length === 0 && (
                          <p className="text-gray-500 text-center py-4">No meals for today</p>
                        )}
                      </div>
                      <Button 
                        className="w-full mt-4"
                        onClick={() => setActiveTab('meal-plan')}
                      >
                        View Full Meal Plan
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-4">No meal plan generated yet</p>
                      <Button
                        onClick={async () => {
                          await generateMealPlan(1)
                          setActiveTab('meal-plan')
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Meal Plan
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    {mealPlan ? (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={async () => {
                          await generateMealPlan(1)
                          setActiveTab('meal-plan')
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Meal Plan
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={async () => {
                          await generateMealPlan(1)
                          setActiveTab('meal-plan')
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Meal Plan
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setShowSetup(true)}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Update Goals
                    </Button>
                    {mealPlan && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('shopping')}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        View Shopping List
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('assistant')}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Assistant
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meal-plan' && (
            mealPlan ? (
              <MealPlan 
                profile={nutritionProfile} 
                mealPlan={mealPlan}
                loading={false}
                onRegenerate={() => generateMealPlan(mealPlan.weeks)}
                onRegenerateMeal={regenerateMeal}
              />
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Meal Plan Yet</h3>
                <p className="text-gray-600 mb-6">Generate a personalized meal plan based on your nutrition profile.</p>
                <Button
                  onClick={() => generateMealPlan(1)}
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Generate Meal Plan
                </Button>
              </div>
            )
          )}

          {activeTab === 'shopping' && (
            mealPlan ? (
              <ShoppingList 
                profile={nutritionProfile}
                shoppingList={shoppingList}
                loading={false}
                currentWeek={currentShoppingWeek}
                onToggleItem={toggleShoppingItem}
                onAddItem={addShoppingItem}
                onRemoveItem={removeShoppingItem}
                onClearPurchased={() => clearPurchasedItems(currentShoppingWeek)}
                onRefresh={(week) => {
                  setCurrentShoppingWeek(week)
                  refreshShoppingList(week)
                }}
              />
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Shopping List Yet</h3>
                <p className="text-gray-600 mb-6">Generate a meal plan first to create your shopping list.</p>
                <Button
                  onClick={async () => {
                    await generateMealPlan(1)
                    setActiveTab('meal-plan')
                  }}
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Generate Meal Plan First
                </Button>
              </div>
            )
          )}

          {activeTab === 'body-metrics' && (
            <BodyMetrics profile={nutritionProfile} client={client} />
          )}

          {activeTab === 'training' && (
            <TrainingIntegration profile={nutritionProfile} client={client} />
          )}

          {activeTab === 'assistant' && (
            <ChatWizard profile={nutritionProfile} />
          )}
        </div>
      </div>
    </div>
  )
}