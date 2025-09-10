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
    "overview" | "meal-plan" | "macros" | "progress"
  >("overview");
  const supabase = createClient();

  useEffect(() => {
    loadNutritionData();
  }, [client]);

  const loadNutritionData = async () => {
    try {
      // Try to load existing nutrition profile
      const { data: profile, error: profileError } = await supabase
        .from("nutrition_profiles")
        .select("*")
        .or(
          `client_id.eq.${client.id},lead_id.eq.${client.lead_id || client.id}`,
        )
        .single();

      if (profile && !profileError) {
        setNutritionProfile(profile);
        setShowSetup(false);

        // Try to load active meal plan
        const { data: mealPlan } = await supabase
          .from("meal_plans")
          .select("*")
          .eq("nutrition_profile_id", profile.id)
          .eq("is_active", true)
          .single();

        if (mealPlan) {
          setActiveMealPlan(mealPlan);
        }
      } else {
        // No profile found, show setup
        setShowSetup(true);
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      setShowSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = (profile: any) => {
    setNutritionProfile(profile);
    setShowSetup(false);
    loadNutritionData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (showSetup || !nutritionProfile) {
    return (
      <NutritionSetup
        client={client}
        onComplete={handleProfileComplete}
        existingProfile={nutritionProfile}
      />
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
                <button className="w-full bg-orange-500 text-white rounded-lg px-4 py-2 hover:bg-orange-600 transition-colors">
                  View Meal Plan
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">No active meal plan</p>
                <button
                  onClick={() => alert("AI meal plan generation coming soon!")}
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
          {activeTab === "overview" && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                Welcome to Your AI Nutrition Coach
              </h2>
              <p className="text-gray-400 mb-4">
                Your personalized nutrition profile has been created. You can
                now:
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-2">
                <li>Generate AI-powered meal plans tailored to your goals</li>
                <li>Track your daily macro intake</li>
                <li>Monitor your progress over time</li>
                <li>Get recipe suggestions based on your preferences</li>
              </ul>
            </div>
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
