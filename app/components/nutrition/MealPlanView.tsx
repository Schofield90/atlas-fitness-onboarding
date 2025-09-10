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
    // AI meal plan generation will be implemented here
    setTimeout(() => {
      setGenerating(false);
    }, 2000);
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
        <div>
          <p className="text-gray-400">
            Meal plan functionality coming soon...
          </p>
        </div>
      )}
    </div>
  );
}
