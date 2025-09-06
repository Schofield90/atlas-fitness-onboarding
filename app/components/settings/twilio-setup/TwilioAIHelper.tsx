"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  X,
  Minimize2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface FAQ {
  question: string;
  answer: string;
  category: "setup" | "troubleshooting" | "features";
}

const TWILIO_FAQS: FAQ[] = [
  {
    question: "How do I create a Twilio account?",
    answer:
      "Go to twilio.com and click 'Sign up free'. You'll get $15 in free credits to start. Verify your email and phone number to activate your account.",
    category: "setup",
  },
  {
    question: "Where do I find my Account SID and Auth Token?",
    answer:
      "Log into your Twilio Console at console.twilio.com. Your Account SID and Auth Token are displayed on the main dashboard under 'Account Info'.",
    category: "setup",
  },
  {
    question: "How do I buy a phone number?",
    answer:
      "In your Twilio Console, go to Phone Numbers > Manage > Buy a number. Choose your country, select SMS and Voice capabilities, then purchase the number.",
    category: "setup",
  },
  {
    question: "What if my connection test fails?",
    answer:
      "Check that your Account SID and Auth Token are correct. Ensure you have sufficient credits in your account and that your account is verified.",
    category: "troubleshooting",
  },
  {
    question: "Can I send WhatsApp messages through Twilio?",
    answer:
      "Yes! Twilio supports WhatsApp Business API. You'll need to apply for WhatsApp Business API access through Twilio.",
    category: "features",
  },
  {
    question: "How much does it cost to send SMS?",
    answer:
      "Costs vary by country. In the US, SMS typically costs $0.0075 per message. Check Twilio's pricing page for your region.",
    category: "features",
  },
];

export default function TwilioAIHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      // Add welcome message
      const welcomeMessage: Message = {
        id: "welcome",
        content:
          "Hi! I'm your Twilio setup assistant. I can help you with account creation, finding credentials, troubleshooting connections, and more. What would you like to know?",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate AI response - in real implementation, call your AI API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = generateTwilioResponse(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error getting AI response:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I apologize, but I encountered an error. Please try again or check the FAQ section for common questions.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTwilioResponse = (query: string): string => {
    const lowercaseQuery = query.toLowerCase();

    if (
      lowercaseQuery.includes("account sid") ||
      lowercaseQuery.includes("auth token")
    ) {
      return "To find your Account SID and Auth Token:\n\n1. Go to console.twilio.com\n2. Log into your account\n3. On the main dashboard, you'll see 'Account Info'\n4. Your Account SID starts with 'AC' and is about 34 characters long\n5. Click the eye icon to reveal your Auth Token\n\n⚠️ Keep your Auth Token secret - it provides full access to your account!";
    }

    if (
      lowercaseQuery.includes("phone number") ||
      lowercaseQuery.includes("buy number")
    ) {
      return "To buy a Twilio phone number:\n\n1. In your Twilio Console, go to Phone Numbers\n2. Click 'Manage' then 'Buy a number'\n3. Select your country and region\n4. Choose a number with SMS and Voice capabilities\n5. Click 'Buy' to purchase\n\nMake sure to choose a number that supports the features you need (SMS, Voice, MMS).";
    }

    if (
      lowercaseQuery.includes("webhook") ||
      lowercaseQuery.includes("callback")
    ) {
      return "Webhooks let Twilio notify your app about events:\n\n1. Set your webhook URL in the phone number configuration\n2. Use format: https://yourdomain.com/api/webhooks/twilio\n3. Enable status callbacks for delivery receipts\n4. Test with tools like ngrok for local development\n\nWebhooks are essential for two-way messaging and delivery tracking.";
    }

    if (
      lowercaseQuery.includes("test") ||
      lowercaseQuery.includes("connection") ||
      lowercaseQuery.includes("fail")
    ) {
      return "If your connection test fails, check:\n\n1. Account SID is correct (starts with 'AC')\n2. Auth Token is valid (not expired)\n3. Your Twilio account has sufficient credits\n4. Account is verified (not in trial restrictions)\n5. Phone number is purchased and active\n\nTry the connection test again after verifying these items.";
    }

    if (
      lowercaseQuery.includes("cost") ||
      lowercaseQuery.includes("price") ||
      lowercaseQuery.includes("billing")
    ) {
      return "Twilio pricing varies by service and region:\n\n• SMS (US): ~$0.0075 per message\n• Voice (US): ~$0.0085 per minute\n• WhatsApp: ~$0.005 per session\n• Phone numbers: ~$1 per month\n\nYou get $15 free credits when you sign up. Check console.twilio.com/billing for exact pricing in your region.";
    }

    if (lowercaseQuery.includes("whatsapp")) {
      return "To use WhatsApp with Twilio:\n\n1. Apply for WhatsApp Business API access\n2. Get approved by WhatsApp (can take days)\n3. Configure your WhatsApp sender number\n4. Set up message templates for notifications\n5. Use Twilio's WhatsApp API endpoints\n\nWhatsApp has strict rules about message types and templates.";
    }

    // Default response
    return "I can help you with Twilio setup! I know about:\n\n• Creating accounts and finding credentials\n• Buying and configuring phone numbers\n• Setting up webhooks and callbacks\n• Troubleshooting connection issues\n• Pricing and billing questions\n• WhatsApp Business API setup\n\nWhat specific aspect would you like help with?";
  };

  const handleFAQClick = (faq: FAQ) => {
    const faqMessage: Message = {
      id: Date.now().toString(),
      content: faq.answer,
      role: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, faqMessage]);
    setShowFAQs(false);
  };

  const filteredFAQs =
    selectedCategory === "all"
      ? TWILIO_FAQS
      : TWILIO_FAQS.filter((faq) => faq.category === selectedCategory);

  if (!isOpen && !isMinimized) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-colors z-50"
        title="Twilio Setup Assistant"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors z-50"
        title="Open Twilio Assistant"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-orange-600 rounded">
            <HelpCircle className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold text-white">Twilio Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-gray-300 p-1"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-300 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      {showFAQs && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Common Questions</h4>
            <button
              onClick={() => setShowFAQs(false)}
              className="text-gray-400 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            {[
              { key: "all", label: "All" },
              { key: "setup", label: "Setup" },
              { key: "troubleshooting", label: "Issues" },
              { key: "features", label: "Features" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedCategory === cat.key
                    ? "bg-orange-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {filteredFAQs.map((faq, index) => (
              <button
                key={index}
                onClick={() => handleFAQClick(faq)}
                className="w-full text-left p-2 text-xs text-gray-300 hover:bg-gray-700 rounded transition-colors"
              >
                {faq.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-700 text-gray-100"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        {!showFAQs && (
          <button
            type="button"
            onClick={() => setShowFAQs(true)}
            className="w-full mb-2 text-xs text-orange-400 hover:text-orange-300 text-center py-1"
          >
            Show FAQ
          </button>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Twilio setup..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 border border-gray-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
