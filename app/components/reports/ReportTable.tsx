"use client";

import { ReactNode, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  AlertCircle,
  Search,
  Filter,
  Download,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  formatNumber,
} from "@/app/lib/reports/formatting";
import ExportButton from "./ExportButton";
import type { ReportType, PaginationMeta } from "@/app/lib/reports/types";

interface ColumnDef<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: T, index: number) => ReactNode;
  format?: "currency" | "date" | "percentage" | "number" | "datetime" | "time";
  currency?: string;
  locale?: string;
}

interface ReportTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  error?: string | null;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  className?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showExport?: boolean;
  exportConfig?: {
    reportType: ReportType;
    filters: Record<string, any>;
  };
  maxHeight?: string;
  stickyHeader?: boolean;
  zebra?: boolean;
  compact?: boolean;
}

export default function ReportTable<T = any>({
  data,
  columns,
  loading = false,
  error = null,
  pagination,
  onPageChange,
  onSort,
  sortKey,
  sortDirection,
  className = "",
  emptyMessage = "No data available",
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  showExport = false,
  exportConfig,
  maxHeight = "max-h-96",
  stickyHeader = true,
  zebra = true,
  compact = false,
}: ReportTableProps<T>) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchValue);

  const handleSort = (key: string) => {
    if (!onSort) return;

    const newDirection =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  const formatCellValue = (
    value: any,
    column: ColumnDef<T>,
    row: T,
    index: number,
  ): ReactNode => {
    // Use custom render function if provided
    if (column.render) {
      return column.render(value, row, index);
    }

    // Handle null/undefined values
    if (value === null || value === undefined) {
      return <span className="text-gray-500">-</span>;
    }

    // Format based on column type
    switch (column.format) {
      case "currency":
        return formatCurrency(value, column.currency, column.locale);

      case "date":
        return formatDate(value, "dd/MM/yyyy");

      case "datetime":
        return formatDate(value, "dd/MM/yyyy HH:mm");

      case "time":
        return formatDate(value, "HH:mm");

      case "percentage":
        return formatPercentage(value, 1, column.locale);

      case "number":
        return formatNumber(value, { locale: column.locale });

      default:
        return String(value);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 text-gray-500" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 text-orange-400" />
    ) : (
      <ChevronDown className="h-3 w-3 text-orange-400" />
    );
  };

  const getAlignmentClass = (align?: string) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  if (error) {
    return (
      <div
        className={`bg-gray-800 border border-gray-700 rounded-lg p-8 ${className}`}
      >
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Error Loading Data
          </h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header Actions */}
      {(showSearch || showExport) && (
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            {showSearch && (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={localSearchTerm}
                    onChange={(e) => {
                      setLocalSearchTerm(e.target.value);
                      onSearchChange?.(e.target.value);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {/* Export */}
            {showExport && exportConfig && (
              <ExportButton
                reportType={exportConfig.reportType}
                filters={exportConfig.filters}
                variant="compact"
                disabled={loading || data.length === 0}
              />
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className={`overflow-auto ${maxHeight}`}>
        <table className="w-full">
          {/* Header */}
          <thead
            className={`bg-gray-700 ${stickyHeader ? "sticky top-0 z-10" : ""}`}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-sm font-medium text-gray-300 ${getAlignmentClass(column.align)} ${
                    column.width || ""
                  } ${column.sortable ? "cursor-pointer hover:bg-gray-600 transition-colors" : ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-gray-700">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 ${getAlignmentClass(column.align)}`}
                    >
                      <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-700 transition-colors hover:bg-gray-750 ${
                    zebra && index % 2 === 1 ? "bg-gray-800/50" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 ${compact ? "py-2" : "py-3"} text-sm text-white ${getAlignmentClass(column.align)}`}
                    >
                      {formatCellValue(row[column.key], column, row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="p-4 border-t border-gray-700 bg-gray-750">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.page_size + 1} to{" "}
              {Math.min(
                pagination.page * pagination.page_size,
                pagination.total_count,
              )}{" "}
              of {pagination.total_count.toLocaleString()} results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={!pagination.has_previous || loading}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {/* Page numbers */}
                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange?.(pageNum)}
                        disabled={loading}
                        className={`px-3 py-1 rounded transition-colors ${
                          pageNum === pagination.page
                            ? "bg-orange-600 text-white"
                            : "bg-gray-700 hover:bg-gray-600 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {pageNum}
                      </button>
                    );
                  },
                )}
              </div>

              <button
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={!pagination.has_next || loading}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
