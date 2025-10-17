import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'

interface NutritionProfile {
  id: string
  client_id: string
  organization_id: string
  activity_level: string
  goal: string
  dietary_preferences: string[]
  allergies?: string[]
  food_likes?: string[]
  food_dislikes?: string[]
  cooking_time?: string
  budget_constraint?: string
  meal_count: number
  target_calories?: number
  target_protein?: number
  target_carbs?: number
  target_fat?: number
  target_fiber?: number
  daily_calories?: number
  protein_grams?: number
  created_at: string
  updated_at: string
}

interface MealPlan {
  id: string
  user_id: string
  organization_id: string
  weeks: number
  days: number
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fat: number
  target_fiber: number
  created_at: string
  meals?: Meal[]
}

interface Meal {
  id: string
  meal_plan_id: string
  day: number
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  recipe: string
  prep_minutes: number
  created_at: string
  updated_at: string
  ingredients?: Ingredient[]
}

interface Ingredient {
  id: string
  meal_id: string
  item: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface ShoppingListItem {
  id: string
  user_id: string
  organization_id: string
  ingredient: string
  quantity: number
  unit: string
  category: string
  week: number
  purchased: boolean
  created_at: string
}

interface UseNutritionDataReturn {
  profile: NutritionProfile | null
  mealPlan: MealPlan | null
  shoppingList: ShoppingListItem[]
  loading: boolean
  error: string | null
  
  // Actions
  refreshProfile: () => Promise<void>
  refreshMealPlan: () => Promise<void>
  refreshShoppingList: (week?: number) => Promise<void>
  generateMealPlan: (weeks?: number) => Promise<void>
  regenerateMeal: (mealId: string, constraints?: string) => Promise<void>
  toggleShoppingItem: (itemId: string, purchased: boolean) => Promise<void>
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'user_id' | 'organization_id' | 'created_at'>) => Promise<void>
  removeShoppingItem: (itemId: string) => Promise<void>
  clearPurchasedItems: (week?: number) => Promise<void>
}

export function useNutritionData(clientId: string): UseNutritionDataReturn {
  const [profile, setProfile] = useState<NutritionProfile | null>(null)
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentWeek, setCurrentWeek] = useState(1)
  
  const supabase = createClient()

  // Fetch nutrition profile
  const refreshProfile = useCallback(async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setProfile(data)
    } catch (err: any) {
      console.error('Error fetching nutrition profile:', err)
      setError(err.message || 'Failed to fetch nutrition profile')
    }
  }, [clientId, supabase])

  // Fetch meal plan
  const refreshMealPlan = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/nutrition/meal-plans?include_meals=true')
      
      if (!response.ok) {
        if (response.status === 404) {
          setMealPlan(null)
          return
        }
        throw new Error('Failed to fetch meal plan')
      }

      const data = await response.json()
      if (data.success && data.data && data.data.length > 0) {
        setMealPlan(data.data[0]) // Get the most recent meal plan
      } else {
        setMealPlan(null)
      }
    } catch (err: any) {
      console.error('Error fetching meal plan:', err)
      setError(err.message || 'Failed to fetch meal plan')
    }
  }, [])

  // Fetch shopping list
  const refreshShoppingList = useCallback(async (week: number = currentWeek) => {
    try {
      setError(null)
      const response = await fetch(`/api/nutrition/shopping-list?week=${week}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch shopping list')
      }

      const data = await response.json()
      if (data.success && data.data) {
        setShoppingList(data.data.items || [])
        setCurrentWeek(week)
      }
    } catch (err: any) {
      console.error('Error fetching shopping list:', err)
      setError(err.message || 'Failed to fetch shopping list')
    }
  }, [currentWeek])

  // Generate meal plan
  const generateMealPlan = useCallback(async (weeks: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/nutrition/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks, regenerate: true })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate meal plan')
      }

      // Refresh both meal plan and shopping list after generation
      await Promise.all([
        refreshMealPlan(),
        refreshShoppingList(1)
      ])
    } catch (err: any) {
      console.error('Error generating meal plan:', err)
      setError(err.message || 'Failed to generate meal plan')
    } finally {
      setLoading(false)
    }
  }, [refreshMealPlan, refreshShoppingList])

  // Regenerate a specific meal
  const regenerateMeal = useCallback(async (mealId: string, constraints?: string) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/nutrition/meals/${mealId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ constraints })
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate meal')
      }

      // Refresh meal plan to get updated meal
      await refreshMealPlan()
    } catch (err: any) {
      console.error('Error regenerating meal:', err)
      setError(err.message || 'Failed to regenerate meal')
    }
  }, [refreshMealPlan])

  // Toggle shopping item purchased status
  const toggleShoppingItem = useCallback(async (itemId: string, purchased: boolean) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/nutrition/shopping-list/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchased })
      })

      if (!response.ok) {
        throw new Error('Failed to update shopping item')
      }

      // Update local state optimistically
      setShoppingList(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, purchased } : item
        )
      )
    } catch (err: any) {
      console.error('Error updating shopping item:', err)
      setError(err.message || 'Failed to update shopping item')
      // Refresh on error to restore correct state
      refreshShoppingList(currentWeek)
    }
  }, [currentWeek, refreshShoppingList])

  // Add custom shopping item
  const addShoppingItem = useCallback(async (item: Omit<ShoppingListItem, 'id' | 'user_id' | 'organization_id' | 'created_at'>) => {
    try {
      setError(null)
      
      const response = await fetch('/api/nutrition/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, week: currentWeek })
      })

      if (!response.ok) {
        throw new Error('Failed to add shopping item')
      }

      // Refresh shopping list to get new item
      await refreshShoppingList(currentWeek)
    } catch (err: any) {
      console.error('Error adding shopping item:', err)
      setError(err.message || 'Failed to add shopping item')
    }
  }, [currentWeek, refreshShoppingList])

  // Remove shopping item
  const removeShoppingItem = useCallback(async (itemId: string) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/nutrition/shopping-list/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to remove shopping item')
      }

      // Update local state optimistically
      setShoppingList(prev => prev.filter(item => item.id !== itemId))
    } catch (err: any) {
      console.error('Error removing shopping item:', err)
      setError(err.message || 'Failed to remove shopping item')
      // Refresh on error to restore correct state
      refreshShoppingList(currentWeek)
    }
  }, [currentWeek, refreshShoppingList])

  // Clear purchased items
  const clearPurchasedItems = useCallback(async (week: number = currentWeek) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/nutrition/shopping-list?week=${week}&clear_purchased=true`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to clear purchased items')
      }

      // Refresh shopping list
      await refreshShoppingList(week)
    } catch (err: any) {
      console.error('Error clearing purchased items:', err)
      setError(err.message || 'Failed to clear purchased items')
    }
  }, [currentWeek, refreshShoppingList])

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      await Promise.all([
        refreshProfile(),
        refreshMealPlan(),
        refreshShoppingList(1)
      ])
      setLoading(false)
    }

    if (clientId) {
      fetchInitialData()
    }
  }, [clientId, refreshProfile, refreshMealPlan, refreshShoppingList])

  return {
    profile,
    mealPlan,
    shoppingList,
    loading,
    error,
    refreshProfile,
    refreshMealPlan,
    refreshShoppingList,
    generateMealPlan,
    regenerateMeal,
    toggleShoppingItem,
    addShoppingItem,
    removeShoppingItem,
    clearPurchasedItems
  }
}