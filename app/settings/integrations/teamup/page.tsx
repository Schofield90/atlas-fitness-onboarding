"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  Save,
} from "lucide-react";

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

interface SchedulePreview {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor?: string;
  location?: string;
  capacity: number;
  sessions: Array<{
    date: string;
    dayName: string;
    startDateTime: string;
    endDateTime: string;
  }>;
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

type ImportStep = "upload" | "review-classes" | "review-schedules" | "complete";

export default function TeamUpImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [importing, setImporting] = useState(false);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [editedClasses, setEditedClasses] = useState<ExtractedClass[]>([]);
  const [schedules, setSchedules] = useState<SchedulePreview[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setCurrentStep("upload");
      setAnalysis(null);
      setEditedClasses([]);
      setSchedules([]);
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

      const uploadResponse = await fetch(
        "/api/classes/import/teamup-pdf/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Failed to upload PDF");
      }

      const uploadData = await uploadResponse.json();

      // 2. Analyze PDF
      const analyzeResponse = await fetch(
        "/api/classes/import/teamup-pdf/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: uploadData.data.base64,
            filename: uploadData.data.filename,
          }),
        },
      );

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || "Failed to analyze PDF");
      }

      const analyzeData = await analyzeResponse.json();
      setAnalysis(analyzeData.data);
      setEditedClasses(analyzeData.data.classes);
      setCurrentStep("review-classes");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmClasses = async () => {
    if (editedClasses.length === 0) return;

    setLoadingSchedules(true);
    setError(null);

    try {
      const response = await fetch("/api/classes/import/teamup-pdf/preview-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classes: editedClasses }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate schedule preview");
      }

      const data = await response.json();
      setSchedules(data.data.schedules);
      setCurrentStep("review-schedules");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleImport = async () => {
    if (editedClasses.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/classes/import/teamup-pdf/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classes: editedClasses }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import classes");
      }

      const data = await response.json();
      setImportResult(data.data);
      setCurrentStep("complete");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleEditClass = (index: number, field: keyof ExtractedClass, value: any) => {
    const updated = [...editedClasses];
    updated[index] = { ...updated[index], [field]: value };
    setEditedClasses(updated);
  };

  const handleDeleteClass = (index: number) => {
    const updated = editedClasses.filter((_, i) => i !== index);
    setEditedClasses(updated);
  };

  const handleAddClass = () => {
    const newClass: ExtractedClass = {
      name: "New Class",
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "10:00",
      capacity: 20,
      recurring: true,
    };
    setEditedClasses([...editedClasses, newClass]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          TeamUp Schedule Import
        </h1>
        <p className="text-gray-400">
          Import your existing TeamUp class schedule by uploading a PDF export.
          Review and edit the extracted classes before importing.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${currentStep === "upload" || currentStep === "review-classes" || currentStep === "review-schedules" || currentStep === "complete" ? "text-blue-500" : "text-gray-500"}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
              1
            </div>
            <span className="text-sm font-medium">Upload & Analyze</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-700 mx-4" />
          <div className={`flex items-center gap-2 ${currentStep === "review-classes" || currentStep === "review-schedules" || currentStep === "complete" ? "text-blue-500" : "text-gray-500"}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="text-sm font-medium">Review Classes</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-700 mx-4" />
          <div className={`flex items-center gap-2 ${currentStep === "review-schedules" || currentStep === "complete" ? "text-blue-500" : "text-gray-500"}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="text-sm font-medium">Review Schedule</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-700 mx-4" />
          <div className={`flex items-center gap-2 ${currentStep === "complete" ? "text-green-500" : "text-gray-500"}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium">
              ✓
            </div>
            <span className="text-sm font-medium">Complete</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {currentStep === "upload" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Upload TeamUp PDF
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

          {file && (
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
      )}

      {/* Step 2: Review & Edit Classes */}
      {currentStep === "review-classes" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-blue-500" />
            Review & Edit Classes
          </h2>

          <p className="text-gray-400 text-sm mb-4">
            Review the extracted classes below. You can edit any details, add new classes, or remove classes before importing.
          </p>

          <div className="max-h-96 overflow-y-auto mb-4">
            <table className="w-full">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Class Name</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Day</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Start</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">End</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Instructor</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Location</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Capacity</th>
                  <th className="text-left text-sm font-medium text-gray-400 p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {editedClasses.map((cls, idx) => (
                  <tr key={idx} className="border-t border-gray-700">
                    <td className="p-2">
                      <input
                        type="text"
                        value={cls.name}
                        onChange={(e) => handleEditClass(idx, "name", e.target.value)}
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={cls.dayOfWeek}
                        onChange={(e) => handleEditClass(idx, "dayOfWeek", e.target.value)}
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                        <option>Saturday</option>
                        <option>Sunday</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="time"
                        value={cls.startTime}
                        onChange={(e) => handleEditClass(idx, "startTime", e.target.value)}
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="time"
                        value={cls.endTime}
                        onChange={(e) => handleEditClass(idx, "endTime", e.target.value)}
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={cls.instructor || ""}
                        onChange={(e) => handleEditClass(idx, "instructor", e.target.value)}
                        placeholder="Optional"
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={cls.location || ""}
                        onChange={(e) => handleEditClass(idx, "location", e.target.value)}
                        placeholder="Optional"
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={cls.capacity}
                        onChange={(e) => handleEditClass(idx, "capacity", parseInt(e.target.value) || 0)}
                        min="1"
                        className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDeleteClass(idx)}
                        className="text-red-500 hover:text-red-400 p-1"
                        title="Delete class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleAddClass}
            className="mb-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Class
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentStep("upload");
                setEditedClasses([]);
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium"
            >
              Back
            </button>
            <button
              onClick={handleConfirmClasses}
              disabled={loadingSchedules || editedClasses.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingSchedules ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Schedule...
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5" />
                  Confirm & Preview Schedule ({editedClasses.length} classes)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review Schedules */}
      {currentStep === "review-schedules" && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Review Schedule (Next 4 Weeks)
          </h2>

          <p className="text-gray-400 text-sm mb-4">
            Review the generated schedule below. This will create {schedules.reduce((sum, s) => sum + s.sessions.length, 0)} class sessions over the next 4 weeks.
          </p>

          <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
            {schedules.map((schedule, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-medium">{schedule.className}</h3>
                    <p className="text-gray-400 text-sm">
                      {schedule.dayOfWeek}s at {schedule.startTime} - {schedule.endTime}
                      {schedule.instructor && ` • ${schedule.instructor}`}
                      {schedule.location && ` • ${schedule.location}`}
                      {` • Capacity: ${schedule.capacity}`}
                    </p>
                  </div>
                  <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded">
                    {schedule.sessions.length} sessions
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {schedule.sessions.map((session, sessionIdx) => (
                    <div key={sessionIdx} className="bg-gray-800 rounded px-3 py-2">
                      <div className="text-white text-sm font-medium">
                        {new Date(session.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(session.startDateTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep("review-classes")}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium"
            >
              Back to Edit Classes
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Importing to Database...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Confirm & Import to Database
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {currentStep === "complete" && importResult && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Import Complete!
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Class Types Created:</span>
              <span className="text-white font-medium">
                {importResult.classTypesCreated}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Schedules Created:</span>
              <span className="text-white font-medium">
                {importResult.schedulesCreated}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Sessions Created (4 weeks):</span>
              <span className="text-white font-medium">
                {importResult.sessionsCreated || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Total Processed:</span>
              <span className="text-white font-medium">
                {importResult.totalProcessed}
              </span>
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

          <Link
            href="/dashboard/class-calendar"
            className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium"
          >
            View Class Calendar
          </Link>
        </div>
      )}
    </div>
  );
}
