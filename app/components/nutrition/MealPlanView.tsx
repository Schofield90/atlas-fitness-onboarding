"use client";

import { useState } from "react";
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
} from "lucide-react";

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
  const [selectedDay, setSelectedDay] = useState(1);
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [skeleton, setSkeleton] = useState<any>(null);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setSkeleton(null);
    setJobId(null);
    setJobStatus(null);

    try {
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
          nutritionProfile,
          profileId: nutritionProfile.id,
          preferences: preferences.data || {},
          daysToGenerate: 3, // Reduced to 3 days for faster generation
        }),
      });

      const result = await response.json();

      if (result.cached) {
        // Got cached result immediately
        setCurrentPlan(result.data);
        onPlanUpdate(result.data);
        setGenerating(false);
        return;
      }

      if (result.jobId) {
        // Got job ID, show skeleton and start polling
        setJobId(result.jobId);
        setJobStatus("processing");
        setSkeleton(result.skeleton);

        // Start polling for job completion
        pollJobStatus(result.jobId);
      } else if (result.success) {
        // Fallback: got immediate result (shouldn't happen with v2)
        setCurrentPlan(result.data);
        onPlanUpdate(result.data);
        setGenerating(false);
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      alert("Failed to generate meal plan. Please try again.");
      setGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30; // Poll for max 60 seconds (30 * 2 seconds)
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/nutrition/job-status/${jobId}`);
        const result = await response.json();

        setJobStatus(result.status);

        if (result.status === "completed" && result.data) {
          // Job completed successfully
          clearInterval(poll);
          setCurrentPlan(result.data);
          onPlanUpdate(result.data);
          setGenerating(false);
          setSkeleton(null);
          setJobId(null);
        } else if (result.status === "failed") {
          // Job failed
          clearInterval(poll);
          console.error("Job failed:", result.error);
          alert(
            result.error || "Meal plan generation failed. Please try again.",
          );
          setGenerating(false);
          setSkeleton(null);
          setJobId(null);
        } else if (attempts >= maxAttempts) {
          // Timeout
          clearInterval(poll);
          alert(
            "Meal plan generation is taking longer than expected. Please refresh and try again.",
          );
          setGenerating(false);
          setSkeleton(null);
          setJobId(null);
        }
        // Continue polling if still processing
      } catch (error) {
        console.error("Error polling job status:", error);
        clearInterval(poll);
        setGenerating(false);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleMealFeedback = async (
    mealId: string,
    rating: "like" | "dislike",
  ) => {
    setFeedback(`Feedback recorded: ${rating}`);
    // Store feedback for AI learning
    setTimeout(() => setFeedback(""), 3000);
  };

  const getDayName = (dayNum: number) => {
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    return days[dayNum - 1];
  };

  // Support both data formats (week_plan array and day_1 object format)
  const getMealData = () => {
    if (!currentPlan?.meal_data) return null;

    // Check if it's the week_plan format
    if (
      currentPlan.meal_data.week_plan &&
      Array.isArray(currentPlan.meal_data.week_plan)
    ) {
      return currentPlan.meal_data.week_plan[selectedDay - 1];
    }

    // Check if it's the day_1, day_2 format
    if (currentPlan.meal_data[`day_${selectedDay}`]) {
      return currentPlan.meal_data[`day_${selectedDay}`];
    }

    return null;
  };

  const dayData = getMealData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Your Meal Plan</h2>
        {currentPlan && (
          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
            />
            Regenerate Plan
          </button>
        )}
      </div>

      {!currentPlan && !skeleton ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">
            No active meal plan. Generate a personalized plan based on your
            profile.
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {generating ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Starting Generation...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Generate AI Meal Plan
              </>
            )}
          </button>
        </div>
      ) : skeleton && !currentPlan ? (
        // Show skeleton while processing
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
              <div>
                <p className="text-white font-medium">
                  Generating your personalized meal plan...
                </p>
                <p className="text-sm text-gray-400">
                  {jobStatus === "processing"
                    ? "Our AI chef is creating delicious meals for you"
                    : "Preparing your plan..."}
                </p>
              </div>
            </div>
          </div>

          {/* Show skeleton meals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skeleton &&
              skeleton.day_1 &&
              skeleton.day_1.meals.map((meal: any, index: number) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-48"></div>
                    </div>
                    <div className="h-8 bg-orange-600/20 rounded px-3 py-1 w-20"></div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="h-4 bg-gray-700 rounded w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-12 mx-auto"></div>
                    </div>
                    <div className="text-center">
                      <div className="h-4 bg-gray-700 rounded w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-12 mx-auto"></div>
                    </div>
                    <div className="text-center">
                      <div className="h-4 bg-gray-700 rounded w-16 mx-auto mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-12 mx-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Daily Macros Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Daily Calories</p>
              <p className="text-xl font-semibold text-white">
                {currentPlan.daily_calories || currentPlan.total_calories / 3}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Protein</p>
              <p className="text-xl font-semibold text-white">
                {currentPlan.daily_protein || currentPlan.total_protein / 3}g
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Carbs</p>
              <p className="text-xl font-semibold text-white">
                {currentPlan.daily_carbs || currentPlan.total_carbs / 3}g
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Fat</p>
              <p className="text-xl font-semibold text-white">
                {currentPlan.daily_fat || currentPlan.total_fat / 3}g
              </p>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedDay === day
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {getDayName(day)}
              </button>
            ))}
          </div>

          {/* Meal Plan for Selected Day */}
          {dayData && (
            <div className="space-y-4">
              {/* Daily Totals if available */}
              {dayData.daily_totals && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Daily Totals
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Calories</p>
                      <p className="text-white font-semibold">
                        {dayData.daily_totals.calories || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Protein</p>
                      <p className="text-white font-semibold">
                        {dayData.daily_totals.protein || 0}g
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Carbs</p>
                      <p className="text-white font-semibold">
                        {dayData.daily_totals.carbs || 0}g
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fat</p>
                      <p className="text-white font-semibold">
                        {dayData.daily_totals.fat || 0}g
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Meals */}
              {dayData.meals?.map((meal: any, index: number) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-white capitalize">
                        {meal.type}
                      </h4>
                      <p className="text-white font-medium">{meal.name}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {meal.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleMealFeedback(`${selectedDay}-${index}`, "like")
                        }
                        className="p-2 rounded-lg bg-gray-700 hover:bg-green-600 transition-colors"
                      >
                        <ThumbsUp className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() =>
                          handleMealFeedback(
                            `${selectedDay}-${index}`,
                            "dislike",
                          )
                        }
                        className="p-2 rounded-lg bg-gray-700 hover:bg-red-600 transition-colors"
                      >
                        <ThumbsDown className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() =>
                          setEditingMeal(
                            editingMeal === `${selectedDay}-${index}`
                              ? null
                              : `${selectedDay}-${index}`,
                          )
                        }
                        className="p-2 rounded-lg bg-gray-700 hover:bg-orange-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Meal Stats */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Calories</p>
                      <p className="text-white text-sm font-medium">
                        {meal.calories}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Protein</p>
                      <p className="text-white text-sm font-medium">
                        {meal.protein || meal.protein_grams}g
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Carbs</p>
                      <p className="text-white text-sm font-medium">
                        {meal.carbs || meal.carbs_grams}g
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Fat</p>
                      <p className="text-white text-sm font-medium">
                        {meal.fat || meal.fat_grams}g
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-xs">Time</p>
                      <p className="text-white text-sm font-medium">
                        {(meal.prep_time || 0) + (meal.cook_time || 0)}min
                      </p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {editingMeal === `${selectedDay}-${index}` && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      {/* Ingredients */}
                      {meal.ingredients && meal.ingredients.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-white font-medium mb-2">
                            Ingredients:
                          </h5>
                          <ul className="text-gray-400 text-sm space-y-1">
                            {meal.ingredients.map((ing: any, i: number) => (
                              <li key={i}>
                                •{" "}
                                {typeof ing === "string"
                                  ? ing
                                  : `${ing.amount} ${ing.unit} ${ing.name}`}
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
                          <ol className="text-gray-400 text-sm space-y-1">
                            {meal.instructions.map(
                              (step: string, i: number) => (
                                <li key={i}>
                                  {i + 1}. {step}
                                </li>
                              ),
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Shopping List */}
          {(currentPlan.shopping_list ||
            currentPlan.meal_data?.shopping_list) && (
            <div className="bg-gray-800 rounded-lg p-4 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Shopping List
                </h3>
                <button className="p-2 rounded-lg bg-gray-700 hover:bg-orange-600 transition-colors">
                  <Download className="h-4 w-4 text-white" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Handle both array and object formats */}
                {Array.isArray(currentPlan.shopping_list)
                  ? currentPlan.shopping_list.map(
                      (item: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-gray-400 text-sm">
                            {item.quantity} {item.item}
                          </span>
                        </div>
                      ),
                    )
                  : currentPlan.meal_data?.shopping_list
                    ? Object.entries(currentPlan.meal_data.shopping_list).map(
                        ([category, items]: [string, any]) => (
                          <div key={category}>
                            <h5 className="text-sm font-medium text-gray-300 mb-2 capitalize">
                              {category.replace("_", " ")}
                            </h5>
                            <ul className="text-sm text-gray-400 space-y-1">
                              {items
                                .slice(0, 5)
                                .map((item: string, idx: number) => (
                                  <li key={idx}>• {item}</li>
                                ))}
                            </ul>
                          </div>
                        ),
                      )
                    : null}
              </div>
            </div>
          )}

          {/* Meal Prep Tips */}
          {(currentPlan.meal_prep_tips ||
            currentPlan.meal_data?.meal_prep_tips) &&
            (
              currentPlan.meal_prep_tips ||
              currentPlan.meal_data?.meal_prep_tips
            ).length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Meal Prep Tips
                </h3>
                <ul className="text-gray-400 space-y-2">
                  {(
                    currentPlan.meal_prep_tips ||
                    currentPlan.meal_data?.meal_prep_tips
                  ).map((tip: string, index: number) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

          {/* Feedback Message */}
          {feedback && (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg">
              {feedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
