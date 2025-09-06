"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  Play,
  Pause,
  Plus,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  BarChart3,
  History,
} from "lucide-react";
import TriggerHistory from "@/app/components/automation/TriggerHistory";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  trigger: string;
  totalExecutions: number;
  lastExecuted?: string;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function AutomationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"workflows" | "history">(
    "workflows",
  );
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "25"),
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [statusFilter, pagination.page, pagination.pageSize]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/automations/workflows?${params}`);
      const data = await response.json();

      if (response.ok) {
        const list = (data.workflows || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description || "",
          status: w.status || "draft",
          trigger: w.trigger_type || "manual",
          totalExecutions: w.total_executions || 0,
          lastExecuted: w.last_executed,
          created_at: w.created_at,
          updated_at: w.updated_at,
        }));
        setWorkflows(list);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages:
            data.pagination?.totalPages ||
            Math.ceil((data.pagination?.total || 0) / prev.pageSize),
        }));
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "draft":
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "paused":
        return <Clock className="w-4 h-4" />;
      case "draft":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case "lead_created":
        return <Zap className="w-4 h-4 text-blue-500" />;
      case "booking_created":
        return <Clock className="w-4 h-4 text-green-500" />;
      case "form_submitted":
        return <Edit className="w-4 h-4 text-purple-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTriggerName = (trigger: string) => {
    return trigger
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const response = await fetch(
        `/api/automations/${workflow.id}/duplicate`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (data.success) {
        fetchWorkflows();
      }
    } catch (error) {
      console.error("Error duplicating workflow:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
        setPagination((prev) => ({
          ...prev,
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / prev.pageSize),
        }));
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
  };

  const handleToggleWorkflow = (id: string, currentStatus: string) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? ({
              ...w,
              status: currentStatus === "active" ? "paused" : "active",
            } as Workflow)
          : w,
      ),
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      page: 1, // Reset to first page when changing page size
    }));
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workflow Automations</h1>
          <p className="text-gray-400">
            Create and manage automated workflows for your gym
          </p>
        </div>
        <Link
          href="/automations/builder"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Workflow
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Total Workflows</span>
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold">{pagination.total}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Active</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">
            {workflows.filter((w) => w.status === "active").length}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Paused</span>
            <Pause className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold">
            {workflows.filter((w) => w.status === "paused").length}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Total Executions</span>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">
            {workflows.reduce((acc, w) => acc + w.totalExecutions, 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("workflows")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "workflows"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Workflows
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "history"
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Trigger History
            </div>
          </button>
        </nav>
      </div>

      {activeTab === "workflows" ? (
        <>
          {/* Filter and Search */}
          <div className="flex gap-4 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Workflows List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No workflows yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first automation workflow to get started
              </p>
              <Link
                href="/automations/builder"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Workflow
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {workflow.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(workflow.status)}`}
                        >
                          {getStatusIcon(workflow.status)}
                          {workflow.status}
                        </span>
                      </div>

                      <p className="text-gray-400 mb-4">
                        {workflow.description}
                      </p>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(workflow.trigger)}
                          <span className="text-gray-400">
                            Trigger:{" "}
                            <span className="text-white">
                              {formatTriggerName(workflow.trigger)}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-400">
                            Executions:{" "}
                            <span className="text-white">
                              {workflow.totalExecutions}
                            </span>
                          </span>
                        </div>

                        {workflow.lastExecuted && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400">
                              Last run:{" "}
                              <span className="text-white">
                                {formatDate(workflow.lastExecuted)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleWorkflow(workflow.id, workflow.status)
                        }
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.status === "active"
                            ? "bg-green-500/10 hover:bg-green-500/20 text-green-500"
                            : "bg-gray-700 hover:bg-gray-600 text-gray-400"
                        }`}
                        title={
                          workflow.status === "active"
                            ? "Pause Workflow"
                            : "Activate Workflow"
                        }
                      >
                        {workflow.status === "active" ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>

                      <Link
                        href={`/automations/builder/${workflow.id}`}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Edit Workflow"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>

                      <div className="relative group">
                        <button
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="More Options"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => handleDuplicate(workflow)}
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-600 transition-colors text-left"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(workflow.id)}
                            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-600 transition-colors text-left text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Show</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-400">per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, pagination.totalPages))].map(
                    (_, index) => {
                      const pageNum =
                        pagination.page <= 3
                          ? index + 1
                          : pagination.page >= pagination.totalPages - 2
                            ? pagination.totalPages - 4 + index
                            : pagination.page - 2 + index;

                      if (pageNum < 1 || pageNum > pagination.totalPages)
                        return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 rounded transition-colors ${
                            pageNum === pagination.page
                              ? "bg-orange-500 text-white"
                              : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>

              <div className="text-gray-400">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </div>
            </div>
          )}
        </>
      ) : (
        /* Trigger History Tab */
        <TriggerHistory />
      )}
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        }
      >
        <AutomationsContent />
      </Suspense>
    </DashboardLayout>
  );
}
