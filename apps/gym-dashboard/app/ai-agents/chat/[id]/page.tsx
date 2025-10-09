"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { ArrowLeft, Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
}

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && agentId) {
      loadAgent();
    }
  }, [user, agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/get-organization");
      const result = await response.json();

      if (!result.success || !result.data?.user) {
        router.push("/owner-login");
        return;
      }

      setUser(result.data.user);
      setLoading(false);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/owner-login");
    }
  };

  const loadAgent = async () => {
    try {
      const response = await fetch(`/api/ai-agents/${agentId}`);
      const result = await response.json();

      if (result.success) {
        setAgent(result.agent);
      } else {
        console.error("Failed to load agent");
      }
    } catch (error) {
      console.error("Error loading agent:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    // Add user message optimistically
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // TODO: Replace with actual API call to send message to agent
      // For now, simulate a response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        id: `temp-${Date.now()}-assistant`,
        role: "assistant",
        content: "This is a placeholder response. The AI agent chat functionality is not yet implemented. Please connect the agent orchestration system to enable real-time conversations.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userData={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading chat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={user}>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/ai-agents")}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{agent?.name || "AI Agent"}</h1>
                <p className="text-sm text-gray-400">{agent?.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <Bot className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-semibold mb-2">Start a conversation</p>
              <p className="text-sm">Ask me anything! I'm here to help.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-800 text-gray-100 border border-gray-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user" ? "text-orange-200" : "text-gray-500"
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
