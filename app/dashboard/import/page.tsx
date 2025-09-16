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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFile(file);
    setStats(null);
    setErrors([]);
    setMessage("");
    setSuccess(null);

    // Read and preview first 5 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const previewData = lines
        .slice(0, 6)
        .map((line) =>
          line.split(",").map((cell) => cell.trim().replace(/"/g, "")),
        );
      setPreview(previewData);

      // Auto-detect file type
      if (previewData.length > 0) {
        const headers = previewData[0].map((h) => h.toLowerCase());
        if (
          headers.some((h) => h.includes("amount") || h.includes("payment"))
        ) {
          setFileType("payments");
        } else if (
          headers.some((h) => h.includes("class") || h.includes("time"))
        ) {
          setFileType("attendance");
        } else {
          setFileType("auto");
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

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setMessage("");
    setErrors([]);

    try {
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
          setErrors(result.errors.slice(0, 10)); // Show first 10 errors
        }
      } else {
        setSuccess(false);
        setMessage(result.error || "Import failed");
      }
    } catch (error: any) {
      setSuccess(false);
      setMessage(error.message || "Import failed");
    } finally {
      setImporting(false);
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
                    {(file.size / 1024).toFixed(2)} KB
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

            {/* Import Button */}
            <button
              onClick={handleImport}
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
                  Importing...
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
        {message && (
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
              <strong>Payments CSV:</strong> Must include columns: Date, Client
              Name, Email, Amount, Payment Method, Description, Status
            </p>
            <p>
              <strong>Attendance CSV:</strong> Must include columns: Date, Time,
              Client Name, Email, Class Name, Instructor, Status
            </p>
            <p>
              <strong>Important:</strong> Clients must already exist in the
              system with matching email addresses
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
