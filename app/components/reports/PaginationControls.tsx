"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationMeta } from "@/app/lib/reports/types";

interface PaginationControlsProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
  showPageSizeSelector?: boolean;
  showResultsInfo?: boolean;
  showFirstLast?: boolean;
  loading?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500];

export default function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  className = "",
  showPageSizeSelector = true,
  showResultsInfo = true,
  showFirstLast = true,
  loading = false,
}: PaginationControlsProps) {
  const { page, page_size, total_count, total_pages, has_previous, has_next } =
    pagination;

  const startRecord = Math.min((page - 1) * page_size + 1, total_count);
  const endRecord = Math.min(page * page_size, total_count);

  const generatePageNumbers = () => {
    const maxVisiblePages = 7;
    const pages: (number | string)[] = [];

    if (total_pages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      pages.push(1);

      if (page > 4) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(total_pages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== total_pages) {
          pages.push(i);
        }
      }

      if (page < total_pages - 3) {
        pages.push("...");
      }

      if (total_pages > 1) {
        pages.push(total_pages);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  if (total_pages <= 1 && !showResultsInfo && !showPageSizeSelector) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {/* Results Info & Page Size Selector */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {showResultsInfo && (
          <div className="text-sm text-gray-400">
            Showing {startRecord.toLocaleString()} to{" "}
            {endRecord.toLocaleString()} of {total_count.toLocaleString()}{" "}
            results
          </div>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show:</span>
            <select
              value={page_size}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              disabled={loading}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-400">per page</span>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {total_pages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(1)}
              disabled={!has_previous || loading}
              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!has_previous || loading}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((pageNum, index) => (
              <button
                key={index}
                onClick={() =>
                  typeof pageNum === "number" && onPageChange(pageNum)
                }
                disabled={typeof pageNum === "string" || loading}
                className={`px-3 py-1 rounded transition-colors min-w-[2.5rem] ${
                  pageNum === page
                    ? "bg-orange-600 text-white"
                    : typeof pageNum === "string"
                      ? "text-gray-400 cursor-default"
                      : "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next || loading}
            className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page */}
          {showFirstLast && (
            <button
              onClick={() => onPageChange(total_pages)}
              disabled={!has_next || loading}
              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
