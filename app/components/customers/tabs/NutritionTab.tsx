"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Apple,
  Utensils,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Edit,
  Save,
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Droplets,
  Flame,
  Cookie,
  Beef,
  Wheat,
} from "lucide-react";
import { formatBritishDate } from "@/app/lib/utils/british-format";

interface NutritionTabProps {
  customerId: string;
  organizationId: string;
}

interface NutritionPlan {
  id: string;
  name: string;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  water_target: number;
  meal_plan?: any;
  restrictions?: string[];
  preferences?: string[];
  start_date: string;
  end_date?: string;
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
}

interface AIGeneratedMealPlan {
  id: string;
  nutrition_profile_id?: string;
  member_id?: string;
  client_id?: string;
  organization_id: string;
  name?: string;
  description?: string;
  duration_days?: number;
  meals_per_day?: number;
  daily_calories?: number;
  daily_protein?: number;
  daily_carbs?: number;
  daily_fat?: number;
  daily_fiber?: number;
  meal_data?: any;
  plan_data?: any;
  date?: string;
  created_at: string;
  updated_at?: string;
}

interface NutritionLog {
  id: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  meals: Meal[];
  notes?: string;
  mood?: "great" | "good" | "okay" | "poor";
  energy_level?: number;
}

interface Meal {
  id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  foods: string[];
}

export default function NutritionTab({
  customerId,
  organizationId,
}: NutritionTabProps) {
  const [activePlan, setActivePlan] = useState<NutritionPlan | null>(null);
  const [aiMealPlan, setAiMealPlan] = useState<AIGeneratedMealPlan | null>(
    null,
  );
  const [nutritionProfile, setNutritionProfile] = useState<any>(null);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [showAIMealPlan, setShowAIMealPlan] = useState(false);

  const [planForm, setPlanForm] = useState({
    calories_target: 2000,
    protein_target: 150,
    carbs_target: 200,
    fat_target: 70,
    water_target: 2500,
  });

  const [mealForm, setMealForm] = useState({
    name: "",
    type: "breakfast" as "breakfast" | "lunch" | "dinner" | "snack",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    foods: "",
  });

  const supabase = createClient();

  useEffect(() => {
    console.log("NutritionTab mounted/updated with customerId:", customerId, "organizationId:", organizationId);
    if (customerId && organizationId) {
      fetchNutritionData();
    }
  }, [customerId, organizationId]);

  const fetchNutritionData = async () => {
    try {
      setLoading(true);

      // Fetch nutrition profile - using direct client_id match
      console.log("Fetching nutrition profile for client:", customerId, "org:", organizationId);

      // First get the nutrition profile by client_id and organization_id
      let { data: nutritionProfile, error: profileError } = await supabase
        .from("nutrition_profiles")
        .select(`
          *,
          nutrition_preferences (*)
        `)
        .eq("client_id", customerId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      
      // If not found with org_id, try without it (for backwards compatibility)
      if (!nutritionProfile && !profileError) {
        const { data: profileWithoutOrg } = await supabase
          .from("nutrition_profiles")
          .select(`
            *,
            nutrition_preferences (*)
          `)
          .eq("client_id", customerId)
          .maybeSingle();
          
        nutritionProfile = profileWithoutOrg;
      }

      console.log("Direct nutrition profile query result:", { 
        nutritionProfile, 
        profileError,
        hasProfile: !!nutritionProfile,
        profileId: nutritionProfile?.id,
        targetCalories: nutritionProfile?.target_calories,
        proteinGrams: nutritionProfile?.protein_grams,
        carbsGrams: nutritionProfile?.carbs_grams,
        fatGrams: nutritionProfile?.fat_grams
      });

      // If no profile exists yet, that's ok - the client might not have set one up yet
      if (!nutritionProfile) {
        console.log("No nutrition profile found for client_id:", customerId);
        
        // Check if there's any profile data in the clients table itself
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", customerId)
          .single();
          
        console.log("Client data:", clientData);
      }

      console.log("Final nutrition profile:", nutritionProfile);

      // Set the nutrition profile in state
      setNutritionProfile(nutritionProfile);

      // Set the nutrition profile in state if found
      if (nutritionProfile) {
        // Convert to NutritionPlan format for display
        // Use the correct column names from the nutrition_profiles table
        const plan: NutritionPlan = {
          id: nutritionProfile.id,
          name: "Current Nutrition Plan",
          calories_target: nutritionProfile.target_calories || 2000,
          protein_target: nutritionProfile.protein_grams || 150,
          carbs_target: nutritionProfile.carbs_grams || 200,
          fat_target: nutritionProfile.fat_grams || 70,
          water_target: 2500, // Default water target
          meal_plan: nutritionProfile.nutrition_preferences,
          restrictions: nutritionProfile.nutrition_preferences?.allergies || [],
          preferences: nutritionProfile.nutrition_preferences?.liked_foods || [],
          start_date: nutritionProfile.created_at,
          status: "active",
          created_at: nutritionProfile.created_at,
          updated_at: nutritionProfile.updated_at || nutritionProfile.created_at,
        };
        setActivePlan(plan);
        setPlanForm({
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          water_target: plan.water_target,
        });
        
        console.log("Converted nutrition plan:", {
          planId: plan.id,
          calories: plan.calories_target,
          protein: plan.protein_target,
          carbs: plan.carbs_target,
          fat: plan.fat_target,
          originalProfile: {
            target_calories: nutritionProfile.target_calories,
            protein_grams: nutritionProfile.protein_grams,
            carbs_grams: nutritionProfile.carbs_grams,
            fat_grams: nutritionProfile.fat_grams
          }
        });
      } else {
        console.log("No nutrition profile to convert");
      }

      // Fetch AI-generated meal plan from meal_plans table
      console.log("Fetching AI meal plan for client:", customerId);

      // Query meal plans by client_id or profile_id
      let mealPlanQuery = supabase
        .from("meal_plans")
        .select("*")
        .eq("client_id", customerId)
        .order("created_at", { ascending: false })
        .limit(5);
        
      // If we have a nutrition profile, also search by profile_id
      if (nutritionProfile?.id) {
        mealPlanQuery = supabase
          .from("meal_plans")
          .select("*")
          .or(`client_id.eq.${customerId},profile_id.eq.${nutritionProfile.id}`)
          .order("created_at", { ascending: false })
          .limit(5);
      }
      
      let { data: aiPlanData, error: aiPlanError } = await mealPlanQuery;

      console.log("AI Plan Query Result:", { aiPlanData, aiPlanError });

      if (!aiPlanError && aiPlanData && aiPlanData.length > 0) {
        // Find the most recent plan with actual meal data
        const validPlan =
          aiPlanData.find(
            (plan) => plan.meal_data || plan.plan_data || plan.meals_per_day,
          ) || aiPlanData[0];

        console.log("Setting AI meal plan:", validPlan);
        setAiMealPlan(validPlan);
      } else {
        console.log("No AI meal plan found or error:", aiPlanError);
      }

      // Fetch nutrition logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logsData, error: logsError } = await supabase
        .from("nutrition_logs")
        .select("*")
        .or(
          `client_id.eq.${customerId},customer_id.eq.${customerId},lead_id.eq.${customerId}`,
        )
        .gte("date", thirtyDaysAgo.toISOString())
        .order("date", { ascending: false });

      if (!logsError && logsData) {
        setNutritionLogs(logsData);
      }
    } catch (error) {
      console.error("Error fetching nutrition data:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    try {
      if (activePlan) {
        // Update existing plan
        const { error } = await supabase
          .from("nutrition_plans")
          .update({
            ...planForm,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activePlan.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { error } = await supabase.from("nutrition_plans").insert({
          organization_id: organizationId,
          client_id: customerId,
          customer_id: customerId,
          name: "Custom Nutrition Plan",
          ...planForm,
          status: "active",
          start_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      await fetchNutritionData();
      setEditingPlan(false);
    } catch (error) {
      console.error("Error saving nutrition plan:", error);
      alert("Failed to save nutrition plan");
    }
  };

  const addMeal = async () => {
    try {
      const todayLog = nutritionLogs.find((log) => log.date === selectedDate);

      const newMeal = {
        ...mealForm,
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        foods: mealForm.foods
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      };

      if (todayLog) {
        // Update existing log
        const updatedMeals = [...(todayLog.meals || []), newMeal];
        const totals = calculateTotals(updatedMeals);

        const { error } = await supabase
          .from("nutrition_logs")
          .update({
            meals: updatedMeals,
            ...totals,
            updated_at: new Date().toISOString(),
          })
          .eq("id", todayLog.id);

        if (error) throw error;
      } else {
        // Create new log
        const totals = calculateTotals([newMeal]);

        const { error } = await supabase.from("nutrition_logs").insert({
          organization_id: organizationId,
          client_id: customerId,
          customer_id: customerId,
          date: selectedDate,
          meals: [newMeal],
          ...totals,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      await fetchNutritionData();
      setShowAddMeal(false);
      setMealForm({
        name: "",
        type: "breakfast",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        foods: "",
      });
    } catch (error) {
      console.error("Error adding meal:", error);
      alert("Failed to add meal");
    }
  };

  const calculateTotals = (meals: Meal[]) => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
        water: acc.water,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
    );
  };

  const getTodayLog = () => {
    return nutritionLogs.find((log) => log.date === selectedDate);
  };

  const getProgress = (current: number, target: number) => {
    const percentage = (current / target) * 100;
    return Math.min(percentage, 100);
  };

  const getMacroIcon = (type: string) => {
    switch (type) {
      case "protein":
        return <Beef className="h-4 w-4" />;
      case "carbs":
        return <Wheat className="h-4 w-4" />;
      case "fat":
        return <Cookie className="h-4 w-4" />;
      case "water":
        return <Droplets className="h-4 w-4" />;
      default:
        return <Apple className="h-4 w-4" />;
    }
  };

  const todayLog = getTodayLog();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading nutrition data...</div>
      </div>
    );
  }

  console.log("Rendering NutritionTab - aiMealPlan:", aiMealPlan);

  // Note: Meal plans should only be generated from the client portal
  // The gym owner can view but not generate meal plans

  return (
    <div className="space-y-6">
      {/* Show message if no AI meal plan */}
      {!aiMealPlan && nutritionProfile && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400">
            No AI meal plan found for this client. The client needs to generate their meal plan from their portal.
          </p>
        </div>
      )}

      {/* AI Generated Meal Plan Section */}
      {aiMealPlan && (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Apple className="h-5 w-5 text-purple-500" />
              AI-Generated Meal Plan
              <span className="text-xs bg-purple-600/30 px-2 py-1 rounded-full text-purple-300">
                Personalized
              </span>
            </h3>
            <button
              onClick={() => setShowAIMealPlan(!showAIMealPlan)}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              {showAIMealPlan ? (
                <>
                  <X className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4" />
                  View Details
                </>
              )}
            </button>
          </div>

          {showAIMealPlan && (
            <div className="space-y-4">
              {/* Display meal plan details */}
              {(() => {
                const mealData =
                  aiMealPlan.meal_data || aiMealPlan.plan_data || aiMealPlan;
                console.log("Meal data to display:", mealData);

                if (typeof mealData === "object" && mealData) {
                  // Check if it's a weekly plan
                  if (mealData.weeks || mealData.days) {
                    const days = mealData.weeks
                      ? mealData.weeks[0]?.days || []
                      : mealData.days || [];

                    return (
                      <div className="space-y-4">
                        {days.slice(0, 7).map((day: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-800/50 rounded-lg p-4"
                          >
                            <h4 className="text-white font-medium mb-3">
                              {day.day || `Day ${index + 1}`}
                            </h4>
                            <div className="space-y-2">
                              {day.meals?.map(
                                (meal: any, mealIndex: number) => (
                                  <div
                                    key={mealIndex}
                                    className="bg-gray-700/50 rounded p-3"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <h5 className="text-purple-300 font-medium">
                                          {meal.type || meal.name}
                                        </h5>
                                        <p className="text-gray-300 text-sm mt-1">
                                          {meal.description ||
                                            meal.foods?.join(", ")}
                                        </p>
                                      </div>
                                      <div className="text-right text-xs space-y-1">
                                        <div className="text-orange-400">
                                          {meal.calories || 0} cal
                                        </div>
                                        <div className="text-red-400">
                                          {meal.protein || 0}g protein
                                        </div>
                                        <div className="text-yellow-400">
                                          {meal.carbs || 0}g carbs
                                        </div>
                                        <div className="text-purple-400">
                                          {meal.fat || 0}g fat
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                            {day.totals && (
                              <div className="mt-3 pt-3 border-t border-gray-700 flex justify-around text-sm">
                                <span className="text-orange-400">
                                  Total: {day.totals.calories || 0} cal
                                </span>
                                <span className="text-red-400">
                                  P: {day.totals.protein || 0}g
                                </span>
                                <span className="text-yellow-400">
                                  C: {day.totals.carbs || 0}g
                                </span>
                                <span className="text-purple-400">
                                  F: {day.totals.fat || 0}g
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  } else if (mealData.meals) {
                    // Single day plan
                    return (
                      <div className="space-y-3">
                        {mealData.meals.map((meal: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-700/50 rounded p-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="text-purple-300 font-medium">
                                  {meal.type || meal.name}
                                </h5>
                                <p className="text-gray-300 text-sm mt-1">
                                  {meal.description || meal.foods?.join(", ")}
                                </p>
                              </div>
                              <div className="text-right text-xs space-y-1">
                                <div className="text-orange-400">
                                  {meal.calories || 0} cal
                                </div>
                                <div className="text-red-400">
                                  {meal.protein || 0}g protein
                                </div>
                                <div className="text-yellow-400">
                                  {meal.carbs || 0}g carbs
                                </div>
                                <div className="text-purple-400">
                                  {meal.fat || 0}g fat
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                }

                // If we have plan metadata but no structured meal data
                if (
                  mealData.name ||
                  mealData.description ||
                  mealData.daily_calories
                ) {
                  return (
                    <div className="space-y-3">
                      <div className="bg-gray-700/50 rounded p-4">
                        <h4 className="text-white font-medium mb-2">
                          Plan Details
                        </h4>
                        {mealData.name && (
                          <p className="text-gray-300">Name: {mealData.name}</p>
                        )}
                        {mealData.description && (
                          <p className="text-gray-300 text-sm mt-1">
                            {mealData.description}
                          </p>
                        )}
                        <div className="grid grid-cols-4 gap-3 mt-3">
                          {mealData.daily_calories && (
                            <div>
                              <div className="text-orange-400 font-medium">
                                {mealData.daily_calories}
                              </div>
                              <div className="text-xs text-gray-500">
                                calories/day
                              </div>
                            </div>
                          )}
                          {mealData.daily_protein && (
                            <div>
                              <div className="text-red-400 font-medium">
                                {mealData.daily_protein}g
                              </div>
                              <div className="text-xs text-gray-500">
                                protein/day
                              </div>
                            </div>
                          )}
                          {mealData.daily_carbs && (
                            <div>
                              <div className="text-yellow-400 font-medium">
                                {mealData.daily_carbs}g
                              </div>
                              <div className="text-xs text-gray-500">
                                carbs/day
                              </div>
                            </div>
                          )}
                          {mealData.daily_fat && (
                            <div>
                              <div className="text-purple-400 font-medium">
                                {mealData.daily_fat}g
                              </div>
                              <div className="text-xs text-gray-500">
                                fat/day
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-800 p-2 rounded">
                        <details>
                          <summary className="cursor-pointer text-gray-400">
                            Debug: View raw data
                          </summary>
                          <pre className="mt-2 text-xs overflow-auto max-h-40">
                            {JSON.stringify(mealData, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="text-gray-400 text-center py-4">
                    <p>Unable to display meal plan format</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs">
                        Debug info
                      </summary>
                      <pre className="mt-2 text-xs text-left overflow-auto max-h-40">
                        {JSON.stringify(mealData, null, 2)}
                      </pre>
                    </details>
                  </div>
                );
              })()}

              <div className="text-xs text-gray-500 mt-4">
                Generated on{" "}
                {new Date(aiMealPlan.created_at).toLocaleDateString("en-GB")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nutrition Plan Overview */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            Nutrition Targets
          </h3>
          <button
            onClick={() => setEditingPlan(!editingPlan)}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            {editingPlan ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                Edit Targets
              </>
            )}
          </button>
        </div>

        {editingPlan ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Daily Calories Target
                </label>
                <input
                  type="number"
                  value={planForm.calories_target}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      calories_target: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={planForm.protein_target}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      protein_target: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={planForm.carbs_target}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      carbs_target: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={planForm.fat_target}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      fat_target: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Water (ml)
                </label>
                <input
                  type="number"
                  value={planForm.water_target}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      water_target: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg"
                />
              </div>
            </div>
            <button
              onClick={savePlan}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {activePlan?.calories_target || 2000}
              </div>
              <div className="text-xs text-gray-400">Calories</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Beef className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {activePlan?.protein_target || 150}g
              </div>
              <div className="text-xs text-gray-400">Protein</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Wheat className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {activePlan?.carbs_target || 200}g
              </div>
              <div className="text-xs text-gray-400">Carbs</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Cookie className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {activePlan?.fat_target || 70}g
              </div>
              <div className="text-xs text-gray-400">Fat</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">
                {activePlan?.water_target || 2500}ml
              </div>
              <div className="text-xs text-gray-400">Water</div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Progress */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Today's Progress
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1 bg-gray-700 text-white rounded-lg"
          />
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Calories</span>
              <span className="text-white">
                {todayLog?.calories || 0} /{" "}
                {activePlan?.calories_target || 2000}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{
                  width: `${getProgress(todayLog?.calories || 0, activePlan?.calories_target || 2000)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Protein</span>
              <span className="text-white">
                {todayLog?.protein || 0}g / {activePlan?.protein_target || 150}g
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{
                  width: `${getProgress(todayLog?.protein || 0, activePlan?.protein_target || 150)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Carbs</span>
              <span className="text-white">
                {todayLog?.carbs || 0}g / {activePlan?.carbs_target || 200}g
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all"
                style={{
                  width: `${getProgress(todayLog?.carbs || 0, activePlan?.carbs_target || 200)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Fat</span>
              <span className="text-white">
                {todayLog?.fat || 0}g / {activePlan?.fat_target || 70}g
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{
                  width: `${getProgress(todayLog?.fat || 0, activePlan?.fat_target || 70)}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Water</span>
              <span className="text-white">
                {todayLog?.water || 0}ml / {activePlan?.water_target || 2500}ml
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${getProgress(todayLog?.water || 0, activePlan?.water_target || 2500)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Meals for Selected Date */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Utensils className="h-5 w-5 text-green-500" />
            Meals - {formatBritishDate(selectedDate)}
          </h3>
          <button
            onClick={() => setShowAddMeal(!showAddMeal)}
            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Meal
          </button>
        </div>

        {/* Add Meal Form */}
        {showAddMeal && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Meal Name
                </label>
                <input
                  type="text"
                  value={mealForm.name}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                  placeholder="e.g., Chicken Salad"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={mealForm.type}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  value={mealForm.calories}
                  onChange={(e) =>
                    setMealForm({
                      ...mealForm,
                      calories: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={mealForm.protein}
                  onChange={(e) =>
                    setMealForm({
                      ...mealForm,
                      protein: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={mealForm.carbs}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, carbs: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={mealForm.fat}
                  onChange={(e) =>
                    setMealForm({ ...mealForm, fat: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">
                Foods (comma-separated)
              </label>
              <input
                type="text"
                value={mealForm.foods}
                onChange={(e) =>
                  setMealForm({ ...mealForm, foods: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                placeholder="e.g., Chicken breast, Lettuce, Tomatoes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddMeal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={addMeal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Meal
              </button>
            </div>
          </div>
        )}

        {/* Meals List */}
        <div className="space-y-3">
          {todayLog?.meals && todayLog.meals.length > 0 ? (
            todayLog.meals.map((meal) => (
              <div key={meal.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">{meal.name}</h4>
                    <div className="text-sm text-gray-400 mt-1">
                      {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                    </div>
                    {meal.foods && meal.foods.length > 0 && (
                      <div className="text-xs text-gray-500 mt-2">
                        {meal.foods.join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-sm font-medium text-orange-400">
                        {meal.calories}
                      </div>
                      <div className="text-xs text-gray-500">cal</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-red-400">
                        {meal.protein}g
                      </div>
                      <div className="text-xs text-gray-500">protein</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-yellow-400">
                        {meal.carbs}g
                      </div>
                      <div className="text-xs text-gray-500">carbs</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-purple-400">
                        {meal.fat}g
                      </div>
                      <div className="text-xs text-gray-500">fat</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              No meals logged for this date
            </div>
          )}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Last 7 Days Summary
        </h3>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split("T")[0];
            const log = nutritionLogs.find((l) => l.date === dateStr);
            const percentage = log
              ? getProgress(log.calories, activePlan?.calories_target || 2000)
              : 0;

            return (
              <div key={i} className="text-center">
                <div className="text-xs text-gray-500 mb-1">
                  {date.toLocaleDateString("en-GB", { weekday: "short" })}
                </div>
                <div className="h-20 bg-gray-700 rounded relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-green-600 to-green-400 transition-all"
                    style={{ height: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {log ? `${Math.round(percentage)}%` : "-"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
