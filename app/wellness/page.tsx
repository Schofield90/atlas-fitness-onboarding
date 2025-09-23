"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import dynamic from "next/dynamic";
import {
  Heart,
  Brain,
  Activity,
  Target,
  TrendingUp,
  Calendar,
  Settings,
  Loader2,
} from "lucide-react";

// Dynamic import to avoid SSR issues
const EnhancedWellnessCoach = dynamic(
  () => import("@/app/components/nutrition/EnhancedWellnessCoach"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    ),
  },
);

export default function WellnessPage() {
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [client, setClient] = useState<any>(null);
  const [existingPlan, setExistingPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<
    "overview" | "coach" | "plan" | "progress"
  >("overview");
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);

        // Get client record
        const { data: clientData } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", authUser.id)
          .single();

        if (clientData) {
          setClient(clientData);
          setOrganizationId(clientData.organization_id);

          // Check for existing wellness plan
          const { data: planData } = await supabase
            .from("wellness_plans")
            .select("*")
            .eq("client_id", clientData.id)
            .eq("status", "active")
            .single();

          if (planData) {
            setExistingPlan(planData);
          }
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const handlePlanCreated = (plan: any) => {
    setExistingPlan(plan);
    setActiveView("plan");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">
            Please log in to access your wellness dashboard.
          </p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to Your Wellness Hub
        </h1>
        <p className="text-lg opacity-90">
          Your personalized journey to complete health and wellbeing starts here
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setActiveView("coach")}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold">AI Wellness Coach</h3>
          </div>
          <p className="text-gray-600">
            Chat with your personalized AI coach to create and refine your
            wellness plan
          </p>
          {!existingPlan && (
            <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              Start Here
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView("plan")}
          className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left ${
            !existingPlan ? "opacity-60 cursor-not-allowed" : ""
          }`}
          disabled={!existingPlan}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold">My Wellness Plan</h3>
          </div>
          <p className="text-gray-600">
            View and customize your personalized nutrition, sleep, and wellness
            plan
          </p>
          {existingPlan && (
            <span className="inline-block mt-3 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Active Plan
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView("progress")}
          className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left ${
            !existingPlan ? "opacity-60 cursor-not-allowed" : ""
          }`}
          disabled={!existingPlan}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Progress Tracking</h3>
          </div>
          <p className="text-gray-600">
            Monitor your daily progress and see insights about your wellness
            journey
          </p>
        </button>
      </div>

      {/* Features Grid */}
      <div className="bg-white rounded-xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold mb-6">What Makes Your Plan Unique</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-1">100% Personalized</h3>
              <p className="text-gray-600 text-sm">
                Every aspect of your plan is tailored to your unique goals,
                preferences, and lifestyle
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Training Integration</h3>
              <p className="text-gray-600 text-sm">
                Your nutrition and recovery automatically adapt to your workout
                schedule
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI-Powered Insights</h3>
              <p className="text-gray-600 text-sm">
                Smart recommendations that evolve based on your progress and
                feedback
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Holistic Approach</h3>
              <p className="text-gray-600 text-sm">
                Covers nutrition, hydration, sleep, recovery, stress, and mental
                wellbeing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats (if plan exists) */}
      {existingPlan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Daily Calories</p>
            <p className="text-2xl font-bold text-blue-600">
              {existingPlan.nutrition_targets?.calories || "2000"}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Water Target</p>
            <p className="text-2xl font-bold text-blue-600">
              {existingPlan.water_intake_target || "2500"}ml
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Sleep Target</p>
            <p className="text-2xl font-bold text-blue-600">
              {existingPlan.sleep_schedule?.targetBedtime ? "8" : "7-9"}h
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-1">Active Habits</p>
            <p className="text-2xl font-bold text-blue-600">
              {existingPlan.habit_goals?.length || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation */}
      <div className="mb-6">
        <button
          onClick={() => setActiveView("overview")}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          ← Back to Overview
        </button>
      </div>

      {/* Content */}
      {activeView === "overview" && renderOverview()}

      {activeView === "coach" && (
        <EnhancedWellnessCoach
          clientId={client.id}
          organizationId={client.organization_id}
          onPlanCreated={handlePlanCreated}
          existingPlan={existingPlan}
          mode="chat"
        />
      )}

      {activeView === "plan" && existingPlan && (
        <EnhancedWellnessCoach
          clientId={client.id}
          organizationId={client.organization_id}
          existingPlan={existingPlan}
          mode="plan"
        />
      )}

      {activeView === "progress" && existingPlan && (
        <EnhancedWellnessCoach
          clientId={client.id}
          organizationId={client.organization_id}
          existingPlan={existingPlan}
          mode="progress"
        />
      )}
    </div>
  );
}
