"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import {
  Calendar,
  Plus,
  RefreshCw,
  Download,
  Clock,
  Flame,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  ChefHat,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import MealFeedbackChat from "./MealFeedbackChat";
import MealPlanCalendar from "./MealPlanCalendar";

interface MealPlanViewProps {
  client: any;
  nutritionProfile: any;
  activeMealPlan: any;
  onPlanUpdate: (plan: any) => void;
}

export default function MealPlanView({
  client,
  nutritionProfile,
  activeMealPlan,
  onPlanUpdate,
}: MealPlanViewProps) {
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(activeMealPlan);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackMeal, setFeedbackMeal] = useState<{
    meal: any;
    date: Date;
    index: number;
  } | null>(null);
  const [generatedDates, setGeneratedDates] = useState<Date[]>([]);
  const [shoppingDays, setShoppingDays] = useState(3);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [mealPlans, setMealPlans] = useState<Record<string, any>>({});
  const supabase = createClient();

  // Initialize with today's date on mount and load existing meal plans
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);

    // Load from localStorage first as a fallback
    const storedPlans = localStorage.getItem(
      `meal_plans_${nutritionProfile?.id}`,
    );
    if (storedPlans) {
      try {
        const parsed = JSON.parse(storedPlans);
        setMealPlans(parsed.plans || {});
        setGeneratedDates(parsed.dates?.map((d: string) => new Date(d)) || []);
      } catch (e) {
        console.error("Error parsing stored meal plans:", e);
      }
    }

    loadMealPlans();
  }, []);

  // Reload meal plans when nutrition profile changes
  useEffect(() => {
    if (nutritionProfile?.id) {
      console.log("Nutrition profile loaded, reloading meal plans");
      loadMealPlans();
    }
  }, [nutritionProfile?.id]);

  // Load all meal plans using API to bypass RLS
  const loadMealPlans = async () => {
    if (!nutritionProfile?.id) {
      console.log("No nutrition profile ID available for loading meal plans");
      return;
    }

    try {
      console.log("Loading meal plans for profile ID:", nutritionProfile.id);

      const response = await fetch(
        `/api/nutrition/meal-plans?profileId=${nutritionProfile.id}`,
      );
      const result = await response.json();

      if (!result.success) {
        console.error("Error loading meal plans:", result.error);
        return;
      }

      const plans = result.data;

      if (plans && plans.length > 0) {
        const plansMap: Record<string, any> = {};
        const dates: Date[] = [];

        plans.forEach((plan: any) => {
          const date = new Date(plan.date);
          date.setHours(0, 0, 0, 0);
          const dateKey = formatDateKey(date);
          plansMap[dateKey] = plan.meal_data;
          dates.push(date);
        });

        setMealPlans(plansMap);
        setGeneratedDates(dates);

        // Save to localStorage as backup
        if (nutritionProfile?.id) {
          localStorage.setItem(
            `meal_plans_${nutritionProfile.id}`,
            JSON.stringify({
              plans: plansMap,
              dates: dates.map((d) => d.toISOString()),
              lastUpdated: new Date().toISOString(),
            }),
          );
        }

        // Set the first plan as current if none exists
        if (!currentPlan && plans[0]) {
          setCurrentPlan(plans[0]);
          onPlanUpdate(plans[0]);
        }

        console.log(`Loaded ${plans.length} meal plans into calendar`);
      } else {
        console.log("No meal plans found for profile:", nutritionProfile.id);
      }
    } catch (error) {
      console.error("Error loading meal plans:", error);
    }
  };

  const handleGenerateSingleDay = async (date: Date) => {
    if (!nutritionProfile) {
      alert("Please set up your nutrition profile first");
      return;
    }

    setGenerating(true);

    try {
      console.log(
        "Generating meal plan for date:",
        date,
        "with profile:",
        nutritionProfile.id,
      );

      // Get list of existing meal names to avoid repetition
      const existingMeals: string[] = [];
      Object.values(mealPlans).forEach((plan: any) => {
        if (plan.meals) {
          plan.meals.forEach((meal: any) => {
            if (meal.name) existingMeals.push(meal.name);
          });
        }
      });

      // Use the library-aware endpoint
      const response = await fetch(
        "/api/nutrition/generate-single-day-with-library",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nutritionProfile,
            date: date.toISOString(),
            existingMeals: existingMeals.slice(-15), // Last 15 meals to avoid repetition
          }),
        },
      );

      const result = await response.json();

      if (result.success && result.data) {
        const dateKey = formatDateKey(date);

        // Update local state
        const newMealPlans = {
          ...mealPlans,
          [dateKey]: result.data,
        };
        setMealPlans(newMealPlans);

        // Add to generated dates if not already there
        let newDates = generatedDates;
        if (
          !generatedDates.find((d) => d.toDateString() === date.toDateString())
        ) {
          newDates = [...generatedDates, date].sort(
            (a, b) => a.getTime() - b.getTime(),
          );
          setGeneratedDates(newDates);
        }

        // Save to localStorage as backup
        if (nutritionProfile?.id) {
          localStorage.setItem(
            `meal_plans_${nutritionProfile.id}`,
            JSON.stringify({
              plans: newMealPlans,
              dates: newDates.map((d) => d.toISOString()),
              lastUpdated: new Date().toISOString(),
            }),
          );
        }

        // Select the newly generated day
        setSelectedDate(date);
      } else {
        console.error("Failed to generate meal plan:", result.error);
        alert(
          result.error || "Failed to generate meal plan. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      alert("Failed to generate meal plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatDateKey = (date: Date) => {
    // Format as YYYY-MM-DD for consistent keys
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getSelectedDayMeals = () => {
    const dateKey = formatDateKey(selectedDate);
    return mealPlans[dateKey] || null;
  };

  const generateShoppingList = () => {
    const shoppingList: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get meals for the selected number of days
    for (let i = 0; i < shoppingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = formatDateKey(date);
      const dayMeals = mealPlans[dateKey];

      if (dayMeals && dayMeals.meals) {
        dayMeals.meals.forEach((meal: any) => {
          if (meal.ingredients) {
            meal.ingredients.forEach((ingredient: any) => {
              const key = ingredient.item.toLowerCase();
              if (!shoppingList[key]) {
                shoppingList[key] = {
                  item: ingredient.item,
                  quantity: 0,
                  unit: ingredient.unit || "",
                };
              }
              shoppingList[key].quantity += parseFloat(ingredient.amount || 0);
            });
          }
        });
      }
    }

    return Object.values(shoppingList);
  };

  const handleProvideFeedback = (meal: any, positive: boolean) => {
    console.log(
      `Feedback for meal: ${meal.name}`,
      positive ? "Positive" : "Negative",
    );
    // TODO: Send feedback to API
  };

  const downloadShoppingList = () => {
    const list = generateShoppingList();
    const text = list
      .map((item: any) => `${item.item}: ${item.quantity} ${item.unit}`)
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopping-list-${shoppingDays}-days.txt`;
    a.click();
  };

  const selectedDayMeals = getSelectedDayMeals();
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack 1", "Snack 2"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-white">Your Meal Plan</h2>
          </div>
          <button
            onClick={() => setShowShoppingList(!showShoppingList)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            Shopping List
          </button>
        </div>
        {generatedDates.length > 0 && (
          <p className="text-gray-400">
            Personalized meal plan based on your goals:{" "}
            {nutritionProfile.target_calories} calories/day
          </p>
        )}
      </div>

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Shopping List</h3>
            <button
              onClick={() => setShowShoppingList(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Generate list for:
            </label>
            <div className="flex gap-2">
              {[2, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={() => setShoppingDays(days)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    shoppingDays === days
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
            {generateShoppingList().map((item: any, index: number) => (
              <div
                key={index}
                className="flex justify-between py-2 border-b border-gray-700"
              >
                <span className="text-white">{item.item}</span>
                <span className="text-gray-400">
                  {item.quantity.toFixed(1)} {item.unit}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={downloadShoppingList}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download List
          </button>
        </div>
      )}

      {/* Calendar Component */}
      <MealPlanCalendar
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        generatedDates={generatedDates}
        onGenerateDay={handleGenerateSingleDay}
        generating={generating}
        nutritionProfile={nutritionProfile}
      />

      {/* Meal Display */}
      {selectedDayMeals && !generating && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {formatDate(selectedDate)}
          </h3>

          <div className="space-y-4">
            {selectedDayMeals.meals?.map((meal: any, index: number) => (
              <div
                key={index}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-orange-500 text-sm font-medium">
                      {mealTypes[index] || `Meal ${index + 1}`}
                    </span>
                    <h4 className="text-white font-semibold text-lg">
                      {meal.name}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setFeedbackMeal({ meal, date: selectedDate, index })
                      }
                      className="p-2 rounded-lg bg-gray-600 hover:bg-orange-600 transition-colors"
                      title="Give feedback on this meal"
                    >
                      <MessageCircle className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={() =>
                        setEditingMeal(
                          editingMeal ===
                            `${formatDateKey(selectedDate)}-${index}`
                            ? null
                            : `${formatDateKey(selectedDate)}-${index}`,
                        )
                      }
                      className="p-2 rounded-lg bg-gray-600 hover:bg-blue-600 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-3">{meal.description}</p>

                {/* Nutrition Info */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-gray-800 rounded px-2 py-1 text-center">
                    <span className="text-gray-400 text-xs block">
                      Calories
                    </span>
                    <span className="text-white font-semibold">
                      {meal.calories || meal.nutrition?.calories || 0}
                    </span>
                  </div>
                  <div className="bg-gray-800 rounded px-2 py-1 text-center">
                    <span className="text-gray-400 text-xs block">Protein</span>
                    <span className="text-white font-semibold">
                      {meal.protein || meal.nutrition?.protein || 0}g
                    </span>
                  </div>
                  <div className="bg-gray-800 rounded px-2 py-1 text-center">
                    <span className="text-gray-400 text-xs block">Carbs</span>
                    <span className="text-white font-semibold">
                      {meal.carbs || meal.nutrition?.carbs || 0}g
                    </span>
                  </div>
                  <div className="bg-gray-800 rounded px-2 py-1 text-center">
                    <span className="text-gray-400 text-xs block">Fat</span>
                    <span className="text-white font-semibold">
                      {meal.fat || meal.nutrition?.fat || 0}g
                    </span>
                  </div>
                </div>

                {/* Prep Time */}
                {meal.prep_time && (
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Prep: {meal.prep_time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      <span>Cook: {meal.cook_time || "0 minutes"}</span>
                    </div>
                  </div>
                )}

                {/* Expandable Details */}
                {editingMeal === `${formatDateKey(selectedDate)}-${index}` && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    {/* Ingredients */}
                    {meal.ingredients && meal.ingredients.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-white font-medium mb-2">
                          Ingredients:
                        </h5>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {meal.ingredients.map((ing: any, i: number) => (
                            <li key={i}>
                              • {ing.amount} {ing.unit} {ing.item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Instructions */}
                    {meal.instructions && meal.instructions.length > 0 && (
                      <div>
                        <h5 className="text-white font-medium mb-2">
                          Instructions:
                        </h5>
                        <ol className="text-gray-300 text-sm space-y-1">
                          {meal.instructions.map((step: string, i: number) => (
                            <li key={i}>
                              {i + 1}. {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Daily Totals */}
          {selectedDayMeals.totals && (
            <div className="mt-6 p-4 bg-gray-900 rounded-lg">
              <h4 className="text-white font-semibold mb-3">Daily Totals</h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <span className="text-gray-400 text-sm block">Calories</span>
                  <span className="text-white text-xl font-bold">
                    {selectedDayMeals.totals.calories}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-sm block">Protein</span>
                  <span className="text-white text-xl font-bold">
                    {selectedDayMeals.totals.protein}g
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-sm block">Carbs</span>
                  <span className="text-white text-xl font-bold">
                    {selectedDayMeals.totals.carbs}g
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-sm block">Fat</span>
                  <span className="text-white text-xl font-bold">
                    {selectedDayMeals.totals.fat}g
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Chat Modal */}
      {feedbackMeal && (
        <MealFeedbackChat
          meal={feedbackMeal.meal}
          dayNumber={
            generatedDates.findIndex(
              (d) => d.toDateString() === feedbackMeal.date.toDateString(),
            ) + 1
          }
          mealIndex={feedbackMeal.index}
          nutritionProfile={nutritionProfile}
          onClose={() => setFeedbackMeal(null)}
          onMealUpdate={(updatedMeal) => {
            // Update the meal in the meal plans
            const dateKey = formatDateKey(feedbackMeal.date);
            if (mealPlans[dateKey]) {
              const updatedPlan = { ...mealPlans[dateKey] };
              updatedPlan.meals[feedbackMeal.index] = updatedMeal;
              setMealPlans((prev) => ({
                ...prev,
                [dateKey]: updatedPlan,
              }));
            }
            setFeedbackMeal(null);
          }}
        />
      )}

      {/* Empty State */}
      {generatedDates.length === 0 && !generating && (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <ChefHat className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Meal Plan Yet
          </h3>
          <p className="text-gray-400 mb-6">
            {nutritionProfile
              ? "Generate your first personalized meal plan to get started"
              : "Please set up your nutrition profile first to generate meal plans"}
          </p>
          {nutritionProfile && (
            <button
              onClick={() => handleGenerateSingleDay(selectedDate)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mx-auto"
            >
              <Plus className="h-5 w-5" />
              Generate Today's Meal Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
