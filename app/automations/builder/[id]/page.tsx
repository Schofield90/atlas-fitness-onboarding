"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import DynamicWorkflowBuilder from "@/app/components/automation/DynamicWorkflowBuilder";
import type { Workflow } from "@/app/lib/types/automation";

export default function EditWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const [userData, setUserData] = useState<any>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("gymleadhub_trial_data");
      if (storedData) {
        setUserData(JSON.parse(storedData));
      }
    }

    // Load workflow data
    const workflowId = params.id as string;
    loadWorkflow(workflowId);
  }, [params.id]);

  const loadWorkflow = async (id: string) => {
    try {
      // Try to load existing workflow
      if (id !== "new") {
        const response = await fetch(`/api/automations/workflows/${id}`);
        if (response.ok) {
          const data = await response.json();
          const workflow: Workflow = {
            id: data.workflow.id,
            organizationId: data.workflow.organization_id,
            name: data.workflow.name,
            description: data.workflow.description,
            status: data.workflow.status,
            version: 1,
            workflowData: {
              nodes: data.workflow.nodes || [],
              edges: data.workflow.edges || [],
              variables: data.workflow.variables
                ? Object.entries(data.workflow.variables).map(
                    ([key, value]: [string, any]) => ({
                      id: key,
                      name: key,
                      type: typeof value === "string" ? "string" : "number",
                      value: value,
                      scope: "workflow" as const,
                    }),
                  )
                : [],
            },
            triggerType: data.workflow.trigger_type || "manual",
            triggerConfig: data.workflow.trigger_config || {},
            settings: data.workflow.settings || {
              errorHandling: "continue",
              maxExecutionTime: 300,
              timezone: "Europe/London",
              notifications: {
                onError: true,
                onComplete: false,
              },
            },
            stats: {
              totalExecutions: data.workflow.total_executions || 0,
              successfulExecutions: data.workflow.successful_executions || 0,
              failedExecutions: data.workflow.failed_executions || 0,
              avgExecutionTime: 0,
            },
            createdAt: data.workflow.created_at,
            updatedAt: data.workflow.updated_at,
          };
          setWorkflow(workflow);
          return;
        }
      }

      // Create new workflow
      const mockWorkflow: Workflow = {
        id,
        organizationId: "mock-org-id",
        name: "Welcome Series",
        description: "Automated welcome sequence for new leads",
        status: "active",
        version: 1,
        workflowData: {
          nodes: [],
          edges: [],
          variables: [],
        },
        triggerType: "lead_created",
        triggerConfig: {},
        settings: {
          errorHandling: "continue",
          maxExecutionTime: 300,
          timezone: "Europe/London",
          notifications: {
            onError: true,
            onComplete: false,
          },
        },
        stats: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          avgExecutionTime: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setWorkflow(mockWorkflow);
    } catch (error) {
      console.error("Failed to load workflow:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedWorkflow: Workflow) => {
    try {
      // Prepare variables as object
      const variables: Record<string, any> = {};
      updatedWorkflow.workflowData.variables?.forEach((v) => {
        variables[v.name] = v.value;
      });

      const payload = {
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        status: updatedWorkflow.status,
        workflowData: {
          nodes: updatedWorkflow.workflowData.nodes,
          edges: updatedWorkflow.workflowData.edges,
          variables,
        },
        trigger_type: updatedWorkflow.triggerType,
        trigger_config: updatedWorkflow.triggerConfig,
        settings: updatedWorkflow.settings,
      };

      if (params.id === "new") {
        // Create new workflow
        const response = await fetch("/api/automations/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create workflow");

        // Get the new ID and stay in the builder (replace URL to new id)
        const data = await response.json();
        if (data.workflow?.id) {
          router.replace(`/automations/builder/${data.workflow.id}`);
        }
      } else {
        // Update existing workflow (stay on page)
        const response = await fetch(
          `/api/automations/workflows/${params.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) throw new Error("Failed to update workflow");
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
      alert("Failed to save workflow. Please try again.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout userData={userData}>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Loading workflow...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!workflow) {
    return (
      <DashboardLayout userData={userData}>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Workflow not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userData={userData}>
      <DynamicWorkflowBuilder
        workflow={workflow}
        onSave={handleSave}
        onCancel={() => router.push("/automations")}
      />
    </DashboardLayout>
  );
}
