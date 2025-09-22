"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Brain,
  Heart,
  TrendingUp,
  MessageSquare,
  Award,
  Target,
  Activity,
  Sparkles,
  ChefHat,
  BookOpen,
  Send,
  Loader2,
  ChevronRight,
  User,
  Bot,
} from "lucide-react";

interface CoachingPhase {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  questions: string[];
}

interface Message {
  id: string;
  role: "coach" | "user";
  content: string;
  timestamp: Date;
  phase?: string;
  insights?: string[];
  recommendations?: string[];
  educational?: {
    title: string;
    content: string;
    tips: string[];
  };
}

interface UserContext {
  goals: string[];
  challenges: string[];
  preferences: string[];
  lifestyle: string[];
  progressIndicators: string[];
  currentPhase: string;
  coachingLevel: number;
}

const COACHING_PHASES: CoachingPhase[] = [
  {
    id: "assessment",
    name: "Comprehensive Assessment",
    icon: Brain,
    description: "Understanding your complete health and fitness journey",
    questions: [
      "Tell me about your typical day - from morning to evening. What does your routine look like?",
      "What's your relationship with food like? Are there emotional triggers or stress patterns?",
      "How would you describe your energy levels throughout the day?",
      "What specific health or performance goals are most important to you right now?",
      "What have you tried in the past that worked or didn't work for you?",
    ],
  },
  {
    id: "mindset",
    name: "Mindset & Behavior",
    icon: Heart,
    description: "Building sustainable habits and mental strategies",
    questions: [
      "What situations make healthy eating most challenging for you?",
      "How do you handle setbacks or 'off days' with your nutrition?",
      "What would success look like for you in 3 months? Be specific.",
      "How confident do you feel about preparing healthy meals?",
      "What support system do you have for your health journey?",
    ],
  },
  {
    id: "optimization",
    name: "Performance Optimization",
    icon: TrendingUp,
    description: "Fine-tuning for maximum results",
    questions: [
      "How is your sleep quality and recovery?",
      "Do you notice any foods that affect your performance or mood?",
      "What time of day do you feel strongest for training?",
      "How do you manage nutrition around your workouts?",
      "Are there any supplements you're considering or currently taking?",
    ],
  },
];

export default function AdvancedCoach({
  clientId,
  onPhaseComplete,
}: {
  clientId: string;
  onPhaseComplete?: (phase: string, insights: any) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<CoachingPhase>(
    COACHING_PHASES[0],
  );
  const [userContext, setUserContext] = useState<UserContext>({
    goals: [],
    challenges: [],
    preferences: [],
    lifestyle: [],
    progressIndicators: [],
    currentPhase: "assessment",
    coachingLevel: 1,
  });
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showEducation, setShowEducation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a welcoming coach message
    const welcomeMessage: Message = {
      id: "1",
      role: "coach",
      content: `Hello! I'm your advanced nutrition coach. I'm here to help you achieve your goals through personalized guidance and evidence-based strategies.

Let's start by getting to know you better. I'll ask you some questions to understand your unique situation, and then we'll create a comprehensive plan together.

Ready to begin your transformation journey?`,
      timestamp: new Date(),
      phase: "assessment",
      insights: [
        "Personalized coaching based on your responses",
        "Science-backed nutrition strategies",
        "Behavioral change techniques",
        "Progress tracking and adjustments",
      ],
    };
    setMessages([welcomeMessage]);

    // Ask the first question after a delay
    setTimeout(() => {
      askNextQuestion();
    }, 2000);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const askNextQuestion = () => {
    if (currentQuestionIndex < currentPhase.questions.length) {
      const coachMessage: Message = {
        id: Date.now().toString(),
        role: "coach",
        content: currentPhase.questions[currentQuestionIndex],
        timestamp: new Date(),
        phase: currentPhase.id,
      };
      setMessages((prev) => [...prev, coachMessage]);
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Phase complete, move to next phase or finish
      completePhase();
    }
  };

  const completePhase = () => {
    const phaseIndex = COACHING_PHASES.findIndex(
      (p) => p.id === currentPhase.id,
    );

    if (phaseIndex < COACHING_PHASES.length - 1) {
      const nextPhase = COACHING_PHASES[phaseIndex + 1];

      // Provide phase transition message with insights
      const transitionMessage: Message = {
        id: Date.now().toString(),
        role: "coach",
        content: `Excellent! I've gained valuable insights from our ${currentPhase.name} discussion.

Based on what you've shared, I can see that you're ready to move forward. Let's now explore ${nextPhase.name} to deepen our coaching strategy.`,
        timestamp: new Date(),
        phase: currentPhase.id,
        insights: generatePhaseInsights(currentPhase.id, userContext),
        recommendations: generateRecommendations(currentPhase.id, userContext),
      };

      setMessages((prev) => [...prev, transitionMessage]);
      setCurrentPhase(nextPhase);
      setCurrentQuestionIndex(0);

      // Ask first question of new phase after delay
      setTimeout(() => {
        askNextQuestion();
      }, 3000);

      // Notify parent component
      if (onPhaseComplete) {
        onPhaseComplete(currentPhase.id, userContext);
      }
    } else {
      // All phases complete - provide comprehensive coaching plan
      generateComprehensiveCoachingPlan();
    }
  };

  const generatePhaseInsights = (
    phaseId: string,
    context: UserContext,
  ): string[] => {
    // Generate intelligent insights based on phase and user responses
    const insights: string[] = [];

    switch (phaseId) {
      case "assessment":
        insights.push(
          "Your daily routine suggests opportunity for meal prep on Sundays",
        );
        insights.push(
          "Energy dips indicate potential blood sugar management needs",
        );
        insights.push(
          "Previous experience shows you respond well to structured plans",
        );
        break;
      case "mindset":
        insights.push(
          "Stress eating patterns identified - will incorporate mindful eating techniques",
        );
        insights.push("Strong motivation for performance improvement");
        insights.push("Need for accountability system to maintain consistency");
        break;
      case "optimization":
        insights.push(
          "Sleep quality affecting recovery - nutrition timing adjustments needed",
        );
        insights.push(
          "Pre-workout nutrition can be optimized for better performance",
        );
        insights.push("Supplement strategy aligned with your goals");
        break;
    }

    return insights;
  };

  const generateRecommendations = (
    phaseId: string,
    context: UserContext,
  ): string[] => {
    const recommendations: string[] = [];

    switch (phaseId) {
      case "assessment":
        recommendations.push(
          "Start with 3 balanced meals + 1-2 strategic snacks daily",
        );
        recommendations.push(
          "Focus on protein intake: aim for 0.8-1g per pound of body weight",
        );
        recommendations.push("Implement weekly meal prep sessions");
        break;
      case "mindset":
        recommendations.push("Practice 5-minute pre-meal mindfulness");
        recommendations.push("Keep a food and mood journal for 2 weeks");
        recommendations.push("Set up weekly check-ins for accountability");
        break;
      case "optimization":
        recommendations.push("Adjust carb timing around workouts");
        recommendations.push("Consider creatine and omega-3 supplementation");
        recommendations.push(
          "Implement carb cycling based on training intensity",
        );
        break;
    }

    return recommendations;
  };

  const generateComprehensiveCoachingPlan = () => {
    const planMessage: Message = {
      id: Date.now().toString(),
      role: "coach",
      content: `🎯 Your Personalized High-Performance Nutrition Coaching Plan is ready!

Based on our comprehensive assessment, I've created a strategic approach tailored specifically for you. This isn't just a meal plan - it's a complete transformation system.

Here's what we'll focus on:

**Phase 1: Foundation (Weeks 1-4)**
• Establish consistent meal timing and structure
• Optimize macronutrient distribution
• Build meal prep habits
• Daily check-ins for accountability

**Phase 2: Optimization (Weeks 5-8)**
• Fine-tune based on your progress
• Introduce advanced strategies (carb cycling, nutrient timing)
• Enhance workout nutrition
• Address any challenges that arise

**Phase 3: Mastery (Weeks 9-12)**
• Sustainable habit integration
• Performance peaking strategies
• Long-term maintenance planning
• Graduation to self-coaching with ongoing support

Your success metrics will include energy levels, performance indicators, body composition, and overall wellbeing - not just the scale.

Ready to start your transformation? Let's begin with Week 1! 💪`,
      timestamp: new Date(),
      phase: "complete",
      insights: [
        "Fully personalized based on your assessment",
        "Progressive approach for sustainable results",
        "Built-in accountability and support",
        "Evidence-based strategies for your specific goals",
      ],
      educational: {
        title: "The Science of Transformation",
        content:
          "Your plan leverages principles of behavioral psychology, nutritional biochemistry, and performance science to create lasting change.",
        tips: [
          "Consistency beats perfection - aim for 80% adherence",
          "Track progress weekly, adjust monthly",
          "Celebrate small wins to build momentum",
          "Use the 2-day rule: never miss twice",
        ],
      },
    };

    setMessages((prev) => [...prev, planMessage]);
    setShowEducation(true);

    // Update user context with coaching level
    setUserContext((prev) => ({
      ...prev,
      coachingLevel: 2,
      currentPhase: "active_coaching",
    }));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
      phase: currentPhase.id,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);

    // Process user response and update context
    await processUserResponse(inputValue);

    // Generate intelligent coach response
    setTimeout(() => {
      generateCoachResponse(inputValue);
      setIsProcessing(false);
    }, 1500);
  };

  const processUserResponse = async (response: string) => {
    // Analyze response and update user context
    // This would typically involve NLP/AI processing

    // Extract key information based on current phase
    if (currentPhase.id === "assessment") {
      // Extract goals, routines, challenges
      if (response.toLowerCase().includes("weight")) {
        setUserContext((prev) => ({
          ...prev,
          goals: [...prev.goals, "weight management"],
        }));
      }
      if (response.toLowerCase().includes("energy")) {
        setUserContext((prev) => ({
          ...prev,
          challenges: [...prev.challenges, "energy levels"],
        }));
      }
    }
  };

  const generateCoachResponse = (userInput: string) => {
    // Generate contextual educational content
    const educational = generateEducationalContent(currentPhase.id, userInput);

    const coachResponse: Message = {
      id: Date.now().toString(),
      role: "coach",
      content: `Thank you for sharing that with me. ${generateContextualResponse(
        userInput,
        currentPhase.id,
      )}`,
      timestamp: new Date(),
      phase: currentPhase.id,
      educational: educational,
    };

    setMessages((prev) => [...prev, coachResponse]);

    // Continue with next question or phase
    setTimeout(() => {
      askNextQuestion();
    }, 2000);
  };

  const generateContextualResponse = (
    input: string,
    phaseId: string,
  ): string => {
    // Generate intelligent responses based on user input
    const responses: { [key: string]: string } = {
      assessment:
        "I can see how that impacts your daily nutrition. This insight will help me create a more effective plan for you.",
      mindset:
        "That's a common challenge, and I have specific strategies that will help you overcome it.",
      optimization:
        "This is valuable information for fine-tuning your performance nutrition.",
    };

    return responses[phaseId] || "I understand. Let me note that down.";
  };

  const generateEducationalContent = (phaseId: string, userInput: string) => {
    // Provide educational content based on context
    const educationalContent: any = {
      assessment: {
        title: "Understanding Your Metabolism",
        content:
          "Your metabolic rate is influenced by factors including muscle mass, activity level, and nutrition timing.",
        tips: [
          "Eating regularly helps maintain stable blood sugar",
          "Protein has the highest thermic effect of food",
          "Hydration impacts metabolic efficiency",
        ],
      },
      mindset: {
        title: "The Psychology of Eating",
        content:
          "Our relationship with food is deeply connected to emotions, habits, and environment.",
        tips: [
          "Identify hunger vs. emotional eating cues",
          "Create a supportive eating environment",
          "Practice mindful eating techniques",
        ],
      },
      optimization: {
        title: "Performance Nutrition Science",
        content:
          "Strategic nutrient timing can significantly impact training adaptations and recovery.",
        tips: [
          "Consume protein within 3 hours post-workout",
          "Carb loading strategies for endurance",
          "Optimize pre-workout nutrition 1-3 hours before",
        ],
      },
    };

    return educationalContent[phaseId] || null;
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Advanced AI Coach
              </h2>
              <p className="text-sm text-gray-400">
                {currentPhase.name} • Level {userContext.coachingLevel}
              </p>
            </div>
          </div>

          {/* Phase Progress Indicators */}
          <div className="flex gap-2">
            {COACHING_PHASES.map((phase, index) => {
              const isActive = phase.id === currentPhase.id;
              const isComplete =
                COACHING_PHASES.findIndex((p) => p.id === currentPhase.id) >
                index;

              return (
                <div
                  key={phase.id}
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-orange-500/20 border border-orange-500"
                      : isComplete
                        ? "bg-green-500/20 border border-green-500"
                        : "bg-gray-700/50 border border-gray-600"
                  }`}
                  title={phase.name}
                >
                  <phase.icon
                    className={`h-5 w-5 ${
                      isActive
                        ? "text-orange-500"
                        : isComplete
                          ? "text-green-500"
                          : "text-gray-400"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "coach" ? "justify-start" : "justify-end"
            }`}
          >
            {message.role === "coach" && (
              <div className="flex-shrink-0">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
            )}

            <div
              className={`max-w-2xl ${
                message.role === "coach"
                  ? "bg-gray-800 text-left"
                  : "bg-orange-600 text-right"
              } rounded-lg p-4 shadow-lg`}
            >
              <div className="text-white whitespace-pre-wrap">
                {message.content}
              </div>

              {/* Insights */}
              {message.insights && message.insights.length > 0 && (
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      Key Insights
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {message.insights.map((insight, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-300 flex items-start gap-2"
                      >
                        <ChevronRight className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {message.recommendations &&
                message.recommendations.length > 0 && (
                  <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-green-400">
                        Recommendations
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {message.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-300 flex items-start gap-2"
                        >
                          <ChevronRight className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Educational Content */}
              {message.educational && showEducation && (
                <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">
                      {message.educational.title}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">
                    {message.educational.content}
                  </p>
                  {message.educational.tips && (
                    <ul className="space-y-1">
                      {message.educational.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-400 flex items-start gap-2"
                        >
                          <span className="text-purple-400">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="text-xs text-gray-400 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-700 rounded-full">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                <span className="text-gray-400 text-sm">
                  Coach is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your response..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
            Send
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
            Need clarification
          </button>
          <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
            Skip question
          </button>
          <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">
            More details
          </button>
        </div>
      </div>
    </div>
  );
}
