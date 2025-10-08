"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Calendar } from "lucide-react";

interface ExtractedClass {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  recurring: boolean;
}

interface AnalysisResult {
  classes: ExtractedClass[];
  summary: {
    totalClasses: number;
    uniqueClassTypes: number;
    locations: string[];
    instructors: string[];
    weekCoverage: string;
  };
}

export default function TeamUpImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setAnalysis(null);
      setImportResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    try {
      // 1. Upload PDF
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/classes/import/teamup-pdf/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload PDF");
      }

      const uploadData = await uploadResponse.json();

      // 2. Analyze PDF
      const analyzeResponse = await fetch("/api/classes/import/teamup-pdf/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: uploadData.data.base64,
          filename: uploadData.data.filename,
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || "Failed to analyze PDF");
      }

      const analyzeData = await analyzeResponse.json();
      setAnalysis(analyzeData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!analysis) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/classes/import/teamup-pdf/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classes: analysis.classes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import classes");
      }

      const data = await response.json();
      setImportResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">TeamUp Schedule Import</h1>
        <p className="text-gray-400">
          Import your existing TeamUp class schedule by uploading a PDF export. Our AI will extract all
          classes and create them in your system.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-500" />
          Step 1: Upload TeamUp PDF
        </h2>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
          <input
            type="file"
            id="pdf-upload"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <FileText className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-white font-medium">
                {file ? file.name : "Choose a PDF file"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Maximum file size: 10MB
              </p>
            </div>
          </label>
        </div>

        {file && !analysis && !importResult && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing PDF with AI...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Analyze Schedule
              </>
            )}
          </button>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && !importResult && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Step 2: Review Extracted Classes
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{analysis.summary.totalClasses}</div>
              <div className="text-sm text-gray-400">Total Classes</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{analysis.summary.uniqueClassTypes}</div>
              <div className="text-sm text-gray-400">Class Types</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{analysis.summary.locations?.length || 0}</div>
              <div className="text-sm text-gray-400">Locations</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{analysis.summary.instructors?.length || 0}</div>
              <div className="text-sm text-gray-400">Instructors</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto mb-6">
            <table className="w-full">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Class</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Day</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Time</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Instructor</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Location</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Capacity</th>
                </tr>
              </thead>
              <tbody>
                {analysis.classes.map((cls, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="text-sm text-white p-3">{cls.name}</td>
                    <td className="text-sm text-gray-300 p-3">{cls.dayOfWeek}</td>
                    <td className="text-sm text-gray-300 p-3">
                      {cls.startTime} - {cls.endTime}
                    </td>
                    <td className="text-sm text-gray-300 p-3">{cls.instructor || "-"}</td>
                    <td className="text-sm text-gray-300 p-3">{cls.location || "-"}</td>
                    <td className="text-sm text-gray-300 p-3">{cls.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Importing Classes...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5" />
                Import {analysis.classes.length} Classes
              </>
            )}
          </button>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Import Complete!
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Class Types Created:</span>
              <span className="text-white font-medium">{importResult.classTypesCreated}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Schedules Created:</span>
              <span className="text-white font-medium">{importResult.schedulesCreated}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Total Processed:</span>
              <span className="text-white font-medium">{importResult.totalProcessed}</span>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
              <p className="text-yellow-500 font-medium mb-2">Warnings:</p>
              <ul className="text-sm text-yellow-300 space-y-1">
                {importResult.errors.map((err: string, idx: number) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/classes"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-center"
            >
              View Classes
            </a>
            <button
              onClick={() => {
                setFile(null);
                setAnalysis(null);
                setImportResult(null);
                setError(null);
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Import Another
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-medium">Error</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
