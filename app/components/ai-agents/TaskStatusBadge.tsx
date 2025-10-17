"use client";

import React from "react";
import Badge from "@/app/components/ui/Badge";

interface TaskStatusBadgeProps {
  status:
    | "pending"
    | "queued"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  className,
}) => {
  const statusConfig = {
    pending: { variant: "default" as const, label: "Pending", icon: "⏳" },
    queued: { variant: "info" as const, label: "Queued", icon: "📋" },
    running: { variant: "info" as const, label: "Running", icon: "▶️" },
    completed: { variant: "success" as const, label: "Completed", icon: "✓" },
    failed: { variant: "error" as const, label: "Failed", icon: "✗" },
    cancelled: { variant: "warning" as const, label: "Cancelled", icon: "⊗" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export default TaskStatusBadge;
