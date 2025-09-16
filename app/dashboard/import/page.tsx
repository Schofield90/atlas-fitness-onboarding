"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

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

interface MonthlyChunk {
  month: string;
  year: number;
  rows: string[][];
  count: number;
}

export default function ImportPage() {
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
  const [chunks, setChunks] = useState<MonthlyChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);

  const CHUNK_SIZE_LIMIT = 500; // Rows per chunk for safety

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

  const splitByMonth = (
    data: string[][],
    headers: string[],
  ): MonthlyChunk[] => {
    const dateIndex = headers.findIndex((h) =>
      h.toLowerCase().includes("date"),
    );

    if (dateIndex === -1) {
      // If no date column, split by fixed size
      const chunks: MonthlyChunk[] = [];
      for (let i = 0; i < data.length; i += CHUNK_SIZE_LIMIT) {
        chunks.push({
          month: `Batch ${chunks.length + 1}`,
          year: 0,
          rows: data.slice(i, Math.min(i + CHUNK_SIZE_LIMIT, data.length)),
          count: Math.min(CHUNK_SIZE_LIMIT, data.length - i),
        });
      }
      return chunks;
    }

    // Group by month/year
    const monthGroups = new Map<string, string[][]>();

    for (const row of data) {
      const dateStr = row[dateIndex];
      if (!dateStr) continue;

      // Parse date (handle DD/MM/YYYY and YYYY-MM-DD formats)
      let month: number, year: number;

      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
        } else continue;
      } else if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
        } else continue;
      } else {
        continue;
      }

      const key = `${year}-${month.toString().padStart(2, "0")}`;
      if (!monthGroups.has(key)) {
        monthGroups.set(key, []);
      }
      monthGroups.get(key)!.push(row);
    }

    // Convert to chunks
    const chunks: MonthlyChunk[] = [];
    const sortedKeys = Array.from(monthGroups.keys()).sort();

    for (const key of sortedKeys) {
      const [year, month] = key.split("-").map(Number);
      const monthName = new Date(year, month - 1).toLocaleString("default", {
        month: "long",
      });

      chunks.push({
        month: monthName,
        year: year,
        rows: monthGroups.get(key)!,
        count: monthGroups.get(key)!.length,
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
          const monthlyChunks = splitByMonth(data, headers);
          setChunks(monthlyChunks);
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
            `Processing ${chunks[i].month} ${chunks[i].year} (${i + 1}/${chunks.length})...`,
          );

          // Create CSV content for this chunk
          const chunkContent = [
            headers.join(","),
            ...chunks[i].rows.map((row) => row.join(",")),
          ].join("\n");

          const chunkFile = new File(
            [chunkContent],
            `${file.name}-${chunks[i].month}-${chunks[i].year}.csv`,
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
              `Chunk for ${chunks[i].month} ${chunks[i].year} is still too large. Please try a smaller date range.`,
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
          `Import completed successfully for all ${chunks.length} months`,
        );
        if (allErrors.length > 0) {
          setErrors(allErrors.slice(0, 10)); // Show first 10 errors
        }
      } else {
        // Single import (original logic)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", fileType);

        const response = await fetch("/api/import/goteamup", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess(true);
          setStats(result.stats);
          setMessage(result.message || "Import completed successfully");
          if (result.errors && result.errors.length > 0) {
            setErrors(result.errors.slice(0, 10));
          }
        } else if (response.status === 504) {
          // Suggest chunking
          const monthlyChunks = splitByMonth(rawData, headers);
          setChunks(monthlyChunks);
          setShowChunkDialog(true);
          setSuccess(false);
          setMessage(
            "File is too large to process. Would you like to split it by month?",
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Import GoTeamUp Data</h1>
        <p className="text-gray-600 mb-8">
          Upload your CSV exports from GoTeamUp to import payments and
          attendance data
        </p>

        {/* Chunk Dialog */}
        {showChunkDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-start mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Large File Detected
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Your file contains {totalRows} rows which may take too long
                    to process. We recommend splitting it by month for faster
                    processing.
                  </p>
                </div>
              </div>

              {chunks.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">
                    Data will be split into {chunks.length} chunks:
                  </p>
                  <div className="max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                    {chunks.map((chunk, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm py-1"
                      >
                        <span>
                          {chunk.month} {chunk.year}
                        </span>
                        <span className="text-gray-500">
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
                  Split by Month
                </button>
                <button
                  onClick={() => {
                    setShowChunkDialog(false);
                    handleImport(false);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 px-4 hover:bg-gray-300"
                  disabled={importing}
                >
                  Import Anyway
                </button>
              </div>

              <button
                onClick={() => setShowChunkDialog(false)}
                className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700"
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
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg">Drop your CSV file here...</p>
          ) : (
            <>
              <p className="text-lg mb-2">Drag & drop your CSV file here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </>
          )}
        </div>

        {/* File Info */}
        {file && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB • {totalRows} rows
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mr-2">Type:</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="payments">Payments</option>
                  <option value="attendance">Attendance</option>
                </select>
              </div>
            </div>

            {/* Large file warning */}
            {totalRows > CHUNK_SIZE_LIMIT && !showChunkDialog && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    Large file detected
                  </p>
                  <p className="text-yellow-700">
                    This file contains {totalRows} rows. For best results, we
                    recommend splitting by month.
                  </p>
                  <button
                    onClick={() => {
                      const monthlyChunks = splitByMonth(rawData, headers);
                      setChunks(monthlyChunks);
                      setShowChunkDialog(true);
                    }}
                    className="mt-2 text-yellow-800 underline hover:no-underline"
                  >
                    Split by month now →
                  </button>
                </div>
              </div>
            )}

            {/* Preview */}
            {preview.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Preview (first 5 rows):</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview[0].map((header, i) => (
                          <th
                            key={i}
                            className="px-4 py-2 text-left font-medium text-gray-700"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1, 6).map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-2 text-gray-600">
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
                  <span>
                    Processing {chunks[currentChunk]?.month}{" "}
                    {chunks[currentChunk]?.year}
                  </span>
                  <span>
                    {currentChunk + 1} of {chunks.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${((currentChunk + 1) / chunks.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={() => handleImport()}
              disabled={importing}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                importing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
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
              success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
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
                    <p className="text-xl font-bold">{stats.total}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Success</p>
                    <p className="text-xl font-bold text-green-600">
                      {stats.success}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Skipped</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {stats.skipped}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-75">Errors</p>
                    <p className="text-xl font-bold text-red-600">
                      {stats.errors}
                    </p>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Errors (showing first 10):</p>
                  <div className="bg-white rounded p-3 text-sm space-y-1">
                    {errors.map((error, i) => (
                      <div key={i} className="flex">
                        <span className="text-gray-500 mr-2">
                          Row {error.row}:
                        </span>
                        <span className="text-red-600">{error.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-medium mb-2 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Import Requirements
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>File Size:</strong> Files with more than 500 rows will
              automatically prompt for monthly splitting
            </p>
            <p>
              <strong>Payments CSV:</strong> Must include columns: Date,
              Customer/Client Name, Email, Amount
            </p>
            <p>
              <strong>Attendance CSV:</strong> Must include columns: Date, Time,
              Customer, Email, Class Type, Venue, Instructors, Status
            </p>
            <p>
              <strong>Important:</strong> Customers must already exist in the
              system with matching email addresses
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
