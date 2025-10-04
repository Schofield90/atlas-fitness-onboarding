"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface ReportLink {
  name: string;
  description: string;
  href: string;
  enabled: boolean;
}

interface ReportCategory {
  name: string;
  description: string;
  reports: ReportLink[];
}

interface ReportsMetadata {
  organizationId: string;
  categories: ReportCategory[];
  meta: {
    totalReports: number;
    enabledReports: number;
    generatedAt: string;
  };
}

const categoryIcons: Record<string, React.ElementType> = {
  "Classes & Courses": Calendar,
  Customers: Users,
  Revenue: DollarSign,
};

const categoryColors: Record<string, string> = {
  "Classes & Courses": "text-blue-500",
  Customers: "text-green-500",
  Revenue: "text-yellow-500",
};

export default function ReportsHubPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [reports, setReports] = useState<ReportsMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/reports/meta");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load reports");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to load reports");
        }

        setReports(data.data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch reports:", err);
        setError(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleReportClick = (report: ReportLink) => {
    if (!report.enabled) return;

    if (report.href.startsWith("#")) {
      // Show coming soon toast for disabled reports
      return;
    }

    // Prepend orgSlug if href is a relative path
    const targetHref = report.href.startsWith("/")
      ? `/org/${orgSlug}${report.href}`
      : report.href;
    router.push(targetHref);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading reports...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Failed to Load Reports
              </h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Reports Hub
                </h1>
                <p className="text-gray-400">
                  Comprehensive reporting and analytics for your fitness
                  business
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {reports?.meta.totalReports}
                    </div>
                    <div className="text-gray-400">Total Reports</div>
                  </div>
                  <div className="w-px h-8 bg-gray-600"></div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-500">
                      {reports?.meta.enabledReports}
                    </div>
                    <div className="text-gray-400">Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Categories */}
          <div className="space-y-8">
            {reports?.categories.map((category) => {
              const IconComponent = categoryIcons[category.name] || FileText;
              const iconColor =
                categoryColors[category.name] || "text-gray-500";

              return (
                <div key={category.name} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg bg-gray-800 border border-gray-700`}
                    >
                      <IconComponent className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {category.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  {/* Category Reports Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.reports.map((report) => (
                      <button
                        key={report.name}
                        onClick={() => handleReportClick(report)}
                        disabled={!report.enabled}
                        className={`
                          text-left p-4 rounded-lg border transition-all duration-200
                          ${
                            report.enabled
                              ? "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600 cursor-pointer transform hover:scale-[1.02]"
                              : "bg-gray-900 border-gray-800 cursor-not-allowed opacity-60"
                          }
                        `}
                        aria-label={`${report.name} - ${report.description}`}
                        tabIndex={report.enabled ? 0 : -1}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3
                            className={`font-semibold ${report.enabled ? "text-white" : "text-gray-500"}`}
                          >
                            {report.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            {!report.enabled && (
                              <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                                Coming Soon
                              </span>
                            )}
                            {report.enabled && (
                              <ChevronRight className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-sm mb-3 ${report.enabled ? "text-gray-400" : "text-gray-600"}`}
                        >
                          {report.description}
                        </p>

                        {report.enabled && (
                          <div className="flex items-center text-orange-500 text-sm font-medium">
                            <span>View Report</span>
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border border-orange-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Need Custom Reports?
                </h3>
                <p className="text-gray-400">
                  Contact our team to set up custom reporting solutions tailored
                  to your business needs.
                </p>
              </div>
              <button
                onClick={() => router.push(`/org/${orgSlug}/contact-sales`)}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
              >
                <TrendingUp className="h-5 w-5" />
                Request Custom Report
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Reports updated in real-time • Last generated:{" "}
              {reports?.meta.generatedAt
                ? new Date(reports.meta.generatedAt).toLocaleString()
                : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
