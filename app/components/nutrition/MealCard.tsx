'use client'

import { RefreshCw, Info, Clock } from 'lucide-react'
import Button from '@/app/components/ui/Button'

interface MealCardProps {
  meal: {
    id: string
    name: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    prep_minutes?: number
    recipe?: string
    ingredients: Array<{
      id: string
      item: string
      grams: number
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
    }>
  }
  mealType: string
  onSwap: () => void
  isSwapping?: boolean
}

export default function MealCard({ meal, mealType, onSwap, isSwapping = false }: MealCardProps) {
  const getMealIcon = () => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return '🍳'
      case 'lunch':
        return '🥗'
      case 'dinner':
        return '🍽️'
      case 'snack':
        return '🍎'
      default:
        return '🍴'
    }
  }

  const getMealDisplayName = () => {
    // If the meal name is just BREAKFAST, LUNCH, etc., return a more descriptive name
    if (meal.name === mealType.toUpperCase()) {
      // Try to extract a meaningful name from the recipe or ingredients
      if (meal.recipe) {
        const firstLine = meal.recipe.split('\n')[0]
        if (firstLine.length < 50) {
          return firstLine
        }
      }
      if (meal.ingredients && meal.ingredients.length > 0) {
        const mainIngredient = meal.ingredients.reduce((prev, current) => 
          current.grams > prev.grams ? current : prev
        )
        return `${mainIngredient.item} ${mealType.charAt(0).toUpperCase() + mealType.slice(1).toLowerCase()}`
      }
    }
    return meal.name
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{getMealIcon()}</span>
          <div>
            <h5 className="font-semibold capitalize">{mealType}</h5>
            <p className="text-sm text-gray-600">{meal.calories} cal</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSwap}
          disabled={isSwapping}
          className="p-1"
          title="Swap meal"
        >
          <RefreshCw className={`h-4 w-4 ${isSwapping ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <h6 className="font-medium mb-2 text-sm">{getMealDisplayName()}</h6>

      {/* Macro breakdown */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Protein</span>
          <span className="font-medium">{meal.protein}g</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Carbs</span>
          <span className="font-medium">{meal.carbs}g</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Fat</span>
          <span className="font-medium">{meal.fat}g</span>
        </div>
        {meal.fiber !== undefined && meal.fiber > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Fiber</span>
            <span className="font-medium">{meal.fiber}g</span>
          </div>
        )}
      </div>

      {/* Macro bar visualization */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3">
        <div 
          className="bg-blue-500" 
          style={{ width: `${(meal.protein * 4 / meal.calories) * 100}%` }}
          title={`Protein: ${Math.round((meal.protein * 4 / meal.calories) * 100)}%`}
        />
        <div 
          className="bg-green-500" 
          style={{ width: `${(meal.carbs * 4 / meal.calories) * 100}%` }}
          title={`Carbs: ${Math.round((meal.carbs * 4 / meal.calories) * 100)}%`}
        />
        <div 
          className="bg-yellow-500" 
          style={{ width: `${(meal.fat * 9 / meal.calories) * 100}%` }}
          title={`Fat: ${Math.round((meal.fat * 9 / meal.calories) * 100)}%`}
        />
      </div>

      {/* Prep time */}
      {meal.prep_minutes && (
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <Clock className="h-3 w-3 mr-1" />
          {meal.prep_minutes} min prep
        </div>
      )}

      {/* Ingredients */}
      <details className="cursor-pointer">
        <summary className="text-xs text-gray-500 hover:text-gray-700 flex items-center">
          <Info className="h-3 w-3 mr-1" />
          Ingredients ({meal.ingredients?.length || 0})
        </summary>
        <ul className="mt-2 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
          {meal.ingredients?.map((ingredient) => (
            <li key={ingredient.id} className="flex items-start">
              <span className="mr-1">•</span>
              <span>
                {ingredient.item} 
                <span className="text-gray-400">({ingredient.grams}g)</span>
              </span>
            </li>
          )) || <li className="text-gray-400">No ingredients listed</li>}
        </ul>
      </details>
    </div>
  )
}