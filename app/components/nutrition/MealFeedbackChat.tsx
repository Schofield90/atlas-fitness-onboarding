"use client";

import { useState } from "react";
import { MessageCircle, Send, X, ThumbsDown, RefreshCw } from "lucide-react";

interface MealFeedbackChatProps {
  meal: any;
  day: number;
  mealIndex: number;
  nutritionProfile: any;
  onMealUpdate: (updatedMeal: any) => void;
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function MealFeedbackChat({
  meal,
  day,
  mealIndex,
  nutritionProfile,
  onMealUpdate,
  onClose,
}: MealFeedbackChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I see you'd like to change "${meal.name}". What would you like to adjust? You can tell me about dietary restrictions, taste preferences, cooking time, or any other concerns.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/nutrition/meal-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meal,
          feedback: input,
          nutritionProfile,
          day,
          mealIndex,
          conversationHistory: messages,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Add AI response to chat
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // If a new meal was generated, update it
        if (result.updatedMeal) {
          onMealUpdate(result.updatedMeal);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm sorry, I couldn't process your feedback. Please try again.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "There was an error processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickFeedbackOptions = [
    "Too complicated to cook",
    "I don't like this ingredient",
    "Takes too long to prepare",
    "I'm allergic to something here",
    "Want something simpler",
    "Need more protein",
    "Less calories please",
    "I'm vegetarian/vegan",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                Meal Feedback
              </h3>
              <p className="text-sm text-gray-400">
                Let's find a better option for you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Current Meal Info */}
        <div className="p-4 bg-gray-800/50 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 capitalize">{meal.type}</p>
              <p className="text-white font-medium">{meal.name}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-400">{meal.calories} cal</span>
              <span className="text-gray-400">{meal.protein}g protein</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Feedback Options */}
        {messages.length === 1 && (
          <div className="p-4 border-t border-gray-800">
            <p className="text-sm text-gray-400 mb-2">Quick feedback:</p>
            <div className="flex flex-wrap gap-2">
              {quickFeedbackOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setInput(option)}
                  className="px-3 py-1 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your feedback or requirements..."
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
              className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {/* Regenerate Button */}
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const response = await fetch("/api/nutrition/regenerate-meal", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    nutritionProfile,
                    mealType: meal.type,
                    mealIndex,
                    preferences: nutritionProfile.preferences || {},
                    conversationHistory: messages,
                  }),
                });

                const result = await response.json();

                if (result.success && result.data) {
                  onMealUpdate(result.data);
                  const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content:
                      "I've regenerated this meal based on your preferences and our conversation. The new meal should better match what you're looking for!",
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                } else {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content:
                        "I couldn't regenerate the meal. Please try again or provide more specific feedback.",
                      timestamp: new Date(),
                    },
                  ]);
                }
              } catch (error) {
                console.error("Error regenerating meal:", error);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content:
                      "There was an error regenerating the meal. Please try again.",
                    timestamp: new Date(),
                  },
                ]);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Regenerate This Meal with Updated Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
