"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Types that match the server-side modules
export interface DynamicQuestion {
  id: string;
  text: string;
  type: "open_ended" | "multiple_choice" | "scale" | "yes_no" | "multi_select";
  category: string;
  options?:
    | string[]
    | { min: number; max: number; labels?: Record<string, string> };
  followUpConditions?: Record<string, string>;
  contextRequirements?: Record<string, any>;
  priority: number;
}

export interface WellnessContext {
  clientId: string;
  organizationId: string;
  conversationHistory: Array<{
    question: string;
    answer: string;
    timestamp: string;
  }>;
  learnedPreferences: Record<string, any>;
  goals: Record<string, any>;
  constraints: Record<string, any>;
  lifestyleFactors: Record<string, any>;
  currentPhase: "assessment" | "planning" | "adjustment" | "check-in";
  recentLogs?: Array<any>;
  trainingSchedule?: Array<any>;
}

export type WellnessPlan = any; // Will be loaded from API
import { createClient } from "@/app/lib/supabase/client";
import {
  Brain,
  Heart,
  Droplets,
  Moon,
  Activity,
  TrendingUp,
  Calendar,
  Edit3,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Target,
  Coffee,
  Apple,
  Dumbbell,
  Sun,
} from "lucide-react";

interface Message {
  id: string;
  type: "bot" | "user" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    question?: DynamicQuestion;
    planUpdate?: Partial<WellnessPlan>;
    insight?: string;
  };
}

interface EnhancedWellnessCoachProps {
  clientId: string;
  organizationId: string;
  onPlanCreated?: (plan: WellnessPlan) => void;
  existingPlan?: WellnessPlan;
  mode?: "chat" | "plan" | "progress";
}

export default function EnhancedWellnessCoach({
  clientId,
  organizationId,
  onPlanCreated,
  existingPlan,
  mode = "chat",
}: EnhancedWellnessCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] =
    useState<DynamicQuestion | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<WellnessContext>({
    clientId,
    organizationId,
    conversationHistory: [],
    learnedPreferences: {},
    goals: {},
    constraints: {},
    lifestyleFactors: {},
    currentPhase: "assessment",
  });
  const [wellnessPlan, setWellnessPlan] = useState<WellnessPlan | null>(
    existingPlan || null,
  );
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showPlanView, setShowPlanView] = useState(mode === "plan");
  const [showProgressView, setShowProgressView] = useState(mode === "progress");
  const [dailyLog, setDailyLog] = useState<any>({});
  const [progress, setProgress] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    initializeCoach();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeCoach = async () => {
    // Load existing conversation if any
    await loadConversationHistory();

    // Load existing plan if client has one
    if (!existingPlan) {
      await loadExistingPlan();
    }

    // Load progress data
    if (wellnessPlan) {
      await loadProgress();
    }

    // Start conversation or show plan based on mode
    if (mode === "chat" && !wellnessPlan) {
      startConversation();
    }
  };

  const loadConversationHistory = async () => {
    const { data } = await supabase
      .from("wellness_conversations")
      .select("*")
      .eq("client_id", clientId)
      .single();

    if (data) {
      setContext((prev) => ({
        ...prev,
        conversationHistory: data.conversation_history || [],
        learnedPreferences: data.learned_preferences || {},
        goals: data.goals || {},
        constraints: data.constraints || {},
        lifestyleFactors: data.lifestyle_factors || {},
        currentPhase: data.conversation_phase || "assessment",
      }));

      // Rebuild message history for UI
      const historyMessages: Message[] = (
        data.conversation_history || []
      ).flatMap((exchange: any) => [
        {
          id: `bot-${exchange.timestamp}`,
          type: "bot" as const,
          content: exchange.question,
          timestamp: new Date(exchange.timestamp),
        },
        {
          id: `user-${exchange.timestamp}`,
          type: "user" as const,
          content: exchange.answer,
          timestamp: new Date(exchange.timestamp),
        },
      ]);

      setMessages(historyMessages);
    }
  };

  const loadExistingPlan = async () => {
    const { data } = await supabase
      .from("wellness_plans")
      .select("*")
      .eq("client_id", clientId)
      .eq("status", "active")
      .single();

    if (data) {
      setWellnessPlan(data);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(
        "/api/wellness/get-progress?clientId=" + clientId + "&days=7",
      );
      const progressData = await response.json();
      setProgress(progressData);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const startConversation = async () => {
    const welcomeMessage: Message = {
      id: `welcome-${Date.now()}`,
      type: "bot",
      content:
        "Hi! I'm your personalized wellness coach. I'm here to help create a completely customized wellness plan that fits your unique lifestyle, goals, and preferences. Everything we design together will be 100% tailored to you - nothing generic or one-size-fits-all. Let's start by getting to know you better!",
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);

    // Generate first question
    setTimeout(() => {
      generateNextQuestion();
    }, 1500);
  };

  const generateNextQuestion = async () => {
    setIsLoading(true);

    try {
      // Call API to generate next question
      const response = await fetch("/api/wellness/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      const { question } = await response.json();

      if (question) {
        setCurrentQuestion(question);

        const questionMessage: Message = {
          id: `question-${Date.now()}`,
          type: "bot",
          content: question.text,
          timestamp: new Date(),
          metadata: { question },
        };

        setMessages((prev) => [...prev, questionMessage]);
      } else {
        // No more questions - create the plan
        if (!wellnessPlan) {
          createPersonalizedPlan();
        }
      }
    } catch (error) {
      console.error("Error generating question:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserResponse = async () => {
    if (!userInput.trim() || !currentQuestion) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Process the answer via API
    await fetch("/api/wellness/process-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQuestion,
        answer: userInput,
        context,
      }),
    });

    // Update context
    setContext((prev) => ({
      ...prev,
      conversationHistory: [
        ...prev.conversationHistory,
        {
          question: currentQuestion.text,
          answer: userInput,
          timestamp: new Date().toISOString(),
        },
      ],
    }));

    setUserInput("");
    setCurrentQuestion(null);

    // Check for follow-up conditions
    if (
      currentQuestion.followUpConditions &&
      currentQuestion.followUpConditions[userInput]
    ) {
      const followUpMessage: Message = {
        id: `followup-${Date.now()}`,
        type: "bot",
        content: currentQuestion.followUpConditions[userInput],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, followUpMessage]);

      // Generate specialized follow-up question
      setTimeout(() => {
        generateNextQuestion();
      }, 1000);
    } else {
      // Continue with next question
      setTimeout(() => {
        generateNextQuestion();
      }, 1000);
    }
  };

  const createPersonalizedPlan = async () => {
    setIsLoading(true);

    const transitionMessage: Message = {
      id: `transition-${Date.now()}`,
      type: "system",
      content:
        "🎉 Great! I now have everything I need to create your personalized wellness plan. Give me a moment to design something perfect for you...",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, transitionMessage]);

    try {
      // Call API to create plan
      const response = await fetch("/api/wellness/create-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          organizationId,
          context,
        }),
      });

      const { plan } = await response.json();

      setWellnessPlan(plan);
      setShowPlanView(true);

      const completionMessage: Message = {
        id: `completion-${Date.now()}`,
        type: "system",
        content:
          "✨ Your personalized wellness plan is ready! You can view and edit every aspect of it. Remember, this is YOUR plan - feel free to adjust anything to better fit your lifestyle.",
        timestamp: new Date(),
        metadata: { planUpdate: plan },
      };

      setMessages((prev) => [...prev, completionMessage]);

      if (onPlanCreated) {
        onPlanCreated(plan);
      }
    } catch (error) {
      console.error("Error creating plan:", error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "system",
        content:
          "I encountered an issue creating your plan. Let me try a different approach...",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePlanSection = async (section: string, updates: any) => {
    if (!wellnessPlan?.id) return;

    try {
      // Call API to update plan
      const response = await fetch("/api/wellness/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: wellnessPlan.id,
          updates: { [section]: updates },
        }),
      });

      const { plan: updatedPlan } = await response.json();

      setWellnessPlan(updatedPlan);
      setEditingSection(null);

      // Add update message
      const updateMessage: Message = {
        id: `update-${Date.now()}`,
        type: "system",
        content: `✅ ${section} has been updated successfully!`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, updateMessage]);
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  const logDailyProgress = async () => {
    if (!wellnessPlan?.id) return;

    try {
      // Call API to log progress
      await fetch("/api/wellness/log-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: wellnessPlan.id,
          date: new Date().toISOString().split("T")[0],
          logData: { ...dailyLog, clientId },
        }),
      });

      // Reload progress
      await loadProgress();

      const logMessage: Message = {
        id: `log-${Date.now()}`,
        type: "system",
        content: "📊 Daily progress logged successfully!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, logMessage]);
    } catch (error) {
      console.error("Error logging progress:", error);
    }
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case "multiple_choice":
      case "multi_select":
        return (
          <div className="grid grid-cols-2 gap-2">
            {(currentQuestion.options as string[])?.map((option: string) => (
              <button
                key={option}
                onClick={() => {
                  setUserInput(option);
                  if (currentQuestion.type === "multiple_choice") {
                    handleUserResponse();
                  }
                }}
                className={`p-3 rounded-lg border transition-all ${
                  userInput.includes(option)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case "scale":
        const scaleOptions = currentQuestion.options as {
          min: number;
          max: number;
          labels?: Record<string, string>;
        };
        return (
          <div className="space-y-3">
            <input
              type="range"
              min={scaleOptions.min}
              max={scaleOptions.max}
              value={userInput || scaleOptions.min}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {scaleOptions.labels?.[scaleOptions.min.toString()] ||
                  scaleOptions.min}
              </span>
              <span className="font-semibold">
                {userInput || scaleOptions.min}
              </span>
              <span>
                {scaleOptions.labels?.[scaleOptions.max.toString()] ||
                  scaleOptions.max}
              </span>
            </div>
          </div>
        );

      case "yes_no":
        return (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setUserInput("yes");
                handleUserResponse();
              }}
              className="flex-1 p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50"
            >
              Yes
            </button>
            <button
              onClick={() => {
                setUserInput("no");
                handleUserResponse();
              }}
              className="flex-1 p-3 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50"
            >
              No
            </button>
          </div>
        );

      default:
        return (
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleUserResponse()}
              placeholder="Type your response..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleUserResponse}
              disabled={!userInput.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </div>
        );
    }
  };

  const renderPlanView = () => {
    if (!wellnessPlan) return null;

    return (
      <div className="space-y-6">
        {/* Plan Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-2">{wellnessPlan.planName}</h2>
          <p className="opacity-90">Your personalized wellness journey</p>
        </div>

        {/* Meal Plans Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold">Nutrition Plan</h3>
            </div>
            <button
              onClick={() =>
                setEditingSection(editingSection === "meals" ? null : "meals")
              }
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {editingSection === "meals" ? (
            <div className="space-y-4">
              {/* Edit meal plans form */}
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={5}
                defaultValue={JSON.stringify(wellnessPlan.mealPlans, null, 2)}
                onBlur={(e) => {
                  try {
                    const updated = JSON.parse(e.target.value);
                    updatePlanSection("mealPlans", updated);
                  } catch (error) {
                    console.error("Invalid JSON");
                  }
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(wellnessPlan.mealPlans).map(
                ([mealType, meal]) => (
                  <div key={mealType} className="border rounded-lg p-4">
                    <h4 className="font-semibold capitalize mb-2">
                      {mealType}
                    </h4>
                    {meal && (
                      <div className="text-sm text-gray-600">
                        <p>{meal.name}</p>
                        <p className="mt-1">
                          {meal.calories} cal | P: {meal.macros.protein}g | C:{" "}
                          {meal.macros.carbs}g | F: {meal.macros.fats}g
                        </p>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Hydration Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Hydration</h3>
            </div>
            <button
              onClick={() =>
                setEditingSection(
                  editingSection === "hydration" ? null : "hydration",
                )
              }
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-3xl font-bold">
                {wellnessPlan.waterIntakeTarget} ml
              </p>
              <p className="text-sm text-gray-600">Daily target</p>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${((dailyLog.waterIntake || 0) / wellnessPlan.waterIntakeTarget) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {dailyLog.waterIntake || 0} ml consumed today
              </p>
            </div>
          </div>
        </div>

        {/* Sleep & Recovery Section */}
        {wellnessPlan.sleepSchedule && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold">Sleep & Recovery</h3>
              </div>
              <button
                onClick={() =>
                  setEditingSection(editingSection === "sleep" ? null : "sleep")
                }
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Bedtime</p>
                <p className="font-semibold">
                  {wellnessPlan.sleepSchedule.targetBedtime}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Wake time</p>
                <p className="font-semibold">
                  {wellnessPlan.sleepSchedule.targetWakeTime}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Habits Section */}
        {wellnessPlan.habitGoals && wellnessPlan.habitGoals.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Daily Habits</h3>
              </div>
            </div>

            <div className="space-y-3">
              {wellnessPlan.habitGoals.map((habit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={dailyLog.habitsCompleted?.includes(habit.habit)}
                    onChange={(e) => {
                      const completed = dailyLog.habitsCompleted || [];
                      if (e.target.checked) {
                        setDailyLog((prev) => ({
                          ...prev,
                          habitsCompleted: [...completed, habit.habit],
                        }));
                      } else {
                        setDailyLog((prev) => ({
                          ...prev,
                          habitsCompleted: completed.filter(
                            (h: string) => h !== habit.habit,
                          ),
                        }));
                      }
                    }}
                    className="w-5 h-5 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{habit.habit}</p>
                    <p className="text-sm text-gray-600">{habit.strategy}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      habit.type === "build"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {habit.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training Integration */}
        {wellnessPlan.trainingScheduleSync && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-semibold">Training Nutrition</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wellnessPlan.preWorkoutNutrition && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Pre-Workout</h4>
                  <p className="text-sm text-gray-600">
                    {wellnessPlan.preWorkoutNutrition.timing}
                  </p>
                  <ul className="text-sm mt-2">
                    {wellnessPlan.preWorkoutNutrition.foods.map((food, i) => (
                      <li key={i}>• {food}</li>
                    ))}
                  </ul>
                </div>
              )}

              {wellnessPlan.postWorkoutNutrition && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Post-Workout</h4>
                  <p className="text-sm text-gray-600">
                    {wellnessPlan.postWorkoutNutrition.timing}
                  </p>
                  <ul className="text-sm mt-2">
                    {wellnessPlan.postWorkoutNutrition.foods.map((food, i) => (
                      <li key={i}>• {food}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Progress Logging */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Log Today's Progress</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-600">Water (ml)</label>
              <input
                type="number"
                value={dailyLog.waterIntake || ""}
                onChange={(e) =>
                  setDailyLog((prev) => ({
                    ...prev,
                    waterIntake: parseInt(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Sleep (hours)</label>
              <input
                type="number"
                step="0.5"
                value={dailyLog.sleepHours || ""}
                onChange={(e) =>
                  setDailyLog((prev) => ({
                    ...prev,
                    sleepHours: parseFloat(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Energy Level</label>
              <select
                value={dailyLog.energyLevel || ""}
                onChange={(e) =>
                  setDailyLog((prev) => ({
                    ...prev,
                    energyLevel: parseInt(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Stress Level</label>
              <select
                value={dailyLog.stressLevel || ""}
                onChange={(e) =>
                  setDailyLog((prev) => ({
                    ...prev,
                    stressLevel: parseInt(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-600">Notes</label>
            <textarea
              value={dailyLog.notes || ""}
              onChange={(e) =>
                setDailyLog((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="How was your day? Any challenges or wins?"
            />
          </div>

          <button
            onClick={logDailyProgress}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Save Daily Log
          </button>
        </div>
      </div>
    );
  };

  const renderProgressView = () => {
    if (!progress) return null;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-2">Your Progress</h2>
          <p className="opacity-90">Last 7 days overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold">Sleep</h3>
            </div>
            <p className="text-2xl font-bold">
              {progress.summary?.averageSleep?.toFixed(1) || 0} hrs
            </p>
            <p className="text-sm text-gray-600">Average per night</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Hydration</h3>
            </div>
            <p className="text-2xl font-bold">
              {progress.summary?.averageWaterIntake || 0} ml
            </p>
            <p className="text-sm text-gray-600">Average per day</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Workouts</h3>
            </div>
            <p className="text-2xl font-bold">
              {progress.summary?.workoutsCompleted || 0}
            </p>
            <p className="text-sm text-gray-600">Completed this week</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Trend Analysis</h3>
          <div className="flex items-center gap-2">
            <TrendingUp
              className={`w-5 h-5 ${
                progress.summary?.overallTrend === "improving"
                  ? "text-green-500"
                  : progress.summary?.overallTrend === "declining"
                    ? "text-red-500"
                    : "text-gray-500"
              }`}
            />
            <p className="font-medium">
              {progress.summary?.overallTrend === "improving"
                ? "You're improving! Keep up the great work!"
                : progress.summary?.overallTrend === "declining"
                  ? "Let's refocus on your goals together."
                  : "You're maintaining steady progress."}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setShowPlanView(false);
            setShowProgressView(false);
          }}
          className={`px-4 py-2 rounded-lg ${
            !showPlanView && !showProgressView
              ? "bg-blue-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span>Coach Chat</span>
          </div>
        </button>

        {wellnessPlan && (
          <>
            <button
              onClick={() => {
                setShowPlanView(true);
                setShowProgressView(false);
              }}
              className={`px-4 py-2 rounded-lg ${
                showPlanView
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>My Plan</span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowPlanView(false);
                setShowProgressView(true);
                loadProgress();
              }}
              className={`px-4 py-2 rounded-lg ${
                showProgressView
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Progress</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      {showPlanView ? (
        renderPlanView()
      ) : showProgressView ? (
        renderProgressView()
      ) : (
        <div className="bg-white rounded-xl shadow-sm">
          {/* Chat Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-lg ${
                      message.type === "user"
                        ? "bg-blue-500 text-white"
                        : message.type === "system"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.type === "bot" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4" />
                        <span className="text-xs font-medium">AI Coach</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-6">
            {currentQuestion ? (
              renderQuestionInput()
            ) : (
              <div className="text-center text-gray-500">
                {wellnessPlan
                  ? "Your wellness plan is ready! Check the 'My Plan' tab to view and customize it."
                  : "Conversation complete. Generating your personalized plan..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
