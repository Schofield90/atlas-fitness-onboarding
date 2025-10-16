"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, XCircle, RefreshCw, Settings, Trash2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: any[];
  tool_results?: any[];
  created_at: string;
  feedback?: "positive" | "negative" | "needs_improvement";
  feedback_notes?: string;
}

interface Agent {
  id: string;
  name: string;
  model: string;
  system_prompt: string;
  allowed_tools: string[];
}

interface TestSession {
  id: string;
  conversation_id: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
  feedback_count: number;
}

export default function AgentTestPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [testSession, setTestSession] = useState<TestSession | null>(null);

  // Self-debug mode
  const [debugMode, setDebugMode] = useState(true);
  const [toolErrors, setToolErrors] = useState<any[]>([]);

  // Feedback UI
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgent();
    startNewSession();
  }, [agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAgent = async () => {
    try {
      const response = await fetch(`/api/ai-agents/${agentId}`);
      const data = await response.json();
      if (data.success) {
        setAgent(data.data);
      }
    } catch (error) {
      console.error("Error fetching agent:", error);
    }
  };

  const startNewSession = async () => {
    try {
      // Create a test conversation
      const response = await fetch("/api/ai-agents/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          channel: "test_ui",
          metadata: {
            test_session: true,
            debug_mode: debugMode,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setConversationId(data.data.id);
        setMessages([]);
        setToolErrors([]);

        // Create test session record
        setTestSession({
          id: crypto.randomUUID(),
          conversation_id: data.data.id,
          started_at: new Date().toISOString(),
          message_count: 0,
          feedback_count: 0,
        });
      }
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`/api/ai-agents/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: input,
          metadata: {
            test_mode: true,
            debug_mode: debugMode,
            self_debug_enabled: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: data.data.id,
          role: "assistant",
          content: data.data.content,
          tool_calls: data.data.tool_calls,
          tool_results: data.data.tool_results,
          created_at: data.data.created_at,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Check for tool errors in debug mode
        if (debugMode && data.data.tool_results) {
          const errors = data.data.tool_results.filter((result: any) => !result.success);
          if (errors.length > 0) {
            setToolErrors((prev) => [...prev, ...errors.map((err: any) => ({
              messageId: data.data.id,
              timestamp: new Date().toISOString(),
              tool: err.tool_name,
              error: err.error,
              result: err,
            }))]);
          }
        }
      } else {
        // Show error message
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `❌ Error: ${data.error || "Failed to get response"}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ System Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const provideFeedback = async (messageId: string, feedback: "positive" | "negative" | "needs_improvement", notes: string) => {
    try {
      const response = await fetch(`/api/saas-admin/agent-test/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messageId,
          conversationId,
          feedback,
          notes,
          updateSOP: feedback === "negative" || feedback === "needs_improvement",
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update message with feedback
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, feedback, feedback_notes: notes }
              : msg
          )
        );

        // Refresh agent if SOP was updated
        if (data.data?.sopUpdated) {
          await fetchAgent();
          alert("✅ System prompt updated with feedback!");
        }
      }

      setFeedbackMessageId(null);
      setFeedbackNotes("");
    } catch (error) {
      console.error("Error providing feedback:", error);
    }
  };

  const clearSession = () => {
    if (confirm("Clear this test session and start fresh?")) {
      startNewSession();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Agent Test Lab
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {agent?.name} • {agent?.model}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Debug Mode Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Self-Debug Mode</span>
            </label>

            {/* Tool Errors Badge */}
            {toolErrors.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                {toolErrors.length} Tool Error{toolErrors.length > 1 ? "s" : ""}
              </div>
            )}

            {/* Clear Session */}
            <button
              onClick={clearSession}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Session
            </button>

            {/* View Settings */}
            <button
              onClick={() => router.push(`/saas-admin/lead-bots/${agentId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Agent Settings
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-20">
                <p className="text-lg font-medium">Start Testing</p>
                <p className="text-sm mt-2">Send a message as if you're a lead to test the agent's responses</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-3xl w-full">
                  {/* Message Bubble */}
                  <div
                    className={`rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white ml-auto max-w-lg"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>

                    {/* Tool Execution Info */}
                    {message.tool_calls && message.tool_calls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300 space-y-2">
                        <p className="text-xs font-semibold text-gray-600">🔧 Tools Used:</p>
                        {message.tool_calls.map((tool: any, idx: number) => {
                          const result = message.tool_results?.[idx];
                          const success = result?.success !== false;

                          return (
                            <div key={idx} className="text-xs bg-gray-50 rounded p-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{tool.name}</span>
                                {success ? (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-600" />
                                )}
                              </div>
                              {!success && result?.error && (
                                <p className="text-red-600 mt-1">{result.error}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Feedback Buttons (only for assistant messages) */}
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-2">
                      {message.feedback ? (
                        <div className="text-xs text-gray-600 italic">
                          Feedback: {message.feedback}
                          {message.feedback_notes && ` - ${message.feedback_notes}`}
                        </div>
                      ) : feedbackMessageId === message.id ? (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 flex-1">
                          <input
                            type="text"
                            placeholder="Add notes (optional)..."
                            value={feedbackNotes}
                            onChange={(e) => setFeedbackNotes(e.target.value)}
                            className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => provideFeedback(message.id, "positive", feedbackNotes)}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => provideFeedback(message.id, "negative", feedbackNotes)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackMessageId(null);
                              setFeedbackNotes("");
                            }}
                            className="text-gray-600 hover:bg-gray-200 p-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setFeedbackMessageId(message.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Provide Feedback
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Agent is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message as a lead..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Debug Sidebar */}
        {debugMode && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Debug Panel</h3>

              {/* Tool Errors */}
              {toolErrors.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-red-800">Tool Errors</h4>
                  {toolErrors.map((error, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{error.tool}</p>
                          <p className="text-red-700 mt-1">{error.error}</p>
                          <p className="text-xs text-red-600 mt-2">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No tool errors detected
                </p>
              )}

              {/* Allowed Tools */}
              {agent && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Allowed Tools</h4>
                  <div className="space-y-1">
                    {agent.allowed_tools?.map((tool) => (
                      <div key={tool} className="text-xs bg-gray-100 rounded px-2 py-1">
                        {tool}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
