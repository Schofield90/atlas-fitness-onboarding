"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Download,
  Eye,
  ChevronRight,
  Users,
  CreditCard,
  Calendar,
  FileText,
  Loader2,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Bug,
} from "lucide-react";
import toast from "@/app/lib/toast";

const supabase = createClient();

interface MigrationJob {
  id: string;
  source_system: string;
  status: string;
  total_records: number;
  processed_records: number;
  successful_records: number;
  failed_records: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  ai_analysis?: any;
}

interface MigrationConflict {
  id: string;
  conflict_type: string;
  existing_data: any;
  incoming_data: any;
  resolution_strategy?: string;
}

export default function MigrationStatusPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<MigrationJob | null>(null);
  const [conflicts, setConflicts] = useState<MigrationConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadMigrationJobs();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadMigrationJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedJob) {
      loadJobDetails(selectedJob.id);
    }
  }, [selectedJob]);

  const loadMigrationJobs = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found");
        return;
      }

      // Get organization_id from user_organizations table
      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      let organizationId = userOrg?.organization_id;

      if (!organizationId) {
        // Use fallback for testing
        organizationId = "63589490-8f55-4157-bd3a-e141594b748e";
        console.log("Using fallback organization_id:", organizationId);
      } else {
        console.log(
          "Found organization_id from user_organizations:",
          organizationId,
        );
      }

      console.log("Fetching migration jobs for org:", organizationId);

      const { data, error } = await supabase
        .from("migration_jobs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching migration jobs:", error);
      } else {
        console.log("Migration jobs fetched:", data);
        setJobs(data || []);

        // Auto-select active job
        const activeJob = data?.find((job) =>
          ["processing", "analyzing", "mapping"].includes(job.status),
        );
        if (activeJob && !selectedJob) {
          setSelectedJob(activeJob);
        }
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    try {
      // Fetch conflicts
      const response = await fetch(`/api/migration/jobs/${jobId}/conflicts`);
      if (response.ok) {
        const result = await response.json();
        setConflicts(result.conflicts || []);
      }
    } catch (error) {
      console.error("Error loading job details:", error);
    }
  };

  const resolveConflict = async (conflictId: string, resolution: string) => {
    try {
      const response = await fetch(
        `/api/migration/jobs/${selectedJob?.id}/conflicts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conflictId, resolution }),
        },
      );

      if (response.ok) {
        toast.success("Conflict resolved");
        loadJobDetails(selectedJob!.id);
      }
    } catch (error) {
      console.error("Error resolving conflict:", error);
      toast.error("Failed to resolve conflict");
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to cancel this migration?")) return;

    try {
      const { error } = await supabase
        .from("migration_jobs")
        .update({ status: "cancelled" })
        .eq("id", jobId);

      if (!error) {
        toast.success("Migration cancelled");
        loadMigrationJobs();
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
      toast.error("Failed to cancel migration");
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/migration/jobs/${jobId}/retry`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Migration restarted");
        loadMigrationJobs();
      }
    } catch (error) {
      console.error("Error retrying job:", error);
      toast.error("Failed to restart migration");
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this migration job?")) return;

    try {
      const { error } = await supabase
        .from("migration_jobs")
        .delete()
        .eq("id", jobId);

      if (!error) {
        toast.success("Migration job deleted");
        if (selectedJob?.id === jobId) {
          setSelectedJob(null);
        }
        loadMigrationJobs();
      } else {
        console.error("Error deleting job:", error);
        toast.error("Failed to delete migration job");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete migration job");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
      case "analyzing":
      case "mapping":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500 bg-green-900/20";
      case "failed":
        return "text-red-500 bg-red-900/20";
      case "processing":
      case "analyzing":
      case "mapping":
        return "text-blue-500 bg-blue-900/20";
      case "cancelled":
        return "text-gray-500 bg-gray-900/20";
      default:
        return "text-gray-400 bg-gray-900/20";
    }
  };

  const calculateProgress = (job: MigrationJob) => {
    if (job.total_records === 0) return 0;
    return Math.round((job.processed_records / job.total_records) * 100);
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.floor((endTime - startTime) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const runDebugCheck = async () => {
    try {
      const jobId = selectedJob?.id;
      const url = jobId
        ? `/api/migration/debug?jobId=${jobId}`
        : "/api/migration/debug";

      const response = await fetch(url);
      const data = await response.json();
      setDebugInfo(data);
      setShowDebug(true);

      if (data.summary?.status?.includes("Issues found")) {
        toast.error("Migration system issues detected - check debug info");
      } else {
        toast.success("All migration system checks passed");
      }
    } catch (error) {
      console.error("Debug check failed:", error);
      toast.error("Failed to run debug check");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Migration Status</h1>
              <p className="text-gray-400">
                Track and manage your data migration jobs
              </p>
            </div>
            <button
              onClick={runDebugCheck}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              Debug System
            </button>
          </div>
        </div>

        {/* Debug Info Panel */}
        {showDebug && debugInfo && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Information
              </h2>
              <button
                onClick={() => setShowDebug(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Summary */}
              <div className="p-3 bg-gray-700 rounded">
                <p className="font-medium mb-2">Summary</p>
                <p
                  className={`text-sm ${debugInfo.summary?.status?.includes("Issues") ? "text-red-400" : "text-green-400"}`}
                >
                  {debugInfo.summary?.status}
                </p>
              </div>

              {/* Checks */}
              <div className="space-y-2">
                <p className="font-medium">System Checks:</p>
                {Object.entries(debugInfo.checks || {}).map(
                  ([key, check]: [string, any]) => (
                    <div key={key} className="p-2 bg-gray-700 rounded text-sm">
                      <div className="flex items-start justify-between">
                        <span className="font-mono">{key}:</span>
                        <span
                          className={
                            check.status?.includes("✅")
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {check.status}
                        </span>
                      </div>
                      {check.error && (
                        <p className="text-red-400 text-xs mt-1">
                          Error: {check.error}
                        </p>
                      )}
                      {check.hint && (
                        <p className="text-yellow-400 text-xs mt-1">
                          Hint: {check.hint}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>

              {/* SQL Fix if needed */}
              {debugInfo.sqlFix && (
                <div className="p-3 bg-red-900/20 border border-red-500 rounded">
                  <p className="font-medium text-red-400 mb-2">
                    Action Required:
                  </p>
                  <p className="text-sm mb-2">{debugInfo.sqlFix.message}</p>
                  <pre className="bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                    {debugInfo.sqlFix.sql}
                  </pre>
                  <a
                    href={debugInfo.sqlFix.dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-2 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Open Supabase SQL Editor →
                  </a>
                </div>
              )}

              {/* Raw JSON for debugging */}
              <details className="cursor-pointer">
                <summary className="text-sm text-gray-400 hover:text-white">
                  View Raw Debug Data
                </summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Migration Jobs</h2>

              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No migration jobs yet</p>
                  <button
                    onClick={() => router.push("/settings/migrations")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Migration
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedJob?.id === job.id
                          ? "bg-blue-900/20 border-blue-500"
                          : "bg-gray-700 border-gray-600 hover:bg-gray-700/70"
                      }`}
                    >
                      <div
                        onClick={() => setSelectedJob(job)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">
                            {job.source_system}
                          </span>
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>
                            {new Date(job.created_at).toLocaleDateString()} at{" "}
                            {new Date(job.created_at).toLocaleTimeString()}
                          </div>
                          {job.started_at && (
                            <div className="text-xs">
                              Started:{" "}
                              {new Date(job.started_at).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Progress</span>
                            <span>{calculateProgress(job)}%</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${calculateProgress(job)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {(job.status === "failed" ||
                        job.status === "cancelled") && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteJob(job.id);
                            }}
                            className="w-full px-3 py-1.5 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 flex items-center justify-center gap-2 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Job
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="space-y-6">
                {/* Status Overview */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Job Details</h2>
                    <div className="flex gap-2">
                      {selectedJob.status === "failed" && (
                        <>
                          <button
                            onClick={() => retryJob(selectedJob.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                          </button>
                          <button
                            onClick={async () => {
                              const response = await fetch(
                                `/api/migration/jobs/${selectedJob.id}/parse-csv`,
                                {
                                  method: "POST",
                                },
                              );
                              const data = await response.json();
                              console.log("Parse CSV result:", data);
                              if (data.logs) {
                                data.logs.forEach((log: string) =>
                                  console.log(log),
                                );
                              }
                              if (data.success) {
                                toast.success(
                                  `Parsed ${data.stats.totalRows} rows - created ${data.stats.recordsCreated} records`,
                                );
                                loadMigrationJobs();
                              } else {
                                toast.error(`Parse failed: ${data.error}`);
                              }
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Parse CSV
                          </button>
                          <button
                            onClick={async () => {
                              const response = await fetch(
                                `/api/migration/jobs/${selectedJob.id}/test-process`,
                                {
                                  method: "POST",
                                },
                              );
                              const data = await response.json();
                              console.log("Test process result:", data);
                              if (data.logs) {
                                data.logs.forEach((log: string) =>
                                  console.log(log),
                                );
                              }
                              if (data.success) {
                                toast.success(
                                  "Test process completed - check console",
                                );
                                loadMigrationJobs();
                              } else {
                                toast.error(`Test failed: ${data.error}`);
                              }
                            }}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                          >
                            <Bug className="h-4 w-4" />
                            Test Process
                          </button>
                          <button
                            onClick={() => deleteJob(selectedJob.id)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      )}
                      {selectedJob.status === "cancelled" && (
                        <button
                          onClick={() => deleteJob(selectedJob.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      )}
                      {["processing", "analyzing", "mapping"].includes(
                        selectedJob.status,
                      ) && (
                        <button
                          onClick={() => cancelJob(selectedJob.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedJob.status)}`}
                      >
                        {selectedJob.status}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Duration</p>
                      <p className="text-lg font-medium">
                        {selectedJob.started_at
                          ? formatDuration(
                              selectedJob.started_at,
                              selectedJob.completed_at,
                            )
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="text-sm">
                        {new Date(selectedJob.created_at).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(selectedJob.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Started</p>
                      <p className="text-sm">
                        {selectedJob.started_at
                          ? `${new Date(selectedJob.started_at).toLocaleDateString()} at ${new Date(selectedJob.started_at).toLocaleTimeString()}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Overall Progress</span>
                      <span>{calculateProgress(selectedJob)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all"
                        style={{ width: `${calculateProgress(selectedJob)}%` }}
                      />
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <FileText className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedJob.total_records}
                      </p>
                      <p className="text-xs text-gray-400">Total Records</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <Loader2 className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedJob.processed_records}
                      </p>
                      <p className="text-xs text-gray-400">Processed</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedJob.successful_records}
                      </p>
                      <p className="text-xs text-gray-400">Successful</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3 text-center">
                      <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedJob.failed_records}
                      </p>
                      <p className="text-xs text-gray-400">Failed</p>
                    </div>
                  </div>

                  {/* AI Analysis Results */}
                  {selectedJob.ai_analysis && (
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <h3 className="font-medium mb-3">AI Analysis Results</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">
                            Confidence Score:
                          </span>
                          <span className="ml-2">
                            {(
                              selectedJob.ai_analysis.confidence_score * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Headers Found:</span>
                          <span className="ml-2">
                            {selectedJob.ai_analysis.headers_found}
                          </span>
                        </div>
                        {selectedJob.ai_analysis.detected_types && (
                          <div className="col-span-2">
                            <span className="text-gray-400">
                              Detected Types:
                            </span>
                            <div className="flex gap-2 mt-2">
                              {Object.entries(
                                selectedJob.ai_analysis.detected_types,
                              ).map(([type, count]) => (
                                <span
                                  key={type}
                                  className="px-2 py-1 bg-gray-700 rounded-md text-xs"
                                >
                                  {type}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      Conflicts Requiring Resolution ({conflicts.length})
                    </h3>
                    <div className="space-y-3">
                      {conflicts.slice(0, 5).map((conflict) => (
                        <div
                          key={conflict.id}
                          className="bg-gray-700 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {conflict.conflict_type.replace("_", " ")}
                            </span>
                            {!conflict.resolution_strategy && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    resolveConflict(conflict.id, "skip")
                                  }
                                  className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() =>
                                    resolveConflict(conflict.id, "update")
                                  }
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Update
                                </button>
                                <button
                                  onClick={() =>
                                    resolveConflict(conflict.id, "merge")
                                  }
                                  className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  Merge
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            <p>
                              Existing:{" "}
                              {JSON.stringify(conflict.existing_data).slice(
                                0,
                                50,
                              )}
                              ...
                            </p>
                            <p>
                              Incoming:{" "}
                              {JSON.stringify(conflict.incoming_data).slice(
                                0,
                                50,
                              )}
                              ...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedJob.status === "completed" && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => router.push("/leads")}
                        className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-3">
                          <Users className="h-5 w-5" />
                          View Imported Clients
                        </span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <button className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center justify-between">
                        <span className="flex items-center gap-3">
                          <Download className="h-5 w-5" />
                          Download Import Report
                        </span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Select a Migration Job
                </h3>
                <p className="text-gray-400">
                  Choose a job from the list to view details and progress
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
