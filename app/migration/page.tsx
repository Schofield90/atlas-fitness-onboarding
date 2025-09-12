"use client";

import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useOrganization } from "@/app/hooks/useOrganization";
import { MigrationWizard } from "@/app/components/migration/MigrationWizard";
import { MigrationDashboard } from "@/app/components/migration/MigrationDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Badge";

interface MigrationJob {
  id: string;
  name: string;
  status:
    | "pending"
    | "processing"
    | "analyzing"
    | "importing"
    | "completed"
    | "failed";
  progress_percentage: number;
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  created_at: string;
  pending_conflicts: number;
}

export default function MigrationPage() {
  const { organization } = useOrganization();
  const [activeView, setActiveView] = useState<"dashboard" | "wizard">(
    "dashboard",
  );
  const [migrationJobs, setMigrationJobs] = useState<MigrationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch migration jobs
  const fetchMigrationJobs = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch(
        `/api/migration/jobs?organizationId=${organization.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMigrationJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Error fetching migration jobs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  React.useEffect(() => {
    fetchMigrationJobs();
  }, [fetchMigrationJobs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "processing":
      case "analyzing":
      case "importing":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "failed":
        return <AlertCircle className="w-4 h-4" />;
      case "processing":
      case "analyzing":
      case "importing":
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (activeView === "wizard") {
    return (
      <MigrationWizard
        organizationId={organization?.id || ""}
        onComplete={() => {
          setActiveView("dashboard");
          fetchMigrationJobs();
        }}
        onCancel={() => setActiveView("dashboard")}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Migration</h1>
          <p className="mt-2 text-lg text-gray-600">
            Import your existing fitness management data into Atlas Fitness CRM
          </p>
        </div>
        <Button
          onClick={() => setActiveView("wizard")}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Start New Migration
        </Button>
      </div>

      {/* Migration Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Migrations
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{migrationJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              {migrationJobs.filter((job) => job.status === "completed").length}{" "}
              completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Records Imported
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {migrationJobs
                .reduce((sum, job) => sum + (job.successful_imports || 0), 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all migrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Conflicts
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {migrationJobs.reduce(
                (sum, job) => sum + (job.pending_conflicts || 0),
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Require manual resolution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Jobs List */}
      <Card>
        <CardHeader>
          <CardTitle>Migration History</CardTitle>
          <CardDescription>
            Track and manage your data migration jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading migrations...</span>
            </div>
          ) : migrationJobs.length === 0 ? (
            <div className="text-center py-8">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No migrations yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by importing your first dataset.
              </p>
              <div className="mt-6">
                <Button onClick={() => setActiveView("wizard")}>
                  <Upload className="w-4 h-4 mr-2" />
                  Start Migration
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {migrationJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(job.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {job.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {new Date(job.created_at).toLocaleDateString()} •{" "}
                        {job.total_records.toLocaleString()} records
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {job.status === "processing" ||
                    job.status === "analyzing" ||
                    job.status === "importing" ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {job.progress_percentage}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        {job.successful_imports > 0 && (
                          <span className="text-green-600">
                            {job.successful_imports} imported
                          </span>
                        )}
                        {job.failed_imports > 0 && (
                          <span className="text-red-600 ml-2">
                            {job.failed_imports} failed
                          </span>
                        )}
                      </div>
                    )}

                    <Badge className={getStatusColor(job.status)}>
                      {job.status.replace("_", " ")}
                    </Badge>

                    {job.pending_conflicts > 0 && (
                      <Badge variant="outline" className="text-orange-600">
                        {job.pending_conflicts} conflicts
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to job details
                        window.location.href = `/migration/${job.id}`;
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>How Migration Works</CardTitle>
          <CardDescription>
            Our AI-powered migration process makes data import simple and
            accurate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                1. Upload Files
              </h3>
              <p className="text-sm text-gray-600">
                Upload CSV or Excel files containing your GoTeamUp data
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">2. AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Our AI analyzes your data and suggests optimal field mappings
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                3. Review & Import
              </h3>
              <p className="text-sm text-gray-600">
                Review the mappings and start the automated import process
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">
                4. Resolve Issues
              </h3>
              <p className="text-sm text-gray-600">
                Handle any conflicts or data quality issues that arise
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supported Data Types */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Data Types</CardTitle>
          <CardDescription>
            We can import these types of data from GoTeamUp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">
                Client Information
              </h4>
              <p className="text-sm text-gray-600">
                Names, emails, phone numbers, addresses
              </p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Memberships</h4>
              <p className="text-sm text-gray-600">
                Membership types, start dates, payment info
              </p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Class Bookings</h4>
              <p className="text-sm text-gray-600">
                Class schedules, attendance records
              </p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">
                Payment History
              </h4>
              <p className="text-sm text-gray-600">
                Transaction records, payment methods
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
