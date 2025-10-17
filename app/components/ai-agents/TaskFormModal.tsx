"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import CronBuilder from "./CronBuilder";

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  agents: Agent[];
  editTask?: any;
}

const taskSchema = z.object({
  agent_id: z.string().uuid({ message: "Please select an agent" }),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  task_type: z.enum(["adhoc", "scheduled"]),
  schedule_cron: z.string().optional(),
  schedule_timezone: z.string().default("UTC"),
  priority: z.number().min(0).max(10).default(5),
  context: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  agents,
  editTask,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: editTask
      ? {
          agent_id: editTask.agent_id,
          title: editTask.title,
          description: editTask.description || "",
          task_type: editTask.task_type,
          schedule_cron: editTask.schedule_cron || "",
          schedule_timezone: editTask.schedule_timezone || "UTC",
          priority: editTask.priority || 5,
          context: editTask.context
            ? JSON.stringify(editTask.context, null, 2)
            : "",
        }
      : {
          agent_id: "",
          title: "",
          description: "",
          task_type: "adhoc",
          schedule_cron: "",
          schedule_timezone: "UTC",
          priority: 5,
          context: "",
        },
  });

  const taskType = watch("task_type");
  const cronValue = watch("schedule_cron") || "";
  const timezone = watch("schedule_timezone") || "UTC";

  useEffect(() => {
    if (!isOpen) {
      reset();
      setError("");
      setShowAdvanced(false);
    }
  }, [isOpen, reset]);

  const onSubmit = async (values: TaskFormValues) => {
    setLoading(true);
    setError("");

    try {
      // Validate scheduled task has cron
      if (values.task_type === "scheduled" && !values.schedule_cron) {
        setError("Scheduled tasks require a schedule");
        setLoading(false);
        return;
      }

      // Parse context JSON if provided
      let contextObj = {};
      if (values.context) {
        try {
          contextObj = JSON.parse(values.context);
        } catch (e) {
          setError("Context must be valid JSON");
          setLoading(false);
          return;
        }
      }

      const payload = {
        agent_id: values.agent_id,
        title: values.title,
        description: values.description || "",
        task_type: values.task_type,
        schedule_cron:
          values.task_type === "scheduled" ? values.schedule_cron : undefined,
        schedule_timezone: values.schedule_timezone,
        priority: values.priority,
        context: contextObj,
      };

      const url = editTask
        ? `/api/ai-agents/tasks/${editTask.id}`
        : "/api/ai-agents/tasks";
      const method = editTask ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save task");
      }

      reset();
      onTaskCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedAgent = agents.find((a) => a.id === watch("agent_id"));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editTask ? "Edit Task" : "Create New Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            type="button"
          >
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Agent *
            </label>
            <select
              {...register("agent_id")}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            >
              <option value="">Select an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.model})
                </option>
              ))}
            </select>
            {errors.agent_id && (
              <p className="text-sm text-red-400 mt-1">
                {errors.agent_id.message}
              </p>
            )}
            {selectedAgent && (
              <p className="text-xs text-gray-400 mt-1">
                {selectedAgent.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register("task_type")}
                  value="adhoc"
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">One-time Task</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register("task_type")}
                  value="scheduled"
                  className="mr-2"
                />
                <span className="text-sm text-gray-300">Scheduled Task</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              {...register("title")}
              placeholder="e.g., Generate weekly report"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            />
            {errors.title && (
              <p className="text-sm text-red-400 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="What should this task do?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority: {watch("priority")}
            </label>
            <input
              type="range"
              {...register("priority", { valueAsNumber: true })}
              min="0"
              max="10"
              step="1"
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Low (0)</span>
              <span>High (10)</span>
            </div>
          </div>

          {taskType === "scheduled" && (
            <CronBuilder
              value={cronValue}
              timezone={timezone}
              onChange={(cron) => setValue("schedule_cron", cron)}
              onTimezoneChange={(tz) => setValue("schedule_timezone", tz)}
            />
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-orange-400 hover:text-orange-300 mb-2"
            >
              {showAdvanced ? "− Hide" : "+ Show"} Advanced Options
            </button>

            {showAdvanced && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Context (JSON)
                </label>
                <textarea
                  {...register("context")}
                  rows={6}
                  placeholder='{\n  "key": "value"\n}'
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional context data to pass to the agent
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : editTask ? "Update Task" : "Create Task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
