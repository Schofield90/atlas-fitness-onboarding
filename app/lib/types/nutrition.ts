// Types for nutrition system

export interface Ingredient {
  id?: string
  meal_id?: string
  item: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id?: string
  meal_plan_id?: string
  day: number // 1-28
  name: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  recipe: string
  prep_minutes: number
  ingredients: Ingredient[]
  created_at?: string
  updated_at?: string
}

export interface MealPlan {
  id?: string
  user_id: string
  organization_id: string
  weeks: number // 1-4
  days: number // 7, 14, 21, 28
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fat: number
  target_fiber: number
  meals?: Meal[]
  created_at?: string
  updated_at?: string
}

export interface ShoppingListItem {
  id?: string
  user_id: string
  organization_id: string
  ingredient: string
  quantity: number
  unit: string
  category: string
  week: number // 1-4
  purchased: boolean
  created_at?: string
}

export interface BodyMetrics {
  id?: string
  user_id: string
  organization_id: string
  date: string
  weight?: number
  body_fat_percentage?: number
  muscle_mass?: number
  visceral_fat?: number
  metabolic_age?: number
  body_water_percentage?: number
  bone_mass?: number
  bmr?: number // Basal Metabolic Rate
  inbody_scan_id?: string // For InBody integration
  notes?: string
  created_at?: string
  updated_at?: string
}