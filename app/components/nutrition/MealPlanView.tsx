"use client";

import { useState, useEffect } from "react";
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
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [skeleton, setSkeleton] = useState<any>(null);
  const [feedbackMeal, setFeedbackMeal] = useState<{
    meal: any;
    date: Date;
    index: number;
  } | null>(null);
  const [generatedDates, setGeneratedDates] = useState<Date[]>([]);
  const [shoppingDays, setShoppingDays] = useState(3);
  const [showShoppingList, setShowShoppingList] = useState(false);

  // Initialize with today's date on mount
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
  }, []);

  // Load existing generated dates from meal plan
  useEffect(() => {
    if (currentPlan?.meal_data) {
      const dates: Date[] = [];
      const planData = currentPlan.meal_data;

      // Check different possible formats
      if (planData.week_plan && Array.isArray(planData.week_plan)) {
        // If we have existing dates stored
        if (currentPlan.start_date) {
          const startDate = new Date(currentPlan.start_date);
          for (let i = 0; i < planData.week_plan.length; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            dates.push(date);
          }
        } else {
          // Generate dates starting from today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          for (let i = 0; i < planData.week_plan.length; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
          }
        }
      } else {
        // Check day_1, day_2 format
        const dayKeys = Object.keys(planData).filter((key) =>
          key.startsWith("day_"),
        );
        if (dayKeys.length > 0) {
          const startDate = currentPlan.start_date
            ? new Date(currentPlan.start_date)
            : new Date();
          startDate.setHours(0, 0, 0, 0);

          dayKeys.forEach((key, index) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + index);
            dates.push(date);
          });
        }
      }

      setGeneratedDates(dates);
    }
  }, [currentPlan]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setSkeleton(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get preferences if they exist
      const preferencesResponse = await fetch(
        `/api/nutrition/preferences?profileId=${nutritionProfile.id}`,
      );
      const preferences = preferencesResponse.ok
        ? await preferencesResponse.json()
        : {};

      // Use new quick endpoint for faster generation
      const response = await fetch("/api/nutrition/generate-meal-plan-quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nutritionProfile: {
            ...nutritionProfile,
            meals_per_day: 3,
            snacks_per_day: 2,
          },
          profileId: nutritionProfile.id,
          preferences: preferences.data || {},
          daysToGenerate: 3,
          startDate: today.toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Got immediate result from quick endpoint
        const planData = {
          ...result.data,
          meal_data: result.data.meal_data || result.data.meal_plan,
          start_date: today.toISOString(),
        };
        setCurrentPlan(planData);
        onPlanUpdate(planData);

        // Set generated dates
        const dates: Date[] = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          dates.push(date);
        }
        setGeneratedDates(dates);
        setGenerating(false);
      } else if (result.cached) {
        // Got cached result immediately
        setCurrentPlan(result.data);
        onPlanUpdate(result.data);
        setGenerating(false);
      } else if (result.jobId) {
        // Got job ID, show skeleton and start polling
        setJobId(result.jobId);
        setJobStatus("processing");
        setSkeleton(result.skeleton);

        // Start polling for job completion
        pollJobStatus(result.jobId);
      } else {
        // Error occurred
        console.error("Failed to generate meal plan:", result.error);
        alert(
          result.error || "Failed to generate meal plan. Please try again.",
        );
        setGenerating(false);
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      alert("Failed to generate meal plan. Please try again.");
      setGenerating(false);
    }
  };

  const handleGenerateNextDays = async () => {
    setGenerating(true);

    try {
      // Calculate the next start date
      const lastDate = generatedDates[generatedDates.length - 1];
      const nextStartDate = new Date(lastDate);
      nextStartDate.setDate(nextStartDate.getDate() + 1);

      const response = await fetch("/api/nutrition/generate-meal-plan-quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nutritionProfile: {
            ...nutritionProfile,
            meals_per_day: 3,
            snacks_per_day: 2,
          },
          profileId: nutritionProfile.id,
          daysToGenerate: 3,
          startDate: nextStartDate.toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Merge new days with existing plan
        const newDates: Date[] = [];
        for (let i = 0; i < 3; i++) {
          const date = new Date(nextStartDate);
          date.setDate(nextStartDate.getDate() + i);
          newDates.push(date);
        }

        // Update meal data with date-based keys
        const updatedMealData = { ...currentPlan.meal_data };
        Object.entries(result.data.meal_plan || result.data.meal_data).forEach(
          ([key, value], index) => {
            const dateKey = formatDateKey(newDates[index]);
            updatedMealData[dateKey] = value;
          },
        );

        const mergedPlan = {
          ...currentPlan,
          meal_data: updatedMealData,
          // Merge shopping lists
          shopping_list: mergeShoppingLists(
            currentPlan.shopping_list,
            result.data.shopping_list,
          ),
        };

        setCurrentPlan(mergedPlan);
        onPlanUpdate(mergedPlan);
        setGeneratedDates([...generatedDates, ...newDates]);

        // Auto-select the first new day
        setSelectedDate(newDates[0]);
      }
    } catch (error) {
      console.error("Error generating next days:", error);
      alert("Failed to generate next days. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const mergeShoppingLists = (existing: any, newList: any) => {
    if (!existing) return newList;
    if (!newList) return existing;

    const merged: any = {};

    // Merge all items
    [...Object.keys(existing), ...Object.keys(newList)].forEach((item) => {
      const existingItem = existing[item] || { quantity: 0, unit: "" };
      const newItem = newList[item] || { quantity: 0, unit: "" };

      merged[item] = {
        quantity:
          parseFloat(existingItem.quantity || 0) +
          parseFloat(newItem.quantity || 0),
        unit: existingItem.unit || newItem.unit,
      };
    });

    return merged;
  };

  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/nutrition/job-status/${jobId}`);
        const result = await response.json();

        if (result.status === "completed" && result.data) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const planData = {
            ...result.data,
            meal_data: result.data.meal_data || result.data.meal_plan,
            start_date: today.toISOString(),
          };
          setCurrentPlan(planData);
          onPlanUpdate(planData);
          setJobStatus("completed");
          setSkeleton(null);
          setGenerating(false);

          // Set generated dates
          const dates: Date[] = [];
          for (let i = 0; i < 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
          }
          setGeneratedDates(dates);
        } else if (result.status === "failed") {
          setJobStatus("failed");
          setSkeleton(null);
          setGenerating(false);
          alert("Failed to generate meal plan. Please try again.");
        } else {
          // Still processing, check again
          setTimeout(checkStatus, 2000);
        }
      } catch (error) {
        console.error("Error checking job status:", error);
        setJobStatus("failed");
        setSkeleton(null);
        setGenerating(false);
      }
    };

    checkStatus();
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
    if (!currentPlan || !currentPlan.meal_data) return null;

    const dateKey = formatDateKey(selectedDate);

    // Try date-based key first
    if (currentPlan.meal_data[dateKey]) {
      return currentPlan.meal_data[dateKey];
    }

    // Fallback to index-based if dates not yet migrated
    const dayIndex = generatedDates.findIndex(
      (d) => d.toDateString() === selectedDate.toDateString(),
    );

    if (dayIndex >= 0) {
      if (
        currentPlan.meal_data.week_plan &&
        Array.isArray(currentPlan.meal_data.week_plan)
      ) {
        return currentPlan.meal_data.week_plan[dayIndex];
      }

      if (currentPlan.meal_data[`day_${dayIndex + 1}`]) {
        return currentPlan.meal_data[`day_${dayIndex + 1}`];
      }
    }

    return null;
  };

  const generateShoppingList = () => {
    if (!currentPlan || !currentPlan.meal_data) return {};

    const shoppingList: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get meals for the selected number of days
    for (let i = 0; i < shoppingDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = formatDateKey(date);

      const dayMeals =
        currentPlan.meal_data[dateKey] ||
        currentPlan.meal_data[`day_${i + 1}`] ||
        (currentPlan.meal_data.week_plan && currentPlan.meal_data.week_plan[i]);

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
          {!currentPlan && (
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Generate Meal Plan
                </>
              )}
            </button>
          )}
        </div>

        {currentPlan && (
          <div className="flex items-center justify-between">
            <p className="text-gray-400">
              Personalized meal plan based on your goals:{" "}
              {nutritionProfile.target_calories} calories/day
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowShoppingList(!showShoppingList)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Shopping List
              </button>
              <button
                onClick={handleGenerateNextDays}
                disabled={generating}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate Next 3 Days
                  </>
                )}
              </button>
            </div>
          </div>
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

      {/* Date Selector */}
      {generatedDates.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {generatedDates.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedDate.toDateString() === date.toDateString()
                    ? "bg-orange-600 text-white"
                    : isToday(date)
                      ? "bg-gray-700 text-white ring-2 ring-orange-500"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                {formatDate(date)}
                {isToday(date) && <span className="ml-2 text-xs">(Today)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {generating && skeleton && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-700 h-48 rounded-lg"></div>
              ))}
            </div>
          </div>
          <p className="text-center text-gray-400 mt-4">
            Generating your personalized meal plan...
          </p>
        </div>
      )}

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
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{meal.prep_time} prep time</span>
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
            // Update the meal in the current plan
            const updatedPlan = { ...currentPlan };
            const dateKey = formatDateKey(feedbackMeal.date);

            if (updatedPlan.meal_data[dateKey]) {
              updatedPlan.meal_data[dateKey].meals[feedbackMeal.index] =
                updatedMeal;
            } else {
              // Fallback to day_N format
              const dayKey = `day_${
                generatedDates.findIndex(
                  (d) => d.toDateString() === feedbackMeal.date.toDateString(),
                ) + 1
              }`;
              if (updatedPlan.meal_data[dayKey]) {
                updatedPlan.meal_data[dayKey].meals[feedbackMeal.index] =
                  updatedMeal;
              }
            }

            setCurrentPlan(updatedPlan);
            onPlanUpdate(updatedPlan);
            setFeedbackMeal(null);
          }}
        />
      )}

      {/* Empty State */}
      {!currentPlan && !generating && (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
          <ChefHat className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Meal Plan Yet
          </h3>
          <p className="text-gray-400 mb-6">
            Generate your first personalized meal plan to get started
          </p>
          <button
            onClick={handleGeneratePlan}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mx-auto"
          >
            <Plus className="h-5 w-5" />
            Generate Your First Meal Plan
          </button>
        </div>
      )}
    </div>
  );
}
