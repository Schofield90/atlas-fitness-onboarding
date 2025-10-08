"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import TaskTable from "@/app/components/ai-agents/TaskTable";
import TaskFormModal from "@/app/components/ai-agents/TaskFormModal";
import TaskDetailsModal from "@/app/components/ai-agents/TaskDetailsModal";

interface Task {
  id: string;
  title: string;
  description?: string;
  agent_id: string;
  task_type: "adhoc" | "scheduled" | "automation";
  status:
    | "pending"
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  priority: number;
  created_at: string;
  last_run_at?: string;
  next_run_at?: string;
  error_message?: string;
  schedule_cron?: string;
  schedule_timezone?: string;
  context?: any;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
}

interface Stats {
  total: number;
  running: number;
  completedToday: number;
  failed: number;
}

type TabType =
  | "all"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "scheduled";

export default function AIAgentTasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    running: 0,
    completedToday: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  useEffect(() => {
    fetchAgents();
    fetchTasks();

    // Auto-refresh every 5 seconds
    const interval = window.setInterval(() => {
      fetchTasks(false); // Silent refresh
    }, 5000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, filterAgent, page]);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/ai-agents?enabled=true");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchTasks = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      // Add filters
      if (activeTab !== "all") {
        if (activeTab === "scheduled") {
          params.append("task_type", "scheduled");
        } else {
          params.append("status", activeTab);
        }
      }

      if (filterAgent) {
        params.append("agent_id", filterAgent);
      }

      const response = await fetch(`/api/ai-agents/tasks?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.tasks || []);
      setTotalPages(data.totalPages || 1);

      // Calculate stats
      calculateStats(data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const calculateStats = (allTasks: Task[]) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const stats = {
      total: allTasks.length,
      running: allTasks.filter((t) => t.status === "running").length,
      completedToday: allTasks.filter((t) => {
        if (t.status !== "completed" || !t.last_run_at) return false;
        return new Date(t.last_run_at) >= todayStart;
      }).length,
      failed: allTasks.filter((t) => t.status === "failed").length,
    };

    setStats(stats);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowCreateModal(true);
  };

  const handleTaskCreated = () => {
    fetchTasks();
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowDetailsModal(true);
  };

  const handleEdit = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setShowCreateModal(true);
    }
  };

  const handleEditFromDetails = () => {
    if (selectedTaskId) {
      setShowDetailsModal(false);
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) {
        setEditingTask(task);
        setShowCreateModal(true);
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`/api/ai-agents/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task");
    }
  };

  const handleExecute = async (taskId: string) => {
    try {
      const response = await fetch(`/api/ai-agents/tasks/${taskId}/execute`, {
        method: "POST",
      });

      if (response.ok) {
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to execute task");
      }
    } catch (error) {
      console.error("Error executing task:", error);
      alert("Failed to execute task");
    }
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "pending", label: "Pending" },
    { id: "running", label: "Running", count: stats.running },
    { id: "completed", label: "Completed", count: stats.completedToday },
    { id: "failed", label: "Failed", count: stats.failed },
    { id: "scheduled", label: "Scheduled" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Agent Tasks</h1>
            <p className="text-gray-400">
              Create and manage AI agent tasks for automation and scheduled
              operations
            </p>
          </div>
          <button
            onClick={handleCreateTask}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Running Now</p>
                <p className="text-2xl font-bold mt-1">{stats.running}</p>
              </div>
              <div className="h-12 w-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed Today</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.completedToday}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Failed</p>
                <p className="text-2xl font-bold mt-1">{stats.failed}</p>
              </div>
              <div className="h-12 w-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Filter by Agent
              </label>
              <select
                value={filterAgent}
                onChange={(e) => {
                  setFilterAgent(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-orange-500 text-orange-500"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-700">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Task Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <TaskTable
            tasks={tasks}
            agents={agents}
            loading={loading}
            onTaskClick={handleTaskClick}
            onExecute={handleExecute}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Modals */}
        <TaskFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
          onTaskCreated={handleTaskCreated}
          agents={agents}
          editTask={editingTask}
        />

        {selectedTaskId && (
          <TaskDetailsModal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTaskId(null);
            }}
            taskId={selectedTaskId}
            onEdit={handleEditFromDetails}
            onDelete={() => {
              handleDelete(selectedTaskId);
              setShowDetailsModal(false);
              setSelectedTaskId(null);
            }}
            onExecute={() => {
              handleExecute(selectedTaskId);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
