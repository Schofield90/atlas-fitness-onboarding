"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Brain, CheckCircle, Circle } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

interface PreferenceCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onPreferencesUpdated: () => void;
}

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface PreferenceData {
  dietary_restrictions: string[];
  allergies: string[];
  favorite_foods: string[];
  disliked_foods: string[];
  meal_timings: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
    snacks?: string;
  };
  cooking_skill: "beginner" | "intermediate" | "advanced";
  time_availability: "minimal" | "moderate" | "plenty";
  kitchen_equipment: string[];
  shopping_preferences: string;
  cultural_preferences: string;
  specific_goals: string;
}

// Static question definitions for reference
const PREFERENCE_QUESTIONS = [
  {
    id: "dietary",
    question:
      "Do you follow any specific dietary restrictions? (e.g., vegetarian, vegan, keto, gluten-free)",
    category: "dietary_restrictions",
    weight: 15,
  },
  {
    id: "allergies",
    question:
      "Do you have any food allergies or intolerances I should know about?",
    category: "allergies",
    weight: 15,
  },
  {
    id: "favorites",
    question:
      "What are your favorite foods or meals that you'd love to see in your meal plan?",
    category: "favorite_foods",
    weight: 10,
  },
  {
    id: "dislikes",
    question: "Are there any foods you absolutely dislike or want to avoid?",
    category: "disliked_foods",
    weight: 10,
  },
  {
    id: "meal_times",
    question:
      "What times do you typically eat your meals? (breakfast, lunch, dinner)",
    category: "meal_timings",
    weight: 10,
  },
  {
    id: "cooking",
    question:
      "How would you describe your cooking skills? (beginner, intermediate, or advanced)",
    category: "cooking_skill",
    weight: 10,
  },
  {
    id: "time",
    question: "How much time can you typically dedicate to meal preparation?",
    category: "time_availability",
    weight: 10,
  },
  {
    id: "equipment",
    question:
      "What kitchen equipment do you have access to? (e.g., oven, microwave, air fryer, slow cooker)",
    category: "kitchen_equipment",
    weight: 5,
  },
  {
    id: "shopping",
    question:
      "Do you prefer shopping at specific stores or have a budget range for groceries?",
    category: "shopping_preferences",
    weight: 5,
  },
  {
    id: "cultural",
    question:
      "Are there any cultural or regional cuisine preferences you'd like incorporated?",
    category: "cultural_preferences",
    weight: 5,
  },
  {
    id: "goals",
    question:
      "What are your specific nutrition goals beyond your fitness objectives?",
    category: "specific_goals",
    weight: 5,
  },
];

export default function PreferenceCollectorModal({
  isOpen,
  onClose,
  clientId,
  onPreferencesUpdated,
}: PreferenceCollectorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [preferences, setPreferences] = useState<PreferenceData>({
    dietary_restrictions: [],
    allergies: [],
    favorite_foods: [],
    disliked_foods: [],
    meal_timings: {},
    cooking_skill: "intermediate",
    time_availability: "moderate",
    kitchen_equipment: [],
    shopping_preferences: "",
    cultural_preferences: "",
    specific_goals: "",
  });
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [personalizedQuestions, setPersonalizedQuestions] = useState<any[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      initializeChat();
      loadExistingPreferences();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Calculate completion percentage based on answered questions
    const answeredQuestions = Object.entries(preferences).filter(
      ([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        return value !== "";
      },
    ).length;

    const totalQuestions = PREFERENCE_QUESTIONS.length;
    const percentage = Math.round((answeredQuestions / totalQuestions) * 100);
    setCompletionPercentage(percentage);
  }, [preferences]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeChat = async () => {
    // Load existing preferences first
    const existing = await loadExistingPreferences();

    // Get AI-generated personalized questions based on existing preferences
    try {
      const response = await fetch("/api/nutrition/ai-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingPreferences: existing,
          conversationHistory: conversationHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions) {
          setPersonalizedQuestions(data.questions);
          setCompletionPercentage(data.completeness || 0);
        }
      }
    } catch (error) {
      console.error("Error getting personalized questions:", error);
      // Fall back to standard questions
      setPersonalizedQuestions(PREFERENCE_QUESTIONS);
    }

    // Count how many preferences are already filled
    const filledCategories = Object.entries(existing || {}).filter(
      ([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        return value !== "";
      },
    ).length;

    const initialMessage: ChatMessage = {
      id: "1",
      type: "assistant",
      content:
        filledCategories > 0
          ? `Welcome back! I've been thinking about your meal preferences. Based on what I know about you, I have some specific questions that will help me create even better meal plans for you.`
          : "Hi! I'm your personal nutrition assistant. I'll learn about your unique preferences and dietary needs to create meal plans that you'll actually enjoy. Let's start with getting to know you better.",
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
    setConversationHistory([
      { type: "assistant", content: initialMessage.content },
    ]);

    // Ask first question after a delay
    setTimeout(() => {
      askNextQuestion(0);
    }, 2000);
  };

  const loadExistingPreferences = async () => {
    try {
      // Use the new preferences-advanced endpoint
      const response = await fetch("/api/nutrition/preferences-advanced");

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const mergedPreferences = {
            ...preferences,
            ...result.data,
          };
          setPreferences(mergedPreferences);
          setCompletionPercentage(result.data.completeness || 0);

          // Load conversation history if available
          if (result.history && result.history.length > 0) {
            const recentHistory = result.history.slice(0, 5).map((h: any) => ({
              type: h.change_type === "user" ? "user" : "assistant",
              content: JSON.stringify(h.preferences),
            }));
            setConversationHistory(recentHistory);
          }

          return mergedPreferences;
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
    return preferences;
  };

  const askNextQuestion = (index: number) => {
    const questions =
      personalizedQuestions.length > 0
        ? personalizedQuestions
        : PREFERENCE_QUESTIONS;

    if (index < questions.length) {
      const question = questions[index];
      const assistantMessage: ChatMessage = {
        id: `q-${index}`,
        type: "assistant",
        content: question.question || question.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setConversationHistory((prev) => [
        ...prev,
        { type: "assistant", content: question.question || question.content },
      ]);
      setCurrentQuestionIndex(index);
    } else {
      // All questions asked, save preferences
      savePreferences();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [
      ...prev,
      { type: "user", content: inputValue },
    ]);
    setInputValue("");
    setIsLoading(true);

    // Process the answer
    if (inputValue.toLowerCase() !== "skip") {
      await processAnswer(inputValue, currentQuestionIndex);
    }

    // Get next personalized question based on the answer
    if (currentQuestionIndex % 3 === 2) {
      // Every 3rd question, get new personalized ones
      try {
        const response = await fetch("/api/nutrition/ai-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            existingPreferences: preferences,
            conversationHistory: conversationHistory.slice(-10), // Last 10 messages
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            // Add new personalized questions to the queue
            setPersonalizedQuestions((prev) => [...prev, ...data.questions]);
          }
        }
      } catch (error) {
        console.error("Error getting next questions:", error);
      }
    }

    // Ask next question
    setTimeout(() => {
      askNextQuestion(currentQuestionIndex + 1);
      setIsLoading(false);
    }, 500);
  };

  const processAnswer = async (answer: string, questionIndex: number) => {
    const questions =
      personalizedQuestions.length > 0
        ? personalizedQuestions
        : PREFERENCE_QUESTIONS;
    const question = questions[questionIndex];
    const updatedPreferences = { ...preferences };

    switch (question.category) {
      case "dietary_restrictions":
      case "allergies":
      case "favorite_foods":
      case "disliked_foods":
      case "kitchen_equipment":
        // Parse comma-separated lists
        const items = answer
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        updatedPreferences[question.category] = items;
        break;

      case "meal_timings":
        // Parse meal times (basic parsing)
        const times = answer.toLowerCase();
        if (times.includes("breakfast")) {
          const match = times.match(
            /breakfast[:\s]+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
          );
          if (match) updatedPreferences.meal_timings.breakfast = match[1];
        }
        if (times.includes("lunch")) {
          const match = times.match(
            /lunch[:\s]+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
          );
          if (match) updatedPreferences.meal_timings.lunch = match[1];
        }
        if (times.includes("dinner")) {
          const match = times.match(
            /dinner[:\s]+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
          );
          if (match) updatedPreferences.meal_timings.dinner = match[1];
        }
        break;

      case "cooking_skill":
        if (answer.toLowerCase().includes("beginner")) {
          updatedPreferences.cooking_skill = "beginner";
        } else if (answer.toLowerCase().includes("advanced")) {
          updatedPreferences.cooking_skill = "advanced";
        } else {
          updatedPreferences.cooking_skill = "intermediate";
        }
        break;

      case "time_availability":
        if (
          answer.toLowerCase().includes("minimal") ||
          answer.toLowerCase().includes("little") ||
          answer.toLowerCase().includes("quick")
        ) {
          updatedPreferences.time_availability = "minimal";
        } else if (
          answer.toLowerCase().includes("plenty") ||
          answer.toLowerCase().includes("lot")
        ) {
          updatedPreferences.time_availability = "plenty";
        } else {
          updatedPreferences.time_availability = "moderate";
        }
        break;

      default:
        updatedPreferences[question.category] = answer;
        break;
    }

    setPreferences(updatedPreferences);
  };

  const savePreferences = async () => {
    setIsLoading(true);

    try {
      // Use the new preferences-advanced endpoint
      const response = await fetch("/api/nutrition/preferences-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: preferences,
          change_type: "update",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      const result = await response.json();
      if (result.completeness) {
        setCompletionPercentage(result.completeness);
      }

      // Show success message
      const successMessage: ChatMessage = {
        id: "success",
        type: "assistant",
        content: `Great! I've saved your preferences. Your meal plans will now be personalized based on your needs. I understand your preferences at ${completionPercentage}% - you can always come back to add more details!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Close modal after delay
      setTimeout(() => {
        onPreferencesUpdated();
        onClose();
      }, 3000);
    } catch (error) {
      console.error("Error saving preferences:", error);
      const errorMessage: ChatMessage = {
        id: "error",
        type: "assistant",
        content:
          "I couldn't save your preferences right now. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">
              Personalize Your Nutrition
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              AI Understanding Level
            </span>
            <span className="text-sm font-medium text-orange-500">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3">
            {(personalizedQuestions.length > 0
              ? personalizedQuestions
              : PREFERENCE_QUESTIONS
            ).map((q, index) => (
              <div
                key={q.id}
                className="flex items-center gap-1"
                title={q.question}
              >
                {index < currentQuestionIndex ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : index === currentQuestionIndex ? (
                  <Circle className="w-4 h-4 text-orange-500 animate-pulse" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  message.type === "user"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-200"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer or 'skip' to move on..."
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={
                isLoading ||
                (personalizedQuestions.length > 0
                  ? currentQuestionIndex >= personalizedQuestions.length
                  : currentQuestionIndex >= PREFERENCE_QUESTIONS.length)
              }
            />
            <button
              type="submit"
              disabled={
                !inputValue.trim() ||
                isLoading ||
                (personalizedQuestions.length > 0
                  ? currentQuestionIndex >= personalizedQuestions.length
                  : currentQuestionIndex >= PREFERENCE_QUESTIONS.length)
              }
              className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
