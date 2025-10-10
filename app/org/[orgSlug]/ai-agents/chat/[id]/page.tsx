"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  MessageSquare,
  ListTodo,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Clock,
  RepeatIcon,
} from "lucide-react";

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

interface Task {
  id: string;
  agent_id: string;
  title: string;
  description?: string;
  task_type: "adhoc" | "scheduled" | "automation";
  schedule_cron?: string;
  schedule_timezone?: string;
  next_run_at?: string;
  last_run_at?: string;
  status:
    | "pending"
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  priority: number;
  created_at: string;
}

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Task management state
  const [activeTab, setActiveTab] = useState<"chat" | "tasks">("chat");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && agentId) {
      loadAgent();
      loadTasks();
      loadOrCreateConversation();
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

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await fetch(
        `/api/ai-agents/tasks?agent_id=${agentId}&limit=100`,
      );
      const result = await response.json();

      if (result.success) {
        setTasks(result.tasks || []);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadOrCreateConversation = async () => {
    try {
      // First, try to find an existing conversation for this agent
      const listResponse = await fetch(
        `/api/ai-agents/conversations?agent_id=${agentId}&limit=1`,
      );
      const listResult = await listResponse.json();

      let convId: string;

      if (listResult.success && listResult.conversations?.length > 0) {
        // Use existing conversation
        convId = listResult.conversations[0].id;
      } else {
        // Create new conversation
        const createResponse = await fetch(`/api/ai-agents/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: agentId,
            title: "Chat with AI Agent",
          }),
        });
        const createResult = await createResponse.json();

        if (!createResult.success) {
          console.error("Failed to create conversation");
          return;
        }
        convId = createResult.conversation.id;
      }

      setConversationId(convId);
      // Load messages for this conversation
      await loadMessages(convId);
    } catch (error) {
      console.error("Error loading/creating conversation:", error);
    }
  };

  const loadMessages = async (convId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/ai-agents/conversations/${convId}/messages?limit=100`,
      );
      const result = await response.json();

      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleToggleTaskComplete = async (task: Task) => {
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";

      const response = await fetch(`/api/ai-agents/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        loadTasks(); // Reload tasks
      }
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/ai-agents/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadTasks(); // Reload tasks
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskFormSubmit = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    loadTasks(); // Reload tasks
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || sending || !conversationId) return;

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
      // Send message to AI agent via API
      const response = await fetch(
        `/api/ai-agents/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: userMessage }),
        },
      );

      const result = await response.json();

      if (result.success) {
        // Reload messages to get the real user message + AI response
        await loadMessages(conversationId);
      } else {
        console.error("Failed to send message:", result.error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
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
          <div className="flex items-center justify-between gap-4">
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
                  <h1 className="text-lg font-semibold">
                    {agent?.name || "AI Agent"}
                  </h1>
                  <p className="text-sm text-gray-400">{agent?.description}</p>
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === "chat"
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === "tasks"
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                <ListTodo className="h-4 w-4" />
                Tasks
                {tasks.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-gray-700 rounded-full text-xs">
                    {tasks.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Chat or Tasks */}
        {activeTab === "chat" ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg font-semibold mb-2">
                    Start a conversation
                  </p>
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
                          message.role === "user"
                            ? "text-orange-200"
                            : "text-gray-500"
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
          </>
        ) : (
          <>
            {/* Tasks View */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Add Task Button */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Task List</h2>
                  <p className="text-sm text-gray-400">
                    Manage recurring and one-off tasks
                  </p>
                </div>
                <button
                  onClick={handleAddTask}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Add Task
                </button>
              </div>

              {/* Task List */}
              {loadingTasks ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading tasks...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                  <ListTodo className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No tasks yet</h3>
                  <p className="text-gray-400 mb-6">
                    Create your first task to get started
                  </p>
                  <button
                    onClick={handleAddTask}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    Add Task
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleTaskComplete(task)}
                          className="mt-1 flex-shrink-0"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-500 hover:text-orange-500" />
                          )}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3
                              className={`font-semibold ${
                                task.status === "completed"
                                  ? "line-through text-gray-500"
                                  : "text-white"
                              }`}
                            >
                              {task.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleEditTask(task)}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                              >
                                <Edit2 className="h-4 w-4 text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-400 mb-2">
                              {task.description}
                            </p>
                          )}

                          {/* Task Metadata */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {task.task_type === "scheduled" &&
                              task.schedule_cron && (
                                <div className="flex items-center gap-1">
                                  <RepeatIcon className="h-3 w-3" />
                                  <span>Recurring</span>
                                </div>
                              )}
                            {task.task_type === "adhoc" && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>One-off</span>
                              </div>
                            )}
                            {task.next_run_at && (
                              <span>
                                Next:{" "}
                                {new Date(task.next_run_at).toLocaleString()}
                              </span>
                            )}
                            {task.last_run_at && (
                              <span>
                                Last:{" "}
                                {new Date(task.last_run_at).toLocaleString()}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                task.status === "completed"
                                  ? "bg-green-900 text-green-300"
                                  : task.status === "running"
                                    ? "bg-blue-900 text-blue-300"
                                    : task.status === "failed"
                                      ? "bg-red-900 text-red-300"
                                      : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {task.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskFormModal
          agentId={agentId}
          task={editingTask}
          onClose={() => setShowTaskModal(false)}
          onSuccess={handleTaskFormSubmit}
        />
      )}
    </DashboardLayout>
  );
}

// Task Form Modal Component
interface TaskFormModalProps {
  agentId: string;
  task: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}

function TaskFormModal({
  agentId,
  task,
  onClose,
  onSuccess,
}: TaskFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    task_type: task?.task_type || "adhoc",
    schedule_cron: task?.schedule_cron || "",
    schedule_timezone: task?.schedule_timezone || "UTC",
    priority: task?.priority || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = task
        ? `/api/ai-agents/tasks/${task.id}`
        : "/api/ai-agents/tasks";
      const method = task ? "PUT" : "POST";

      const payload = task ? formData : { ...formData, agent_id: agentId };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save task");
      }
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">
            {task ? "Edit Task" : "Add New Task"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Send weekly newsletter"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Describe the task..."
            />
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Task Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.task_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  task_type: e.target.value as "adhoc" | "scheduled",
                })
              }
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="adhoc">One-off Task</option>
              <option value="scheduled">Recurring Task</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {formData.task_type === "adhoc"
                ? "Task will run once when triggered"
                : "Task will run on a schedule"}
            </p>
          </div>

          {/* Cron Schedule (only for scheduled tasks) */}
          {formData.task_type === "scheduled" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cron Expression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={formData.task_type === "scheduled"}
                  value={formData.schedule_cron}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule_cron: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  placeholder="0 9 * * 1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Examples: <code>0 9 * * 1</code> (Every Monday at 9am),{" "}
                  <code>0 */6 * * *</code> (Every 6 hours)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Timezone
                </label>
                <select
                  value={formData.schedule_timezone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule_timezone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
            </>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Priority (0-10)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Higher priority tasks run first (10 = highest)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : task ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
