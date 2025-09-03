'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Target, 
  Utensils, 
  Activity, 
  Calculator, 
  ChefHat, 
  Clock,
  Users,
  Zap,
  Apple,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface MacroTargets {
  protein: number
  carbs: number
  fats: number
  calories: number
}

interface UserProfile {
  age: number
  gender: 'male' | 'female'
  weight: number
  height: number
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'gain_muscle'
  dietaryRestrictions: string[]
  allergies: string[]
}

interface MealPlan {
  id: string
  name: string
  meals: {
    breakfast: MealItem[]
    lunch: MealItem[]
    dinner: MealItem[]
    snacks: MealItem[]
  }
  totalMacros: MacroTargets
  createdAt: string
}

interface MealItem {
  id: string
  name: string
  quantity: string
  calories: number
  protein: number
  carbs: number
  fats: number
  ingredients: string[]
  instructions: string[]
}

export default function AINutritionCoach() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: 30,
    gender: 'male',
    weight: 75,
    height: 175,
    activityLevel: 'moderately_active',
    goal: 'maintain_weight',
    dietaryRestrictions: [],
    allergies: []
  })

  const [macroTargets, setMacroTargets] = useState<MacroTargets>({
    protein: 150,
    carbs: 300,
    fats: 80,
    calories: 2200
  })

  const [customMacros, setCustomMacros] = useState({
    protein: 150,
    carbs: 300,
    fats: 80
  })

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    calculateMacros()
  }, [userProfile])

  useEffect(() => {
    // Recalculate calories when macros change
    const calories = (customMacros.protein * 4) + (customMacros.carbs * 4) + (customMacros.fats * 9)
    setMacroTargets({ ...customMacros, calories })
  }, [customMacros])

  const calculateMacros = () => {
    setIsCalculating(true)
    
    // BMR calculation (Mifflin-St Jeor Equation)
    let bmr: number
    if (userProfile.gender === 'male') {
      bmr = 88.362 + (13.397 * userProfile.weight) + (4.799 * userProfile.height) - (5.677 * userProfile.age)
    } else {
      bmr = 447.593 + (9.247 * userProfile.weight) + (3.098 * userProfile.height) - (4.330 * userProfile.age)
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    }

    let tdee = bmr * activityMultipliers[userProfile.activityLevel]

    // Goal adjustment
    const goalAdjustments = {
      lose_weight: -500, // 500 calorie deficit
      maintain_weight: 0,
      gain_weight: 300, // 300 calorie surplus
      gain_muscle: 200 // 200 calorie surplus
    }

    const targetCalories = Math.round(tdee + goalAdjustments[userProfile.goal])

    // Macro distribution based on goal
    let proteinPercentage, carbsPercentage, fatsPercentage

    switch (userProfile.goal) {
      case 'lose_weight':
        proteinPercentage = 0.35
        carbsPercentage = 0.35
        fatsPercentage = 0.30
        break
      case 'gain_muscle':
        proteinPercentage = 0.30
        carbsPercentage = 0.45
        fatsPercentage = 0.25
        break
      case 'gain_weight':
        proteinPercentage = 0.25
        carbsPercentage = 0.50
        fatsPercentage = 0.25
        break
      default: // maintain_weight
        proteinPercentage = 0.25
        carbsPercentage = 0.50
        fatsPercentage = 0.25
    }

    const proteinGrams = Math.round((targetCalories * proteinPercentage) / 4)
    const carbsGrams = Math.round((targetCalories * carbsPercentage) / 4)
    const fatsGrams = Math.round((targetCalories * fatsPercentage) / 9)

    setTimeout(() => {
      setMacroTargets({
        protein: proteinGrams,
        carbs: carbsGrams,
        fats: fatsGrams,
        calories: targetCalories
      })
      
      setCustomMacros({
        protein: proteinGrams,
        carbs: carbsGrams,
        fats: fatsGrams
      })
      
      setIsCalculating(false)
      toast.success('Macros calculated successfully!')
    }, 1000) // Simulate calculation time
  }

  const generateMealPlan = async () => {
    if (!macroTargets.calories) {
      toast.error('Please calculate your macros first')
      return
    }

    setIsGenerating(true)

    try {
      // Simulate API call to generate meal plan
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Mock meal plan generation
      const mockMealPlan: MealPlan = {
        id: Date.now().toString(),
        name: `${userProfile.goal.replace('_', ' ')} meal plan`,
        meals: {
          breakfast: [
            {
              id: '1',
              name: 'Protein Oats',
              quantity: '1 bowl',
              calories: 350,
              protein: 25,
              carbs: 45,
              fats: 8,
              ingredients: ['50g oats', '1 scoop protein powder', '200ml almond milk', '1 banana'],
              instructions: ['Mix oats with milk', 'Add protein powder', 'Top with sliced banana']
            }
          ],
          lunch: [
            {
              id: '2',
              name: 'Grilled Chicken Salad',
              quantity: '1 large serving',
              calories: 450,
              protein: 35,
              carbs: 25,
              fats: 22,
              ingredients: ['150g chicken breast', 'Mixed greens', '1/2 avocado', 'Cherry tomatoes', 'Olive oil dressing'],
              instructions: ['Grill chicken breast', 'Prepare mixed salad', 'Add sliced avocado', 'Drizzle with dressing']
            }
          ],
          dinner: [
            {
              id: '3',
              name: 'Salmon with Sweet Potato',
              quantity: '1 serving',
              calories: 500,
              protein: 40,
              carbs: 35,
              fats: 20,
              ingredients: ['150g salmon fillet', '200g sweet potato', 'Broccoli', 'Lemon', 'Herbs'],
              instructions: ['Bake salmon with lemon', 'Roast sweet potato', 'Steam broccoli', 'Season with herbs']
            }
          ],
          snacks: [
            {
              id: '4',
              name: 'Greek Yogurt with Berries',
              quantity: '1 cup',
              calories: 180,
              protein: 15,
              carbs: 20,
              fats: 5,
              ingredients: ['200g Greek yogurt', 'Mixed berries', 'Honey'],
              instructions: ['Mix yogurt with berries', 'Drizzle with honey']
            }
          ]
        },
        totalMacros: {
          calories: 1480,
          protein: 115,
          carbs: 125,
          fats: 55
        },
        createdAt: new Date().toISOString()
      }

      setMealPlan(mockMealPlan)
      toast.success('Meal plan generated successfully!')
    } catch (error) {
      toast.error('Failed to generate meal plan')
      console.error('Meal plan generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }))
  }

  const MacroCard = ({ title, value, unit, color, icon: Icon }: {
    title: string
    value: number
    unit: string
    color: string
    icon: any
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}{unit}</p>
          </div>
          <Icon className="h-8 w-8" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Nutrition Coach</h1>
          <p className="text-gray-600 mt-1">
            Personalized nutrition guidance powered by AI
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Zap className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="macros">Macros</TabsTrigger>
          <TabsTrigger value="meal-plan">Meal Plan</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={userProfile.age}
                    onChange={(e) => updateUserProfile({ age: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={userProfile.gender}
                    onValueChange={(value) => updateUserProfile({ gender: value as 'male' | 'female' })}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={userProfile.weight}
                    onChange={(e) => updateUserProfile({ weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={userProfile.height}
                    onChange={(e) => updateUserProfile({ height: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity">Activity Level</Label>
                <Select
                  value={userProfile.activityLevel}
                  onValueChange={(value) => updateUserProfile({ activityLevel: value as any })}
                >
                  <SelectTrigger id="activity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (office job)</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (hard exercise 6-7 days/week)</SelectItem>
                    <SelectItem value="extremely_active">Extremely Active (physical job + exercise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <Select
                  value={userProfile.goal}
                  onValueChange={(value) => updateUserProfile({ goal: value as any })}
                >
                  <SelectTrigger id="goal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Lose Weight</SelectItem>
                    <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                    <SelectItem value="gain_weight">Gain Weight</SelectItem>
                    <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Macros Tab */}
        <TabsContent value="macros" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Macro Targets</h2>
            <Button 
              onClick={calculateMacros} 
              disabled={isCalculating}
              className="flex items-center"
            >
              {isCalculating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </Button>
          </div>

          {/* Macro Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MacroCard
              title="Calories"
              value={macroTargets.calories}
              unit=""
              color="#3B82F6"
              icon={Target}
            />
            <MacroCard
              title="Protein"
              value={macroTargets.protein}
              unit="g"
              color="#10B981"
              icon={Activity}
            />
            <MacroCard
              title="Carbs"
              value={macroTargets.carbs}
              unit="g"
              color="#F59E0B"
              icon={Apple}
            />
            <MacroCard
              title="Fats"
              value={macroTargets.fats}
              unit="g"
              color="#EF4444"
              icon={Utensils}
            />
          </div>

          {/* Custom Macro Adjustment */}
          <Card>
            <CardHeader>
              <CardTitle>Adjust Macros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Protein: {customMacros.protein}g</Label>
                    <span className="text-sm text-gray-500">
                      {Math.round((customMacros.protein * 4 / macroTargets.calories) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[customMacros.protein]}
                    onValueChange={(value) => setCustomMacros(prev => ({ ...prev, protein: value[0] }))}
                    max={300}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Carbs: {customMacros.carbs}g</Label>
                    <span className="text-sm text-gray-500">
                      {Math.round((customMacros.carbs * 4 / macroTargets.calories) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[customMacros.carbs]}
                    onValueChange={(value) => setCustomMacros(prev => ({ ...prev, carbs: value[0] }))}
                    max={500}
                    min={50}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Fats: {customMacros.fats}g</Label>
                    <span className="text-sm text-gray-500">
                      {Math.round((customMacros.fats * 9 / macroTargets.calories) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[customMacros.fats]}
                    onValueChange={(value) => setCustomMacros(prev => ({ ...prev, fats: value[0] }))}
                    max={150}
                    min={30}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Total Calories: {macroTargets.calories} | 
                  Protein: {Math.round((customMacros.protein * 4 / macroTargets.calories) * 100)}% | 
                  Carbs: {Math.round((customMacros.carbs * 4 / macroTargets.calories) * 100)}% | 
                  Fats: {Math.round((customMacros.fats * 9 / macroTargets.calories) * 100)}%
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meal Plan Tab */}
        <TabsContent value="meal-plan" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Meal Plan</h2>
            <Button 
              onClick={generateMealPlan} 
              disabled={isGenerating}
              className="flex items-center"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ChefHat className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Meal Plan'}
            </Button>
          </div>

          {!mealPlan ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ChefHat className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No meal plan yet</h3>
                <p className="text-gray-600 text-center mb-6 max-w-md">
                  Generate a personalized meal plan based on your macro targets and dietary preferences.
                </p>
                <Button onClick={generateMealPlan} disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate First Meal Plan'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Meal Plan Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      {mealPlan.name}
                    </span>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      Created {new Date(mealPlan.createdAt).toLocaleDateString()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{mealPlan.totalMacros.calories}</p>
                      <p className="text-sm text-gray-500">Calories</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{mealPlan.totalMacros.protein}g</p>
                      <p className="text-sm text-gray-500">Protein</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{mealPlan.totalMacros.carbs}g</p>
                      <p className="text-sm text-gray-500">Carbs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{mealPlan.totalMacros.fats}g</p>
                      <p className="text-sm text-gray-500">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meals */}
              {Object.entries(mealPlan.meals).map(([mealType, meals]) => (
                <Card key={mealType}>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {mealType === 'snacks' ? 'Snacks' : mealType}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {meals.map((meal) => (
                        <div key={meal.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-lg">{meal.name}</h4>
                            <Badge variant="outline">{meal.quantity}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                            <span className="text-blue-600">{meal.calories} cal</span>
                            <span className="text-green-600">{meal.protein}g protein</span>
                            <span className="text-yellow-600">{meal.carbs}g carbs</span>
                            <span className="text-red-600">{meal.fats}g fats</span>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <h5 className="font-medium text-sm">Ingredients:</h5>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {meal.ingredients.map((ingredient, idx) => (
                                  <li key={idx}>{ingredient}</li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-sm">Instructions:</h5>
                              <ol className="text-sm text-gray-600 list-decimal list-inside">
                                {meal.instructions.map((instruction, idx) => (
                                  <li key={idx}>{instruction}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Progress Tracking</h3>
              <p className="text-gray-600 text-center mb-6 max-w-md">
                Track your nutrition progress, body measurements, and goal achievements here.
              </p>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}