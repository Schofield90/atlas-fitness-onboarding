"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import NutritionSetup from "./NutritionSetup";
import MealPlanView from "./MealPlanView";
import MacroTracker from "./MacroTracker";
import {
  Utensils,
  TrendingUp,
  Calendar,
  Settings,
  ChevronLeft,
  Activity,
  Target,
  Brain,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface NutritionDashboardProps {
  client: any;
}

export default function NutritionDashboard({
  client,
}: NutritionDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [nutritionProfile, setNutritionProfile] = useState<any>(null);
  const [activeMealPlan, setActiveMealPlan] = useState<any>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "meal-plan" | "macros" | "progress"
  >("meal-plan"); // Default to meal-plan tab
  const supabase = createClient();

  useEffect(() => {
    loadNutritionData();
  }, [client]);

  const loadNutritionData = async () => {
    try {
      // Use the API endpoint to fetch profile (bypasses RLS issues)
      console.log("Loading nutrition data for client:", client?.id);
      const response = await fetch("/api/nutrition/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      console.log("Nutrition profile API response:", result);

      if (result.success && result.data) {
        console.log("Found existing nutrition profile:", result.data);
        setNutritionProfile(result.data);
        setShowSetup(false);

        // Try to load active meal plan using API to bypass RLS
        try {
          const mealPlanResponse = await fetch(
            `/api/nutrition/meal-plans?profileId=${result.data.id}`,
          );

          if (mealPlanResponse.ok) {
            const mealPlanResult = await mealPlanResponse.json();
            if (mealPlanResult.success && mealPlanResult.data) {
              console.log("Found active meal plan:", mealPlanResult.data);
              setActiveMealPlan(mealPlanResult.data);
            }
          }
        } catch (mealPlanError) {
          console.error("Error loading meal plan:", mealPlanError);
        }
      } else {
        // No profile found, show setup
        console.log("No nutrition profile found, showing setup");
        setShowSetup(true);
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      setShowSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async (profile: any) => {
    console.log("Profile setup completed, received profile:", profile);
    setNutritionProfile(profile);
    setShowSetup(false);

    // Load meal plans for the newly created profile using API
    if (profile?.id) {
      try {
        const mealPlanResponse = await fetch(
          `/api/nutrition/meal-plans?profileId=${profile.id}`,
        );

        if (mealPlanResponse.ok) {
          const mealPlanResult = await mealPlanResponse.json();
          if (mealPlanResult.success && mealPlanResult.data) {
            console.log(
              "Found active meal plan after profile creation:",
              mealPlanResult.data,
            );
            setActiveMealPlan(mealPlanResult.data);
          }
        }
      } catch (error) {
        console.log("No active meal plan found yet");
      }
    }
    // Don't call loadNutritionData() here as it might reset the state
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Only show setup if no profile exists at all (not when updating profile)
  if (!nutritionProfile && !loading) {
    return (
      <NutritionSetup
        client={client}
        onComplete={handleProfileComplete}
        existingProfile={nutritionProfile}
      />
    );
  }

  // Show setup modal for updating profile
  if (showSetup && nutritionProfile) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSetup(false)}
        />
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-800 rounded-lg">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  Update Nutrition Profile
                </h2>
                <button
                  onClick={() => setShowSetup(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              <div className="p-4">
                <NutritionSetup
                  client={client}
                  onComplete={(profile) => {
                    handleProfileComplete(profile);
                    setShowSetup(false);
                  }}
                  existingProfile={nutritionProfile}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/client")}
                className="mr-4 text-gray-300 hover:text-orange-500 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Brain className="h-6 w-6 text-orange-500" />
                  AI Nutrition Coach
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Your personalized nutrition assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSetup(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("meal-plan")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "meal-plan"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              Meal Plan
            </button>
            <button
              onClick={() => setActiveTab("macros")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "macros"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              Track Macros
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "progress"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              Progress
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Summary */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Your Profile
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Daily Calories:</span>
                <span className="text-white font-medium">
                  {nutritionProfile?.target_calories ||
                    nutritionProfile?.tdee ||
                    "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protein:</span>
                <span className="text-white font-medium">
                  {nutritionProfile?.protein_grams ||
                    nutritionProfile?.target_protein ||
                    0}
                  g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Carbs:</span>
                <span className="text-white font-medium">
                  {nutritionProfile?.carbs_grams ||
                    nutritionProfile?.target_carbs ||
                    0}
                  g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fat:</span>
                <span className="text-white font-medium">
                  {nutritionProfile?.fat_grams ||
                    nutritionProfile?.target_fat ||
                    0}
                  g
                </span>
              </div>
            </div>
          </div>

          {/* Meal Plan Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Meal Plan</h3>
            {activeMealPlan ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Active plan found</p>
                <button
                  onClick={() => setActiveTab("meal-plan")}
                  className="w-full bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition-colors"
                >
                  View Meal Plan
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">No active meal plan</p>
                <button
                  onClick={() => setActiveTab("meal-plan")}
                  className="w-full bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition-colors"
                >
                  Generate AI Meal Plan
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("macros")}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                <Activity className="inline h-4 w-4 mr-2" />
                Track Today's Macros
              </button>
              <button
                onClick={() => setActiveTab("progress")}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                <TrendingUp className="inline h-4 w-4 mr-2" />
                View Progress
              </button>
              <button
                onClick={() => setShowSetup(true)}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                <Settings className="inline h-4 w-4 mr-2" />
                Update Profile
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "meal-plan" && (
            <MealPlanView
              client={client}
              nutritionProfile={nutritionProfile}
              activeMealPlan={activeMealPlan}
              onPlanUpdate={(plan) => {
                setActiveMealPlan(plan);
                setActiveTab("meal-plan");
              }}
            />
          )}

          {activeTab === "macros" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Macro Tracking
              </h2>
              <p className="text-gray-400">
                Macro tracking feature coming soon...
              </p>
            </div>
          )}

          {activeTab === "progress" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Your Progress
              </h2>
              <p className="text-gray-400">
                Progress tracking feature coming soon...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
