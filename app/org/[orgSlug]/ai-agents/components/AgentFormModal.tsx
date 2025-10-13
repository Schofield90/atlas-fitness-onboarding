"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Bot, Loader2, Sparkles } from "lucide-react";

const agentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  role: z.string().default("custom"),
  system_prompt: z.string().min(1, "System prompt is required"),
  model: z.enum([
    "gpt-5",
    "gpt-5-mini",
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku-20241022",
  ]),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(1).max(32000).optional(),
  allowed_tools: z.array(z.string()).optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens?: number;
  allowed_tools?: string[];
}

interface AgentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: Agent | null;
}

export function AgentFormModal({
  open,
  onClose,
  onSuccess,
  agent,
}: AgentFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [showAdvancedPermissions, setShowAdvancedPermissions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      role: "custom",
      system_prompt: "",
      model: "gpt-5-mini",
      temperature: 0.7,
      max_tokens: 4000,
      allowed_tools: [],
    },
  });

  const temperature = watch("temperature");

  useEffect(() => {
    if (open) {
      loadAvailableTools();
      setError(null);
    }
  }, [open]);

  // Separate effect to reset form when availableTools are loaded
  useEffect(() => {
    if (open && availableTools.length > 0) {
      if (agent) {
        reset({
          name: agent.name,
          description: agent.description,
          role: agent.role as any,
          system_prompt: agent.system_prompt,
          model: agent.model as any,
          temperature: agent.temperature,
          max_tokens: agent.max_tokens,
          allowed_tools: agent.allowed_tools || [],
        });
      } else {
        // For new agents, default to all tools selected
        // User can deselect tools they don't want
        const allToolIds = availableTools.map((t) => t.id);
        reset({
          name: "",
          description: "",
          role: "custom",
          system_prompt: "",
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 4000,
          allowed_tools: allToolIds, // Enable all tools by default
        });
      }
    }
  }, [open, agent, availableTools, reset]);

  const loadAvailableTools = async () => {
    try {
      const response = await fetch("/api/ai-agents/tools");
      const result = await response.json();
      if (result.success) {
        setAvailableTools(result.tools || []);
      }
    } catch (error) {
      console.error("Error loading tools:", error);
    }
  };

  const onSubmit = async (data: AgentFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      const url = agent ? `/api/ai-agents/${agent.id}` : "/api/ai-agents";
      const method = agent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save agent");
      }

      onSuccess();
      reset();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToolToggle = (toolId: string) => {
    const currentTools = watch("allowed_tools") || [];
    const updatedTools = currentTools.includes(toolId)
      ? currentTools.filter((id) => id !== toolId)
      : [...currentTools, toolId];
    setValue("allowed_tools", updatedTools);
  };

  const handleGeneratePrompt = async () => {
    const description = watch("description");
    if (!description) {
      setError("Please enter a description first");
      return;
    }

    setGeneratingPrompt(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-agents/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate prompt");
      }

      setValue("system_prompt", result.prompt);
    } catch (err: any) {
      setError(err.message || "Failed to generate prompt");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-orange-500" />
              {agent ? "Edit AI Agent" : "Create New AI Agent"}
            </div>
          </DialogTitle>
          <DialogDescription>
            {agent
              ? "Update the configuration for this AI agent"
              : "Configure a new AI agent to assist with your gym operations"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              {...register("name")}
              type="text"
              placeholder="Customer support Agent"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Describe what this agent does..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model *</label>
              <select
                {...register("model")}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="gpt-5-mini">GPT-5 Mini (Fast & Cheap)</option>
                <option value="gpt-5">GPT-5 (Advanced)</option>
                <option value="claude-3-5-haiku-20241022">
                  Claude 3.5 Haiku (Fast)
                </option>
                <option value="claude-sonnet-4-20250514">
                  Claude Sonnet 4.5 (Most Advanced)
                </option>
              </select>
              {errors.model && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.model.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Temperature: {temperature.toFixed(2)}
              </label>
              <input
                {...register("temperature", { valueAsNumber: true })}
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Focused (0)</span>
                <span>Creative (2)</span>
              </div>
              {errors.temperature && (
                <p className="text-red-400 text-sm mt-1">
                  {errors.temperature.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Tokens (Optional)
            </label>
            <input
              {...register("max_tokens", { valueAsNumber: true })}
              type="number"
              min="1"
              max="32000"
              placeholder="4000"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.max_tokens && (
              <p className="text-red-400 text-sm mt-1">
                {errors.max_tokens.message}
              </p>
            )}
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                System Prompt *
              </label>
              <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={generatingPrompt || !watch("description")}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPrompt ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    AI Generate
                  </>
                )}
              </button>
            </div>
            <textarea
              {...register("system_prompt")}
              rows={6}
              placeholder="Click 'AI Generate' to create a detailed system prompt from your description..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono text-sm"
            />
            {errors.system_prompt && (
              <p className="text-red-400 text-sm mt-1">
                {errors.system_prompt.message}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              💡 Tip: Enter a description above, then click "AI Generate" to
              create a comprehensive system prompt
            </p>
          </div>

          {/* Allowed Tools */}
          {availableTools.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowAdvancedPermissions(!showAdvancedPermissions)
                }
                className="text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2 transition-colors"
              >
                {showAdvancedPermissions ? "▼" : "▶"} Edit Advanced Permissions
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                  {watch("allowed_tools")?.length || 0} / {availableTools.length}{" "}
                  tools enabled
                </span>
              </button>

              {showAdvancedPermissions && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-3 mt-2">
                  {availableTools.map((tool) => (
                    <label
                      key={tool.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={
                          watch("allowed_tools")?.includes(tool.id) || false
                        }
                        onChange={() => handleToolToggle(tool.id)}
                        className="rounded border-gray-700 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-300">{tool.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {agent ? "Update Agent" : "Create Agent"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
