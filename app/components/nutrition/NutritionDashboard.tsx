"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import NutritionSetup from "./NutritionSetup";
import MealPlanView from "./MealPlanView";
import MacroTracker from "./MacroTracker";
import AdvancedCoach from "./AdvancedCoach";
import ProgressTracker from "./ProgressTracker";
import BehavioralCoach from "./BehavioralCoach";
import {
  Utensils,
  TrendingUp,
  Calendar,
  Settings,
  ChevronLeft,
  Activity,
  Target,
  Brain,
  Sparkles,
  MessageSquare,
  Heart,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PreferenceCollectorModal from "./PreferenceCollectorModal";

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
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "coach" | "meal-plan" | "progress" | "habits" | "macros"
  >("coach"); // Default to coach tab for high-level coaching experience
  const supabase = createClient();

  useEffect(() => {
    loadNutritionData();
  }, [client]);

  const loadNutritionData = async () => {
    try {
      // Use the API endpoint to fetch profile (bypasses RLS issues)
      // Add cache-busting to ensure fresh data across devices
      console.log("Loading nutrition data for client:", client?.id);
      const response = await fetch(`/api/nutrition/profile?t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      const result = await response.json();
      console.log("Nutrition profile API response:", result);

      if (result.success && result.data) {
        console.log("Found existing nutrition profile:", result.data);
        setNutritionProfile(result.data);
        setShowSetup(false);
        console.log("Updated state: nutritionProfile set, showSetup=false");

        // Set the active tab to coach when we have a profile for high-level coaching
        setActiveTab("coach");

        // Try to load active meal plans using API to bypass RLS
        try {
          const mealPlanResponse = await fetch(
            `/api/nutrition/meal-plans?profileId=${result.data.id}`,
          );

          if (mealPlanResponse.ok) {
            const mealPlanResult = await mealPlanResponse.json();
            if (
              mealPlanResult.success &&
              mealPlanResult.data &&
              mealPlanResult.data.length > 0
            ) {
              console.log(
                `Found ${mealPlanResult.data.length} meal plans:`,
                mealPlanResult.data,
              );
              // Set the most recent meal plan as active
              const mostRecent =
                mealPlanResult.data[mealPlanResult.data.length - 1];
              setActiveMealPlan(mostRecent);
            }
          }
        } catch (mealPlanError) {
          console.error("Error loading meal plans:", mealPlanError);
        }
      } else {
        // No profile found, show setup
        console.log(
          "No nutrition profile found, showing setup. Result:",
          result,
        );
        // Don't set showSetup to true here - let the profile check handle it
        // setShowSetup(true);
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      // Don't show setup on error - might be a temporary issue
      // setShowSetup(true);
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
          if (
            mealPlanResult.success &&
            mealPlanResult.data &&
            mealPlanResult.data.length > 0
          ) {
            console.log(
              `Found ${mealPlanResult.data.length} meal plans after profile creation:`,
              mealPlanResult.data,
            );
            // Set the most recent meal plan as active
            const mostRecent =
              mealPlanResult.data[mealPlanResult.data.length - 1];
            setActiveMealPlan(mostRecent);
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

  // Show setup form if showSetup is true and no profile exists
  if (showSetup && !nutritionProfile && !loading) {
    console.log(
      "Showing setup form. Loading:",
      loading,
      "Profile:",
      nutritionProfile,
      "ShowSetup:",
      showSetup,
    );
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

  console.log(
    "Render: Loading:",
    loading,
    "Profile:",
    !!nutritionProfile,
    "ShowSetup:",
    showSetup,
  );

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreferenceModal(true)}
                className="px-4 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-2 shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                Make Your Plan More Accurate
              </button>
              <button
                onClick={() => router.push("/recipes")}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Recipe Library
              </button>
              <button
                onClick={() => setShowSetup(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("coach")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "coach"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              AI Coach
            </button>
            <button
              onClick={() => setActiveTab("meal-plan")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "meal-plan"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <Utensils className="h-4 w-4" />
              Meal Plan
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "progress"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Progress
            </button>
            <button
              onClick={() => setActiveTab("habits")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "habits"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <Trophy className="h-4 w-4" />
              Habits
            </button>
            <button
              onClick={() => setActiveTab("macros")}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "macros"
                  ? "border-orange-500 text-orange-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              <Activity className="h-4 w-4" />
              Track Macros
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
                <p className="text-sm text-gray-400">
                  {nutritionProfile
                    ? "No active meal plan"
                    : "Set up your profile to generate meal plans"}
                </p>
                <button
                  onClick={() => {
                    console.log(
                      "Button clicked! Profile:",
                      nutritionProfile,
                      "Loading:",
                      loading,
                    );
                    if (nutritionProfile) {
                      console.log(
                        "Has profile, setting active tab to meal-plan",
                      );
                      setActiveTab("meal-plan");
                    } else {
                      console.log("No profile, setting showSetup to true");
                      setShowSetup(true);
                    }
                  }}
                  className="w-full bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition-colors"
                >
                  {nutritionProfile
                    ? "Generate AI Meal Plan"
                    : "Set Up Profile"}
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
          {activeTab === "coach" && (
            <div
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
              style={{ height: "600px" }}
            >
              <AdvancedCoach
                clientId={client?.id}
                onPhaseComplete={(phase, insights) => {
                  console.log("Coaching phase completed:", phase, insights);
                }}
              />
            </div>
          )}

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

          {activeTab === "progress" && (
            <ProgressTracker
              clientId={client?.id}
              onInsightGenerated={(insights) => {
                console.log("Progress insights generated:", insights);
              }}
            />
          )}

          {activeTab === "habits" && (
            <BehavioralCoach
              clientId={client?.id}
              onHabitComplete={(habit) => {
                console.log("Habit completed:", habit);
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
        </div>
      </div>

      {/* Preference Collector Modal */}
      <PreferenceCollectorModal
        isOpen={showPreferenceModal}
        onClose={() => setShowPreferenceModal(false)}
        clientId={client?.id}
        onPreferencesUpdated={() => {
          loadNutritionData();
          setShowPreferenceModal(false);
        }}
      />
    </div>
  );
}
