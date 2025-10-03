"use client";

import { useState } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  Table,
} from "lucide-react";
import type { ReportType } from "@/app/lib/reports/types";

interface ExportButtonProps {
  reportType: ReportType;
  filters: Record<string, any>;
  disabled?: boolean;
  variant?: "default" | "compact";
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean, filename?: string) => void;
}

interface ExportState {
  status: "idle" | "exporting" | "success" | "error";
  message?: string;
  filename?: string;
}

export default function ExportButton({
  reportType,
  filters,
  disabled = false,
  variant = "default",
  className = "",
  onExportStart,
  onExportComplete,
}: ExportButtonProps) {
  const [exportState, setExportState] = useState<ExportState>({
    status: "idle",
  });
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const handleExport = async (format: "csv" = "csv") => {
    if (disabled || exportState.status === "exporting") return;

    try {
      setExportState({ status: "exporting" });
      onExportStart?.();

      // Build export URL
      const params = new URLSearchParams();

      // Add all filters to export
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, String(v)));
          } else {
            params.set(key, String(value));
          }
        }
      });

      // Add timezone if not present
      if (!params.has("tz")) {
        params.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone);
      }

      // Add format
      params.set("format", format);

      const exportUrl = `/api/reports/${reportType}/export?${params.toString()}`;

      const response = await fetch(exportUrl, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Export failed" }));
        throw new Error(
          errorData.error || `Export failed with status ${response.status}`,
        );
      }

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${reportType}-export-${new Date().toISOString().split("T")[0]}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportState({
        status: "success",
        message: "Export completed successfully",
        filename,
      });

      onExportComplete?.(true, filename);

      // Reset status after 3 seconds
      setTimeout(() => {
        setExportState({ status: "idle" });
      }, 3000);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportState({
        status: "error",
        message: error.message || "Export failed",
      });

      onExportComplete?.(false);

      // Reset status after 5 seconds
      setTimeout(() => {
        setExportState({ status: "idle" });
      }, 5000);
    }
  };

  const getButtonContent = () => {
    switch (exportState.status) {
      case "exporting":
        return (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            {variant === "default" && <span>Exporting...</span>}
          </>
        );

      case "success":
        return (
          <>
            <CheckCircle className="h-4 w-4 text-green-400" />
            {variant === "default" && <span>Exported</span>}
          </>
        );

      case "error":
        return (
          <>
            <XCircle className="h-4 w-4 text-red-400" />
            {variant === "default" && <span>Failed</span>}
          </>
        );

      default:
        return (
          <>
            <Download className="h-4 w-4" />
            {variant === "default" && <span>Export CSV</span>}
          </>
        );
    }
  };

  const getButtonClassName = () => {
    let baseClass =
      "flex items-center gap-2 transition-colors font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none";

    if (variant === "compact") {
      baseClass += " p-2 rounded";
    } else {
      baseClass += " px-4 py-2 rounded-lg";
    }

    switch (exportState.status) {
      case "exporting":
        return `${baseClass} bg-orange-600 text-white cursor-wait`;

      case "success":
        return `${baseClass} bg-green-600 text-white`;

      case "error":
        return `${baseClass} bg-red-600 text-white hover:bg-red-700`;

      default:
        if (disabled) {
          return `${baseClass} bg-gray-600 text-gray-400 cursor-not-allowed`;
        }
        return `${baseClass} bg-gray-700 hover:bg-gray-600 text-white`;
    }
  };

  // For compact variant, show simple button
  if (variant === "compact") {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => handleExport("csv")}
          disabled={disabled || exportState.status === "exporting"}
          className={getButtonClassName()}
          title={exportState.message || "Export to CSV"}
        >
          {getButtonContent()}
        </button>

        {exportState.status === "error" && exportState.message && (
          <div className="absolute top-full left-0 mt-1 z-50 px-2 py-1 bg-red-600 text-white text-xs rounded whitespace-nowrap">
            {exportState.message}
          </div>
        )}
      </div>
    );
  }

  // For default variant, show button with format options (future enhancement)
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => handleExport("csv")}
        disabled={disabled || exportState.status === "exporting"}
        className={getButtonClassName()}
      >
        {getButtonContent()}
      </button>

      {/* Status Message */}
      {exportState.message && exportState.status !== "idle" && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
            exportState.status === "success"
              ? "bg-green-600 text-white"
              : exportState.status === "error"
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-gray-300"
          }`}
        >
          {exportState.message}
          {exportState.filename && (
            <div className="text-xs opacity-75 mt-1">
              {exportState.filename}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
