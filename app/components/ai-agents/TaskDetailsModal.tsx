"use client";

import React, { useState, useEffect } from "react";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onEdit: () => void;
  onDelete: () => void;
  onExecute: () => void;
}

interface TaskDetails {
  id: string;
  title: string;
  description: string;
  task_type: string;
  status:
    | "pending"
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  priority: number;
  agent_id: string;
  schedule_cron?: string;
  schedule_timezone?: string;
  next_run_at?: string;
  last_run_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  result?: any;
  error_message?: string;
  execution_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  retry_count: number;
  max_retries: number;
  context?: any;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  taskId,
  onEdit,
  onDelete,
  onExecute,
}) => {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
      // Poll for updates every 5 seconds if running
      const interval = setInterval(() => {
        if (task?.status === "running") {
          fetchTask();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, taskId, task?.status]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-agents/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch task");
      }
      const data = await response.json();
      setTask(data.task);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!task) return;

    setExecuting(true);
    try {
      const response = await fetch(`/api/ai-agents/tasks/${taskId}/execute`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to execute task");
      }

      await fetchTask();
      onExecute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute task");
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/ai-agents/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete task");
      }

      onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  const handlePauseResume = async () => {
    if (!task) return;

    try {
      const newStatus = task.status === "pending" ? "cancelled" : "pending";
      const response = await fetch(`/api/ai-agents/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task status");
      }

      await fetchTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Task Details</h2>
            {task && <TaskStatusBadge status={task.status} />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {loading && !task ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-400">Loading task details...</p>
          </div>
        ) : task ? (
          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
              {task.description && (
                <p className="text-gray-300 text-sm">{task.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Type</p>
                <p className="text-sm font-medium capitalize">
                  {task.task_type}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Priority</p>
                <p className="text-sm font-medium">{task.priority}/10</p>
              </div>
              {task.schedule_cron && (
                <>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Schedule</p>
                    <p className="text-sm font-mono">{task.schedule_cron}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Timezone</p>
                    <p className="text-sm">{task.schedule_timezone}</p>
                  </div>
                </>
              )}
              {task.next_run_at && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Next Run</p>
                  <p className="text-sm">
                    {new Date(task.next_run_at).toLocaleString()}
                  </p>
                </div>
              )}
              {task.last_run_at && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Last Run</p>
                  <p className="text-sm">
                    {new Date(task.last_run_at).toLocaleString()}
                  </p>
                </div>
              )}
              {task.execution_time_ms !== undefined && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Execution Time</p>
                  <p className="text-sm">
                    {(task.execution_time_ms / 1000).toFixed(2)}s
                  </p>
                </div>
              )}
              {task.tokens_used !== undefined && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Tokens Used</p>
                  <p className="text-sm">{task.tokens_used.toLocaleString()}</p>
                </div>
              )}
              {task.cost_usd !== undefined && (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Cost</p>
                  <p className="text-sm">${task.cost_usd.toFixed(4)}</p>
                </div>
              )}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Retries</p>
                <p className="text-sm">
                  {task.retry_count}/{task.max_retries}
                </p>
              </div>
            </div>

            {task.context && Object.keys(task.context).length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Context</p>
                <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto">
                  {JSON.stringify(task.context, null, 2)}
                </pre>
              </div>
            )}

            {task.result && (
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Result</p>
                <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto max-h-64">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
            )}

            {task.error_message && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-xs text-red-400 mb-1">Error</p>
                <p className="text-sm text-red-200">{task.error_message}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <button
                onClick={handleExecute}
                disabled={executing || task.status === "running"}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing
                  ? "Executing..."
                  : task.status === "running"
                    ? "Running..."
                    : "Execute Now"}
              </button>

              {task.task_type === "scheduled" && (
                <button
                  onClick={handlePauseResume}
                  disabled={task.status === "running"}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {task.status === "pending" ? "Pause" : "Resume"}
                </button>
              )}

              <button
                onClick={onEdit}
                disabled={task.status === "running"}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Edit
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting || task.status === "running"}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">Task not found</p>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsModal;
