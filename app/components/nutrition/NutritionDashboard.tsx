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
      // For now, since tables don't exist yet, just set loading to false
      setLoading(false);
      setShowSetup(true);
    } catch (error) {
      console.error("Error loading nutrition data:", error);
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

      {/* Content will be added here */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-white">Nutrition dashboard content coming soon...</p>
      </div>
    </div>
  );
}
