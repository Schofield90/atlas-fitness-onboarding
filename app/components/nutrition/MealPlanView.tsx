"use client";

import { useState } from "react";
import { Calendar, Plus, RefreshCw, Download } from "lucide-react";

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

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/nutrition/generate-meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: nutritionProfile.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("Meal plan generated:", result.data);
        onPlanUpdate(result.data);
      } else {
        console.error("Failed to generate meal plan:", result.error);
        alert("Failed to generate meal plan. Please try again.");
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      alert("An error occurred while generating your meal plan.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Your Meal Plan</h2>

      {!activeMealPlan ? (
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
                Generating Your Plan...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Generate AI Meal Plan
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Meal Plan Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-white">
                {activeMealPlan.name}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {activeMealPlan.description}
              </p>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
              />
              Regenerate
            </button>
          </div>

          {/* Daily Macros Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Daily Calories</p>
              <p className="text-xl font-semibold text-white">
                {activeMealPlan.daily_calories}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Protein</p>
              <p className="text-xl font-semibold text-white">
                {activeMealPlan.daily_protein}g
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Carbs</p>
              <p className="text-xl font-semibold text-white">
                {activeMealPlan.daily_carbs}g
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400">Fat</p>
              <p className="text-xl font-semibold text-white">
                {activeMealPlan.daily_fat}g
              </p>
            </div>
          </div>

          {/* Week Plan */}
          {activeMealPlan.meal_data?.week_plan && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Your Week</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeMealPlan.meal_data.week_plan
                  .slice(0, 7)
                  .map((day: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                    >
                      <h5 className="font-medium text-white mb-2">{day.day}</h5>
                      <div className="space-y-2">
                        {day.meals.map((meal: any, mealIdx: number) => (
                          <div key={mealIdx} className="text-sm">
                            <p className="text-gray-300 font-medium">
                              {meal.type}
                            </p>
                            <p className="text-gray-400">{meal.name}</p>
                            <p className="text-xs text-gray-500">
                              {meal.calories} cal | P: {meal.protein}g
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Shopping List */}
          {activeMealPlan.meal_data?.shopping_list && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-white">
                  Shopping List
                </h4>
                <button className="text-orange-500 hover:text-orange-400 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(activeMealPlan.meal_data.shopping_list).map(
                  ([category, items]: [string, any]) => (
                    <div key={category}>
                      <h5 className="text-sm font-medium text-gray-300 mb-2 capitalize">
                        {category.replace("_", " ")}
                      </h5>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {items.slice(0, 5).map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
