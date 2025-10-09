"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
}

interface DeleteAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: Agent | null;
}

export function DeleteAgentModal({
  open,
  onClose,
  onSuccess,
  agent,
}: DeleteAgentModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!agent) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai-agents/${agent.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete agent");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              Delete AI Agent
            </div>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to delete this
            agent?
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <p className="text-white font-medium mb-2">{agent.name}</p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>All conversations will be deleted</li>
              <li>All assigned tasks will be cancelled</li>
              <li>Activity history will be preserved for billing</li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              <strong>Warning:</strong> This will permanently delete all data
              associated with this agent. This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete Agent
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
