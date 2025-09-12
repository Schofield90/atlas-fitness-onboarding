"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Download,
  Info,
  Loader2,
  Users,
  CreditCard,
  Calendar,
  FileText,
} from "lucide-react";
import toast from "@/app/lib/toast";

const supabase = createClient();

export default function MigrationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("goteamup");
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [migrationJob, setMigrationJob] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/signin");
      return;
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setUserData(userProfile);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size must be less than 100MB");
      return;
    }

    setUploadedFile(file);
    setCurrentStep(2);
  };

  const startMigration = async () => {
    if (!uploadedFile || !userData) return;

    setUploading(true);
    try {
      // Create migration job
      const { data: job, error: jobError } = await supabase
        .from("migration_jobs")
        .insert({
          organization_id: userData.organization_id,
          source_system: "goteamup",
          status: "uploading",
          created_by: userData.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;
      setMigrationJob(job);

      // Upload file to Supabase Storage
      const fileName = `${job.id}/${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("migrations")
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Save file metadata
      const { error: fileError } = await supabase
        .from("migration_files")
        .insert({
          migration_job_id: job.id,
          organization_id: userData.organization_id,
          file_name: uploadedFile.name,
          file_size: uploadedFile.size,
          file_type: uploadedFile.type,
          storage_path: fileName,
        });

      if (fileError) throw fileError;

      // Start AI analysis
      await analyzeWithAI(job.id);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setUploading(false);
    }
  };

  const analyzeWithAI = async (jobId: string) => {
    setAnalyzing(true);
    setCurrentStep(3);

    try {
      const response = await fetch("/api/migrations/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const result = await response.json();
      setFieldMappings(result.mappings);
      setCurrentStep(4);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze file");
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmAndProcess = async () => {
    if (!migrationJob) return;

    try {
      const response = await fetch("/api/migrations/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: migrationJob.id,
          mappings: fieldMappings,
        }),
      });

      if (!response.ok) throw new Error("Processing failed");

      toast.success(
        "Migration started! You'll receive a notification when complete.",
      );
      router.push("/settings/migrations/status");
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Failed to start migration");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Migrations</h1>
          <p className="text-gray-400">
            Import your existing data from other gym management systems
          </p>
        </div>

        {/* Migration Systems Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("goteamup")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "goteamup"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              GoTeamUp
            </button>
            <button
              className="py-2 px-1 border-b-2 border-transparent text-gray-500 cursor-not-allowed"
              disabled
            >
              MindBody (Coming Soon)
            </button>
            <button
              className="py-2 px-1 border-b-2 border-transparent text-gray-500 cursor-not-allowed"
              disabled
            >
              Glofox (Coming Soon)
            </button>
          </nav>
        </div>

        {/* GoTeamUp Migration Content */}
        {activeTab === "goteamup" && (
          <div className="space-y-8">
            {/* Instructions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                How to Export Data from GoTeamUp
              </h2>
              <ol className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-blue-500 font-semibold">1.</span>
                  <div>
                    <p className="font-medium">Export Members Data</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Go to Reports → Members → Export to CSV. Include all
                      fields including custom fields, emergency contacts, and
                      medical info.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-semibold">2.</span>
                  <div>
                    <p className="font-medium">Export Payments History</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Go to Reports → Payments → Export All. This includes
                      transaction history, payment methods, and subscription
                      details.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-semibold">3.</span>
                  <div>
                    <p className="font-medium">Export Class Attendance</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Go to Reports → Attendance → Export by Date Range. Select
                      the maximum date range available.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-500 font-semibold">4.</span>
                  <div>
                    <p className="font-medium">Combine Files (Optional)</p>
                    <p className="text-sm text-gray-400 mt-1">
                      You can upload multiple files or combine them into one
                      Excel file with different sheets for each data type.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>Pro Tip:</strong> Our AI will automatically detect and
                  map fields from your GoTeamUp export, handling variations in
                  column names and data formats.
                </p>
              </div>
            </div>

            {/* Migration Wizard */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Migration Wizard</h2>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[
                  { num: 1, label: "Upload Files" },
                  { num: 2, label: "AI Analysis" },
                  { num: 3, label: "Review Mappings" },
                  { num: 4, label: "Import Data" },
                ].map((step, index) => (
                  <div key={step.num} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        currentStep >= step.num
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {currentStep > step.num ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{step.label}</p>
                    </div>
                    {index < 3 && (
                      <ArrowRight className="h-5 w-5 text-gray-600 mx-4" />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <label className="cursor-pointer">
                      <span className="text-blue-500 hover:text-blue-400 font-medium">
                        Click to upload
                      </span>
                      <span className="text-gray-400"> or drag and drop</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      CSV, Excel files up to 100MB
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && uploadedFile && (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{uploadedFile.name}</p>
                          <p className="text-sm text-gray-400">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  </div>

                  <button
                    onClick={startMigration}
                    disabled={uploading}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Start AI Analysis
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {currentStep === 3 && analyzing && (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    AI Analyzing Your Data
                  </h3>
                  <p className="text-gray-400">
                    Our AI is detecting fields, data types, and creating optimal
                    mappings...
                  </p>
                </div>
              )}

              {currentStep === 4 && fieldMappings.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium mb-3">AI-Detected Mappings</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {fieldMappings.slice(0, 5).map((mapping, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-300">
                            {mapping.source_field}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-500" />
                          <span className="text-blue-400">
                            {mapping.target_field}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(mapping.ai_confidence * 100).toFixed(0)}%
                            confidence
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-gray-400">Clients</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <CreditCard className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-gray-400">Payments</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-gray-400">Bookings</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <FileText className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-gray-400">Forms</p>
                    </div>
                  </div>

                  <button
                    onClick={confirmAndProcess}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    Start Import
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Sample Data Download */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Need Help?</h3>
              <div className="flex items-center justify-between">
                <p className="text-gray-400">
                  Download our sample GoTeamUp template to see the expected
                  format
                </p>
                <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
