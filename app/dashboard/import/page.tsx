"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";

interface ImportStats {
  total: number;
  success: number;
  errors: number;
  skipped: number;
}

interface ImportError {
  row: number;
  error: string;
}

interface WeeklyChunk {
  week: string;
  startDate: string;
  endDate: string;
  rows: string[][];
  count: number;
}

interface UploadHistory {
  id: string;
  fileName: string;
  type: string;
  status: "processing" | "completed" | "failed";
  stats?: ImportStats;
  timestamp: string;
  jobId?: string;
}

function ImportPageContent() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [fileType, setFileType] = useState<"auto" | "payments" | "attendance">(
    "auto",
  );
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);
  const [showChunkDialog, setShowChunkDialog] = useState(false);
  const [chunks, setChunks] = useState<WeeklyChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [backgroundJob, setBackgroundJob] = useState<{
    jobId: string;
    progress: any;
    polling: boolean;
  } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);

  const CHUNK_SIZE_LIMIT = 200; // Reduced to 200 rows per chunk for better processing

  // Load upload history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("importHistory");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setUploadHistory(parsed);

        // Check for any ongoing jobs
        const ongoingJobs = parsed.filter(
          (h: UploadHistory) => h.status === "processing" && h.jobId,
        );
        if (ongoingJobs.length > 0) {
          // Resume polling for the most recent ongoing job
          const recentJob = ongoingJobs[0];
          setBackgroundJob({
            jobId: recentJob.jobId!,
            progress: null,
            polling: true,
          });
          setImporting(true);
        }
      } catch (error) {
        console.error("Error loading history:", error);
      }
    }
  }, []);

  // Save upload history to localStorage whenever it changes
  const saveHistory = (history: UploadHistory[]) => {
    setUploadHistory(history);
    localStorage.setItem("importHistory", JSON.stringify(history));
  };

  // Add to history
  const addToHistory = (item: UploadHistory) => {
    const newHistory = [item, ...uploadHistory].slice(0, 10); // Keep last 10
    saveHistory(newHistory);
  };

  // Update history item
  const updateHistoryItem = (id: string, updates: Partial<UploadHistory>) => {
    const newHistory = uploadHistory.map((h) =>
      h.id === id ? { ...h, ...updates } : h,
    );
    saveHistory(newHistory);
  };

  // Poll background job progress
  useEffect(() => {
    if (!backgroundJob?.jobId || !backgroundJob.polling) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(
          `/api/import/goteamup/status/${backgroundJob.jobId}`,
        );
        if (response.ok) {
          const result = await response.json();

          setBackgroundJob((prev) => ({
            ...prev!,
            progress: result.progress,
          }));

          // Stop polling if completed or failed
          if (
            result.progress.status === "completed" ||
            result.progress.status === "failed"
          ) {
            setBackgroundJob((prev) => ({
              ...prev!,
              polling: false,
            }));

            setImporting(false);

            if (result.progress.status === "completed") {
              const finalStats = {
                total: result.progress.totalRecords,
                success: result.progress.successfulImports,
                errors: result.progress.failedImports,
                skipped:
                  result.progress.totalRecords -
                  result.progress.successfulImports -
                  result.progress.failedImports,
              };
              setSuccess(true);
              setStats(finalStats);
              setMessage("Background import completed successfully!");

              // Update history
              if (backgroundJob.jobId) {
                updateHistoryItem(backgroundJob.jobId, {
                  status: "completed",
                  stats: finalStats,
                });
              }
            } else {
              setSuccess(false);
              setMessage("Background import failed. You can try resuming it.");

              // Update history
              if (backgroundJob.jobId) {
                updateHistoryItem(backgroundJob.jobId, {
                  status: "failed",
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error polling progress:", error);
      }
    };

    const interval = setInterval(pollProgress, 2000); // Poll every 2 seconds
    pollProgress(); // Initial poll

    return () => clearInterval(interval);
  }, [backgroundJob?.jobId, backgroundJob?.polling]);

  const resumeBackgroundJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/import/goteamup/status/${jobId}`, {
        method: "POST",
      });

      if (response.ok) {
        setBackgroundJob({
          jobId,
          progress: null,
          polling: true,
        });
        setImporting(true);
        setMessage("Resuming import...");
      }
    } catch (error) {
      console.error("Error resuming job:", error);
      setMessage("Failed to resume import");
    }
  };

  const cancelBackgroundJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/import/goteamup/status/${jobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setBackgroundJob(null);
        setImporting(false);
        setMessage("Import cancelled");
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
    }
  };

  const parseCSVData = (text: string): string[][] => {
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      // Handle quoted values properly
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result.map((cell) => cell.replace(/^"|"$/g, ""));
    });
  };

  const splitByWeek = (data: string[][], headers: string[]): WeeklyChunk[] => {
    const dateIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("date"),
    );

    if (dateIndex === -1) {
      // If no date column, split by fixed size
      const chunks: WeeklyChunk[] = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE_LIMIT) {
        chunks.push({
          week: `Batch ${chunks.length + 1}`,
          startDate: "",
          endDate: "",
          rows: data.slice(i, Math.min(i + CHUNK_SIZE_LIMIT, data.length)),
          count: Math.min(CHUNK_SIZE_LIMIT, data.length - i),
        });
      }
      return chunks;
    }

    // Group by week
    const weekGroups = new Map<string, { rows: string[][]; dates: Date[] }>();

    for (const row of data) {
      const dateStr = row[dateIndex];
      if (!dateStr) continue;

      let date: Date | null = null;

      // Parse date (handle DD/MM/YYYY format)
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          // Check if it's DD/MM/YYYY or MM/DD/YYYY
          if (day > 12 && month <= 12) {
            // Definitely DD/MM/YYYY
            date = new Date(year, month - 1, day);
          } else if (month > 12 && day <= 12) {
            // Definitely MM/DD/YYYY
            date = new Date(year, day - 1, month);
          } else {
            // Assume DD/MM/YYYY as default for UK format
            date = new Date(year, month - 1, day);
          }
        }
      } else if (dateStr.includes("-")) {
        // ISO format YYYY-MM-DD
        date = new Date(dateStr);
      }

      if (!date || isNaN(date.getTime())) continue;

      // Get week key (Sunday-based week)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Move to Sunday
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, { rows: [], dates: [] });
      }
      const group = weekGroups.get(weekKey)!;
      group.rows.push(row);
      group.dates.push(date);
    }

    // Convert to chunks
    const chunks: WeeklyChunk[] = [];
    const sortedKeys = Array.from(weekGroups.keys()).sort();

    for (const key of sortedKeys) {
      const group = weekGroups.get(key)!;
      const startDate = new Date(key);
      const endDate = new Date(key);
      endDate.setDate(endDate.getDate() + 6);

      chunks.push({
        week: `Week of ${startDate.toLocaleDateString("en-GB")}`,
        startDate: startDate.toLocaleDateString("en-GB"),
        endDate: endDate.toLocaleDateString("en-GB"),
        rows: group.rows,
        count: group.rows.length,
      });
    }

    return chunks;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setStats(null);
    setErrors([]);
    setMessage("");
    setSuccess(null);
    setShowChunkDialog(false);

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const allData = parseCSVData(text);

      if (allData.length > 0) {
        const headers = allData[0];
        const data = allData.slice(1);

        setHeaders(headers);
        setRawData(data);
        setTotalRows(data.length);
        setPreview([headers, ...data.slice(0, 5)]);

        // Auto-detect file type
        const headerLower = headers.map((h) => h.toLowerCase());
        if (
          headerLower.some((h) => h.includes("amount") || h.includes("payment"))
        ) {
          setFileType("payments");
        } else if (
          headerLower.some((h) => h.includes("class") || h.includes("time"))
        ) {
          setFileType("attendance");
        } else {
          setFileType("auto");
        }

        // Check if file is large and needs chunking
        if (data.length > CHUNK_SIZE_LIMIT) {
          const weeklyChunks = splitByWeek(data, headers);
          setChunks(weeklyChunks);
          setShowChunkDialog(true);
        }
      }
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const handleImport = async (useChunks: boolean = false) => {
    if (!file) return;

    setImporting(true);
    setMessage("");
    setErrors([]);
    setShowChunkDialog(false);

    try {
      if (useChunks && chunks.length > 0) {
        // Import chunks sequentially
        let totalStats: ImportStats = {
          total: 0,
          success: 0,
          errors: 0,
          skipped: 0,
        };
        let allErrors: ImportError[] = [];

        for (let i = 0; i < chunks.length; i++) {
          setCurrentChunk(i);
          setMessage(
            `Processing ${chunks[i].week} (${i + 1}/${chunks.length})...`,
          );

          // Create CSV content for this chunk
          const chunkContent = [
            headers.join(","),
            ...chunks[i].rows.map((row) => row.join(",")),
          ].join("\n");

          const chunkFile = new File(
            [chunkContent],
            `${file.name}-week-${i + 1}.csv`,
            {
              type: "text/csv",
            },
          );

          const formData = new FormData();
          formData.append("file", chunkFile);
          formData.append("type", fileType);

          const response = await fetch("/api/import/goteamup", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (response.ok) {
            totalStats.total += result.stats.total;
            totalStats.success += result.stats.success;
            totalStats.errors += result.stats.errors;
            totalStats.skipped += result.stats.skipped;

            if (result.errors) {
              allErrors.push(...result.errors);
            }
          } else if (response.status === 504) {
            // Timeout on chunk - try to split it further
            setMessage(
              `Chunk for ${chunks[i].week} is still too large. Please try a smaller date range or contact support.`,
            );
            setSuccess(false);
            return;
          } else {
            throw new Error(result.error || "Import failed");
          }
        }

        setSuccess(true);
        setStats(totalStats);
        setMessage(
          `Import completed successfully for all ${chunks.length} weeks`,
        );
        if (allErrors.length > 0) {
          setErrors(allErrors.slice(0, 10)); // Show first 10 errors
        }

        // Add to history
        addToHistory({
          id: Date.now().toString(),
          fileName: file.name,
          type: fileType,
          status: "completed",
          stats: totalStats,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Single import (original logic)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", fileType);

        // Use PUT method for background processing on large files
        const method = totalRows > 100 ? "PUT" : "POST";
        const response = await fetch("/api/import/goteamup", {
          method,
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          if (result.backgroundProcessing) {
            // Start background job tracking
            setBackgroundJob({
              jobId: result.jobId,
              progress: null,
              polling: true,
            });
            setMessage(
              "Import started in background. This may take several minutes...",
            );

            // Add to history
            addToHistory({
              id: result.jobId,
              fileName: file.name,
              type: fileType,
              status: "processing",
              timestamp: new Date().toISOString(),
              jobId: result.jobId,
            });
            // Don't set importing to false here - let the polling handle it
          } else {
            // Direct processing completed
            setSuccess(true);
            setStats(result.stats);
            setMessage(result.message || "Import completed successfully");
            if (result.errors && result.errors.length > 0) {
              setErrors(result.errors.slice(0, 10));
            }
            setImporting(false);

            // Add to history
            addToHistory({
              id: Date.now().toString(),
              fileName: file.name,
              type: fileType,
              status: "completed",
              stats: result.stats,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (response.status === 504) {
          // Suggest chunking
          const weeklyChunks = splitByWeek(rawData, headers);
          setChunks(weeklyChunks);
          setShowChunkDialog(true);
          setSuccess(false);
          setMessage(
            "File is too large to process. Would you like to split it by week?",
          );
        } else {
          setSuccess(false);
          setMessage(result.error || "Import failed");
        }
      }
    } catch (error: any) {
      setSuccess(false);
      setMessage(error.message || "Import failed");
    } finally {
      setImporting(false);
      setCurrentChunk(0);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-white">
            Import GoTeamUp Data
          </h1>
          <p className="text-gray-400 mb-8">
            Upload your CSV exports from GoTeamUp to import payments and
            attendance data
          </p>

          {/* Chunk Dialog */}
          {showChunkDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-start mb-4">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-white">
                      Large File Detected
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Your file contains {totalRows} rows which may take too
                      long to process. We recommend splitting it by week for
                      faster processing.
                    </p>
                  </div>
                </div>

                {chunks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2 text-white">
                      Data will be split into {chunks.length} weekly chunks:
                    </p>
                    <div className="max-h-40 overflow-y-auto bg-gray-700 rounded p-2">
                      {chunks.map((chunk, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm py-1"
                        >
                          <span className="text-gray-300">{chunk.week}</span>
                          <span className="text-gray-400">
                            {chunk.count} rows
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleImport(true)}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 flex items-center justify-center"
                    disabled={importing}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Split by Week
                  </button>
                  <button
                    onClick={() => {
                      setShowChunkDialog(false);
                      handleImport(false);
                    }}
                    className="flex-1 bg-gray-700 text-gray-300 rounded-lg py-2 px-4 hover:bg-gray-600"
                    disabled={importing}
                  >
                    Import Anyway
                  </button>
                </div>

                <button
                  onClick={() => setShowChunkDialog(false)}
                  className="w-full mt-2 text-sm text-gray-400 hover:text-gray-300"
                  disabled={importing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-gray-800"
                : "border-gray-600 hover:border-gray-500 bg-gray-800"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            {isDragActive ? (
              <p className="text-lg text-white">Drop your CSV file here...</p>
            ) : (
              <>
                <p className="text-lg mb-2 text-white">
                  Drag & drop your CSV file here
                </p>
                <p className="text-sm text-gray-400">or click to browse</p>
              </>
            )}
          </div>

          {/* Upload History */}
          {uploadHistory.length > 0 && !file && (
            <div className="mt-8 bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Recent Imports
              </h3>
              <div className="space-y-3">
                {uploadHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium text-white">
                          {item.fileName}
                        </p>
                        <p className="text-sm text-gray-400">
                          {item.type} •{" "}
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {item.status === "processing" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-400" />
                          <span className="text-sm text-blue-400">
                            Processing
                          </span>
                          {item.jobId && (
                            <button
                              onClick={() => {
                                setBackgroundJob({
                                  jobId: item.jobId!,
                                  progress: null,
                                  polling: true,
                                });
                                setImporting(true);
                              }}
                              className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                              Resume
                            </button>
                          )}
                        </>
                      ) : item.status === "completed" ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                          {item.stats && (
                            <span className="text-sm text-gray-400">
                              {item.stats.success}/{item.stats.total} imported
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2 text-red-400" />
                          <span className="text-sm text-red-400">Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="mt-8 bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-400" />
                  <div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB • {totalRows} rows
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mr-2">Type:</label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="payments">Payments</option>
                    <option value="attendance">Attendance</option>
                  </select>
                </div>
              </div>

              {/* Large file warning */}
              {totalRows > CHUNK_SIZE_LIMIT && !showChunkDialog && (
                <div className="mb-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-300">
                      Large file detected
                    </p>
                    <p className="text-yellow-400">
                      This file contains {totalRows} rows. For best results, we
                      recommend splitting by week.
                    </p>
                    <button
                      onClick={() => {
                        const weeklyChunks = splitByWeek(rawData, headers);
                        setChunks(weeklyChunks);
                        setShowChunkDialog(true);
                      }}
                      className="mt-2 text-yellow-300 underline hover:no-underline"
                    >
                      Split by week now →
                    </button>
                  </div>
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-2 text-white">
                    Preview (first 5 rows):
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          {preview[0].map((header, i) => (
                            <th
                              key={i}
                              className="px-4 py-2 text-left font-medium text-gray-300"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(1, 6).map((row, i) => (
                          <tr key={i} className="border-t border-gray-700">
                            {row.map((cell, j) => (
                              <td key={j} className="px-4 py-2 text-gray-400">
                                {cell || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {importing && chunks.length > 1 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">
                      Processing {chunks[currentChunk]?.week}
                    </span>
                    <span className="text-gray-300">
                      {currentChunk + 1} of {chunks.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${((currentChunk + 1) / chunks.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Background Job Progress */}
              {backgroundJob && (
                <div className="mb-4 p-4 bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-400" />
                      <span className="font-medium text-blue-300">
                        {backgroundJob.progress?.currentStep ||
                          "Processing in background..."}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {backgroundJob.progress?.status === "failed" && (
                        <button
                          onClick={() =>
                            resumeBackgroundJob(backgroundJob.jobId)
                          }
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Resume
                        </button>
                      )}
                      <button
                        onClick={() => cancelBackgroundJob(backgroundJob.jobId)}
                        className="text-sm text-gray-400 hover:text-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {backgroundJob.progress && (
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-300">
                          {backgroundJob.progress.processedRecords} of{" "}
                          {backgroundJob.progress.totalRecords} records
                        </span>
                        <span className="text-gray-300">
                          {backgroundJob.progress.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${backgroundJob.progress.progressPercentage}%`,
                          }}
                        />
                      </div>

                      {backgroundJob.progress.estimatedTimeRemaining && (
                        <p className="text-xs text-gray-400">
                          Estimated time remaining:{" "}
                          {Math.round(
                            backgroundJob.progress.estimatedTimeRemaining,
                          )}{" "}
                          minutes
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-400">Success</p>
                          <p className="font-bold text-green-400">
                            {backgroundJob.progress.successfulImports}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Failed</p>
                          <p className="font-bold text-red-400">
                            {backgroundJob.progress.failedImports}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Status</p>
                          <p className="font-bold capitalize text-white">
                            {backgroundJob.progress.status}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={() => handleImport()}
                disabled={importing}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  importing
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {chunks.length > 1
                      ? `Processing ${currentChunk + 1}/${chunks.length}...`
                      : "Importing..."}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Import Data
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {message && !showChunkDialog && (
            <div
              className={`mt-8 p-4 rounded-lg flex items-start ${
                success
                  ? "bg-green-900 bg-opacity-50 text-green-300"
                  : "bg-red-900 bg-opacity-50 text-red-300"
              }`}
            >
              {success ? (
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{message}</p>

                {stats && (
                  <div className="mt-3 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm opacity-75">Total</p>
                      <p className="text-xl font-bold text-white">
                        {stats.total}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Success</p>
                      <p className="text-xl font-bold text-green-400">
                        {stats.success}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Skipped</p>
                      <p className="text-xl font-bold text-yellow-400">
                        {stats.skipped}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-75">Errors</p>
                      <p className="text-xl font-bold text-red-400">
                        {stats.errors}
                      </p>
                    </div>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2">
                      Errors (showing first 10):
                    </p>
                    <div className="bg-gray-800 rounded p-3 text-sm space-y-1">
                      {errors.map((error, i) => (
                        <div key={i} className="flex">
                          <span className="text-gray-400 mr-2">
                            Row {error.row}:
                          </span>
                          <span className="text-red-400">{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 bg-blue-900 bg-opacity-50 rounded-lg p-6">
            <h3 className="font-medium mb-2 flex items-center text-white">
              <AlertCircle className="w-5 h-5 mr-2" />
              Import Requirements
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <strong>File Size:</strong> Files with more than 50 rows will
                automatically use background processing to prevent timeouts.
                Files with more than 200 rows will prompt for weekly splitting.
              </p>
              <p>
                <strong>Background Processing:</strong> Large imports run in the
                background and can be monitored in real-time. You can cancel or
                resume failed imports.
              </p>
              <p>
                <strong>Payments CSV:</strong> Must include columns: Date,
                Customer/Client Name, Email, Amount
              </p>
              <p>
                <strong>Attendance CSV:</strong> Must include columns: Date,
                Time, Customer, Email, Class Type, Venue, Instructors, Status.
                Class sessions will be automatically created.
              </p>
              <p>
                <strong>Client Creation:</strong> Clients with missing email
                addresses will be automatically created if they don't exist.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <DashboardLayout>
      <ImportPageContent />
    </DashboardLayout>
  );
}
