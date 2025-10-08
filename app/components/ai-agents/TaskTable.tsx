"use client";

import React from "react";
import TaskStatusBadge from "./TaskStatusBadge";

interface Task {
  id: string;
  title: string;
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
}

interface Agent {
  id: string;
  name: string;
  model: string;
}

interface TaskTableProps {
  tasks: Task[];
  agents: Agent[];
  loading: boolean;
  onTaskClick: (taskId: string) => void;
  onExecute: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  agents,
  loading,
  onTaskClick,
  onExecute,
  onEdit,
  onDelete,
}) => {
  const getAgentName = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.name : "Unknown Agent";
  };

  const getAgentInitials = (agentId: string) => {
    const name = getAgentName(agentId);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return "text-red-400";
    if (priority >= 5) return "text-yellow-400";
    return "text-gray-400";
  };

  const getPriorityStars = (priority: number) => {
    const stars = Math.ceil(priority / 2);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };

  const formatDate = (date?: string) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const formatNextRun = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();

    if (diff < 0) return "Overdue";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `in ${hours}h`;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 7) return `in ${days}d`;

    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-gray-400">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800/50 rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-gray-500"
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
        <h3 className="mt-2 text-sm font-medium text-gray-300">
          No tasks found
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Create your first AI agent task to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Task
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Agent
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last Run / Next Run
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800/30 divide-y divide-gray-700">
          {tasks.map((task) => (
            <tr
              key={task.id}
              className="hover:bg-gray-700/30 transition-colors cursor-pointer"
              onClick={() => onTaskClick(task.id)}
            >
              <td className="px-4 py-4">
                <div className="flex items-start">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {task.title}
                    </p>
                    {task.error_message && (
                      <p className="text-xs text-red-400 mt-1 truncate max-w-xs">
                        {task.error_message}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                    {getAgentInitials(task.agent_id)}
                  </div>
                  <div className="text-sm text-gray-300">
                    {getAgentName(task.agent_id)}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 capitalize">
                  {task.task_type === "adhoc"
                    ? "⚡"
                    : task.task_type === "scheduled"
                      ? "🔄"
                      : "⚙️"}
                  <span className="ml-1">{task.task_type}</span>
                </span>
              </td>
              <td className="px-4 py-4">
                <TaskStatusBadge status={task.status} />
              </td>
              <td className="px-4 py-4">
                <span
                  className={`text-sm font-medium ${getPriorityColor(task.priority)}`}
                >
                  {getPriorityStars(task.priority)}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="text-sm">
                  <div className="text-gray-400">
                    {task.task_type === "scheduled" ? (
                      <>
                        <span className="text-gray-500">Last:</span>{" "}
                        {formatDate(task.last_run_at)}
                        <br />
                        <span className="text-gray-500">Next:</span>{" "}
                        {formatNextRun(task.next_run_at)}
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500">Created:</span>{" "}
                        {formatDate(task.created_at)}
                        {task.last_run_at && (
                          <>
                            <br />
                            <span className="text-gray-500">Ran:</span>{" "}
                            {formatDate(task.last_run_at)}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <div
                  className="flex justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExecute(task.id);
                    }}
                    disabled={task.status === "running"}
                    className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Execute now"
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
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task.id);
                    }}
                    disabled={task.status === "running"}
                    className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    disabled={task.status === "running"}
                    className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskTable;
