import { NutritionProfile } from '@/app/api/nutrition/profile/route'

export interface MacroPlan {
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
}

interface ActivityMultipliers {
  [key: string]: number
}

const ACTIVITY_MULTIPLIERS: ActivityMultipliers = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTREMELY_ACTIVE: 1.9,
}

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor Equation
 * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
 */
function calculateBMR(profile: NutritionProfile): number {
  const { current_weight, height, age, sex } = profile
  
  const baseBMR = 10 * current_weight + 6.25 * height - 5 * age
  
  if (sex === 'MALE') {
    return baseBMR + 5
  } else {
    return baseBMR - 161
  }
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE)
 */
function calculateTDEE(bmr: number, activityLevel: string, trainingFrequency: number): number {
  const baseMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55
  
  // Adjust for additional training frequency beyond activity level
  const trainingAdjustment = Math.max(0, (trainingFrequency - 3) * 0.05)
  
  return bmr * (baseMultiplier + trainingAdjustment)
}

/**
 * Calculates goal calories based on weight goal
 */
function calculateGoalCalories(tdee: number, currentWeight: number, goalWeight: number): number {
  const weightDifference = goalWeight - currentWeight
  
  // Weight loss: create caloric deficit
  if (weightDifference < 0) {
    const deficitRate = Math.min(Math.abs(weightDifference) * 10, 500) // Max 500 cal deficit
    return Math.round(tdee - deficitRate)
  }
  
  // Weight gain: create caloric surplus
  if (weightDifference > 0) {
    const surplusRate = Math.min(weightDifference * 5, 300) // Max 300 cal surplus
    return Math.round(tdee + surplusRate)
  }
  
  // Maintenance
  return Math.round(tdee)
}

/**
 * Calculates Lean Body Mass using Boer Formula
 * Men: LBM = (0.407 × weight) + (0.267 × height) - 19.2
 * Women: LBM = (0.252 × weight) + (0.473 × height) - 48.3
 */
function calculateLeanBodyMass(profile: NutritionProfile): number {
  const { current_weight, height, sex } = profile
  
  if (sex === 'MALE') {
    return (0.407 * current_weight) + (0.267 * height) - 19.2
  } else {
    return (0.252 * current_weight) + (0.473 * height) - 48.3
  }
}

/**
 * Main function to compute macro targets for a user profile
 */
export function computeMacros(profile: NutritionProfile): MacroPlan {
  // Calculate BMR and TDEE
  const bmr = calculateBMR(profile)
  const tdee = calculateTDEE(bmr, profile.activity_level, profile.training_frequency)
  const goalCalories = calculateGoalCalories(tdee, profile.current_weight, profile.goal_weight)
  
  // Calculate lean body mass for protein calculation
  const leanBodyMass = calculateLeanBodyMass(profile)
  
  // Protein: 2g per kg of lean body mass (minimum 1.6g per kg body weight)
  const proteinFromLBM = leanBodyMass * 2
  const proteinFromBodyWeight = profile.current_weight * 1.6
  const protein = Math.max(proteinFromLBM, proteinFromBodyWeight)
  
  // Fat: 0.9g per kg of body weight (minimum 20% of calories, maximum 35%)
  const fatFromBodyWeight = profile.current_weight * 0.9
  const fatMinFromCalories = (goalCalories * 0.20) / 9 // 20% of calories
  const fatMaxFromCalories = (goalCalories * 0.35) / 9 // 35% of calories
  const fat = Math.max(fatFromBodyWeight, fatMinFromCalories)
  const fatClamped = Math.min(fat, fatMaxFromCalories)
  
  // Carbs: remaining calories after protein and fat
  const proteinCalories = protein * 4
  const fatCalories = fatClamped * 9
  const remainingCalories = goalCalories - proteinCalories - fatCalories
  const carbs = Math.max(remainingCalories / 4, 50) // Minimum 50g carbs
  
  // Fiber: 14g per 1000 calories (recommended by dietary guidelines)
  const fiber = (goalCalories / 1000) * 14
  
  return {
    calories: Math.round(goalCalories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fatClamped),
    fiber: Math.round(fiber),
  }
}

/**
 * Validates if a profile has all required fields for macro calculation
 */
export function validateProfileForMacros(profile: Partial<NutritionProfile>): boolean {
  const required = ['age', 'sex', 'height', 'current_weight', 'goal_weight', 'activity_level', 'training_frequency']
  return required.every(field => profile[field as keyof NutritionProfile] !== undefined && profile[field as keyof NutritionProfile] !== null)
}

/**
 * Gets activity level recommendations based on training frequency
 */
export function getActivityLevelRecommendation(trainingFrequency: number): string {
  if (trainingFrequency <= 1) return 'SEDENTARY'
  if (trainingFrequency <= 3) return 'LIGHTLY_ACTIVE'
  if (trainingFrequency <= 5) return 'MODERATELY_ACTIVE'
  if (trainingFrequency <= 7) return 'VERY_ACTIVE'
  return 'EXTREMELY_ACTIVE'
}