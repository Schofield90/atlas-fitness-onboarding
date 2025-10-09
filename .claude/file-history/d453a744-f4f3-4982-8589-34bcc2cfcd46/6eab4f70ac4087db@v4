"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OnboardingSupportBotProps {
  currentStep?: string | null;
  completedSteps?: string[];
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export default function OnboardingSupportBot({
  currentStep,
  completedSteps = [],
  progress,
}: OnboardingSupportBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm your setup assistant. I'm here to help you get your gym up and running with GymLeadHub. Ask me anything about integrations, importing data, or setting up AI bots!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/support-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          context: {
            current_step: currentStep,
            completed_steps: completedSteps,
            progress,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I encountered an error. Please try again or contact support.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to the server. Please check your internet connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action buttons
  const quickActions = [
    { label: "How do I connect Google Calendar?", icon: "📅" },
    { label: "Import data from GoTeamUp", icon: "📥" },
    { label: "Setup payment provider", icon: "💳" },
    { label: "What are AI bots?", icon: "🤖" },
  ];

  const handleQuickAction = (label: string) => {
    setInput(label);
    inputRef.current?.focus();
  };

  // Floating button (when closed)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 group"
        title="Ask for help"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-orange-500 w-3 h-3 rounded-full animate-pulse" />
      </button>
    );
  }

  // Chat modal (when open)
  return (
    <div className="fixed bottom-6 left-6 w-96 h-[600px] bg-gray-800 rounded-lg shadow-2xl z-50 flex flex-col border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5 text-blue-500" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Setup Assistant</h3>
            <p className="text-xs text-gray-400">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions (show only if no messages yet) */}
        {messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 text-center mb-2">
              Quick questions:
            </p>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.label)}
                className="w-full text-left px-3 py-2 bg-gray-750 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-2"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors flex-shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
