"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import {
  CheckCircle2,
  Circle,
  Upload,
  Users,
  Calendar,
  CreditCard,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import toast from "@/app/lib/toast";

const supabase = createClient();

interface StepStatus {
  clients: "not_started" | "in_progress" | "completed" | "error";
  attendance: "not_started" | "in_progress" | "completed" | "error";
  payments: "not_started" | "in_progress" | "completed" | "error";
}

interface ImportCounts {
  clients: number;
  attendance: number;
  payments: number;
}

export default function SimpleMigrationPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    clients: "not_started",
    attendance: "not_started",
    payments: "not_started",
  });
  const [importCounts, setImportCounts] = useState<ImportCounts>({
    clients: 0,
    attendance: 0,
    payments: 0,
  });
  const [organizationId, setOrganizationId] = useState<string>("");
  const [migrationJobId, setMigrationJobId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  useEffect(() => {
    checkExistingData();
  }, []);

  const checkExistingData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get organization
      const { data: userOrg } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const orgId =
        userOrg?.organization_id || "63589490-8f55-4157-bd3a-e141594b748e";
      setOrganizationId(orgId);

      // Check existing counts
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const { count: bookingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const { count: paymentCount } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      // Update counts and status
      const counts = {
        clients: clientCount || 0,
        attendance: bookingCount || 0,
        payments: paymentCount || 0,
      };

      setImportCounts(counts);

      // Set status based on existing data
      const newStatus: StepStatus = {
        clients: counts.clients > 0 ? "completed" : "not_started",
        attendance: counts.attendance > 0 ? "completed" : "not_started",
        payments: counts.payments > 0 ? "completed" : "not_started",
      };

      setStepStatus(newStatus);

      // Set current step to the first incomplete one
      if (newStatus.clients !== "completed") {
        setCurrentStep(1);
      } else if (newStatus.attendance !== "completed") {
        setCurrentStep(2);
      } else if (newStatus.payments !== "completed") {
        setCurrentStep(3);
      }

      // Get or create migration job
      const { data: existingJob } = await supabase
        .from("migration_jobs")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingJob) {
        setMigrationJobId(existingJob.id);
      } else {
        // Create new job
        const { data: newJob } = await supabase
          .from("migration_jobs")
          .insert({
            organization_id: orgId,
            source_system: "csv_import",
            status: "in_progress",
            total_records: 0,
            processed_records: 0,
          })
          .select()
          .single();

        if (newJob) {
          setMigrationJobId(newJob.id);
        }
      }
    } catch (error) {
      console.error("Error checking existing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    step: "clients" | "attendance" | "payments",
    file: File,
  ) => {
    console.log("handleFileUpload called:", {
      step,
      file: file?.name,
      organizationId,
    });

    if (!file || !organizationId) {
      console.error("Missing file or organizationId:", {
        file: !!file,
        organizationId,
      });
      toast.error("Missing required data for upload");
      return;
    }

    // Update status to in_progress
    setStepStatus((prev) => ({ ...prev, [step]: "in_progress" }));

    try {
      // Ensure we have a migration job ID
      let jobId = migrationJobId;
      if (!jobId) {
        const { data: newJob, error: jobError } = await supabase
          .from("migration_jobs")
          .insert({
            organization_id: organizationId,
            source_system: "csv_import",
            status: "in_progress",
            total_records: 0,
            processed_records: 0,
          })
          .select()
          .single();

        if (jobError || !newJob) {
          throw new Error("Failed to create migration job");
        }
        jobId = newJob.id;
        setMigrationJobId(jobId);
      }

      // Upload file to storage
      const fileName = `${jobId}/${step}_${Date.now()}.csv`;
      console.log("Uploading file:", fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("migrations")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully:", uploadData);

      // For attendance, use batch processing if file is large
      if (step === "attendance") {
        setIsProcessing(true);
        setUploadProgress(0);

        let offset = 0;
        let hasMore = true;
        let totalImported = 0;

        while (hasMore) {
          const response = await fetch(
            `/api/migration/simple/attendance-batch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organizationId,
                migrationJobId: jobId,
                fileName,
                offset,
              }),
            },
          );

          const result = await response.json();

          if (!result.success) {
            // Handle fail-safe error
            setIsProcessing(false);
            setUploadProgress(0);
            setStepStatus((prev) => ({ ...prev, attendance: "error" }));

            toast.error(result.error || "Import failed");
            if (result.message) {
              toast.error(result.message);
            }

            // Show detailed error in console
            console.error("Import stopped:", result);

            return; // Exit the import loop
          }

          totalImported += result.imported;
          hasMore = result.hasMore;
          offset = result.nextOffset || 0;
          setUploadProgress(result.progress);

          // Update UI with progress
          if (hasMore) {
            toast.info(
              `Processing: ${result.progress}% complete (${totalImported} imported so far)`,
            );
          }
        }

        setIsProcessing(false);
        setUploadProgress(100);

        // Final result
        const result = { success: true, imported: totalImported };

        // Update counts and status
        setImportCounts((prev) => ({
          ...prev,
          attendance: prev.attendance + totalImported,
        }));

        setStepStatus((prev) => ({ ...prev, attendance: "completed" }));
        toast.success(
          `Attendance import complete! ${totalImported} records imported`,
        );

        // Refresh the actual counts from database
        const { count: newAttendanceCount } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

        if (newAttendanceCount) {
          setImportCounts((prev) => ({
            ...prev,
            attendance: newAttendanceCount,
          }));
        }

        // Auto-advance to next step
        if (currentStep === 2) {
          setCurrentStep(3);
          setIsProcessing(false); // Reset processing state
          setUploadProgress(0); // Reset progress
        }

        return; // Exit early for attendance
      }

      // For other steps, use regular processing
      const response = await fetch(`/api/migration/simple/${step}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          migrationJobId: jobId,
          fileName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update counts and status
        setImportCounts((prev) => ({
          ...prev,
          [step]: prev[step] + result.imported,
        }));

        // Only mark as completed if it's not attendance, or if attendance has significant data
        if (step !== "attendance" || result.imported > 0) {
          setStepStatus((prev) => ({ ...prev, [step]: "completed" }));
        }

        toast.success(
          `${step === "clients" ? "Clients" : step === "attendance" ? "Attendance" : "Payments"} imported successfully!`,
        );

        // Auto-advance to next step
        if (step === "clients" && currentStep === 1) {
          setCurrentStep(2);
        } else if (step === "attendance" && currentStep === 2) {
          setCurrentStep(3);
        }
      } else {
        throw new Error(result.error || "Import failed");
      }
    } catch (error: any) {
      console.error(`Error importing ${step}:`, error);
      setStepStatus((prev) => ({ ...prev, [step]: "error" }));
      setIsProcessing(false); // Reset processing state on error
      setUploadProgress(0); // Reset progress on error
      toast.error(`Failed to import ${step}: ${error.message}`);
    }
  };

  const getStepIcon = (
    step: "clients" | "attendance" | "payments",
    status: string,
  ) => {
    if (status === "completed") {
      return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    } else if (status === "in_progress") {
      return <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />;
    } else if (status === "error") {
      return <AlertCircle className="h-8 w-8 text-red-500" />;
    } else {
      return <Circle className="h-8 w-8 text-gray-500" />;
    }
  };

  const handleDragOver = (e: React.DragEvent, step: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(step);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);
  };

  const handleDrop = (
    e: React.DragEvent,
    step: "clients" | "attendance" | "payments",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);

    console.log("Files dropped:", e.dataTransfer.files.length);
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find((file) => {
      console.log("File:", file.name, "Type:", file.type);
      return (
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".csv")
      );
    });

    if (csvFile) {
      console.log("CSV file found, uploading:", csvFile.name);
      handleFileUpload(step, csvFile);
    } else {
      console.error("No CSV file found in dropped files");
      toast.error("Please drop a CSV file");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Migration</h1>
          <p className="text-gray-400">Import your data in 3 simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {/* Step 1: Clients */}
            <div className="flex flex-col items-center flex-1">
              {getStepIcon("clients", stepStatus.clients)}
              <div className="mt-2 text-center">
                <p className="font-semibold">Step 1: Clients</p>
                <p className="text-sm text-gray-400">
                  {stepStatus.clients === "completed"
                    ? `✓ ${importCounts.clients} imported`
                    : "Upload client data"}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            <div
              className={`h-1 flex-1 mx-4 ${
                stepStatus.clients === "completed"
                  ? "bg-green-500"
                  : "bg-gray-700"
              }`}
            />

            {/* Step 2: Attendance */}
            <div className="flex flex-col items-center flex-1">
              {getStepIcon("attendance", stepStatus.attendance)}
              <div className="mt-2 text-center">
                <p className="font-semibold">Step 2: Attendance</p>
                <p className="text-sm text-gray-400">
                  {stepStatus.attendance === "completed"
                    ? `✓ ${importCounts.attendance} imported`
                    : "Upload attendance data"}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            <div
              className={`h-1 flex-1 mx-4 ${
                stepStatus.attendance === "completed"
                  ? "bg-green-500"
                  : "bg-gray-700"
              }`}
            />

            {/* Step 3: Payments */}
            <div className="flex flex-col items-center flex-1">
              {getStepIcon("payments", stepStatus.payments)}
              <div className="mt-2 text-center">
                <p className="font-semibold">Step 3: Payments</p>
                <p className="text-sm text-gray-400">
                  {stepStatus.payments === "completed"
                    ? `✓ ${importCounts.payments} imported`
                    : "Upload payment data"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {/* Step 1: Clients */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-8 w-8 text-blue-500" />
                <h2 className="text-2xl font-semibold">Import Clients</h2>
              </div>

              {stepStatus.clients === "completed" ? (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-400">
                        Clients Already Imported!
                      </p>
                      <p className="text-sm text-gray-300">
                        You have {importCounts.clients} clients in the system
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    Continue to Attendance
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Required CSV Format:</h3>
                    <div className="bg-gray-700 rounded p-4 font-mono text-sm">
                      <p>First Name, Last Name, Email, Phone</p>
                      <p className="text-gray-400 mt-1">
                        John, Doe, john@example.com, 555-1234
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging === "clients"
                        ? "border-blue-500 bg-blue-900/20"
                        : "border-gray-600"
                    }`}
                    onDragOver={(e) => handleDragOver(e, "clients")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "clients")}
                  >
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="mb-4">
                      Drop your client CSV file here or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        console.log(
                          "Client file input changed:",
                          e.target.files,
                        );
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log("Client file selected:", file.name);
                          handleFileUpload("clients", file);
                        } else {
                          console.log("No file selected");
                        }
                      }}
                      className="hidden"
                      id="client-upload"
                    />
                    <label
                      htmlFor="client-upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block"
                    >
                      <Upload className="inline h-4 w-4 mr-2" />
                      Select CSV File
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Attendance */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="h-8 w-8 text-green-500" />
                <h2 className="text-2xl font-semibold">Import Attendance</h2>
              </div>

              {stepStatus.attendance === "completed" ? (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-400">
                        {importCounts.attendance < 100
                          ? "Partial Attendance Data Found"
                          : "Attendance Already Imported!"}
                      </p>
                      <p className="text-sm text-gray-300">
                        You have {importCounts.attendance} attendance records
                      </p>
                      {importCounts.attendance < 100 && (
                        <p className="text-xs text-yellow-400 mt-1">
                          This seems low - you may want to import more
                          attendance data
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setStepStatus((prev) => ({
                          ...prev,
                          attendance: "not_started",
                        }));
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import More Attendance
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                      Skip to Payments
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 mb-6">
                    <p className="text-sm">
                      <strong>Note:</strong> We'll automatically match
                      attendance records to your imported clients using their
                      name or email.
                    </p>
                    {uploadProgress === 0 && (
                      <button
                        onClick={async () => {
                          const input = document.getElementById(
                            "attendance-upload",
                          ) as HTMLInputElement;
                          const file = input?.files?.[0];
                          if (file) {
                            console.log("Running debug analysis...");
                            // Upload file temporarily for analysis
                            const debugFileName = `debug/${Date.now()}.csv`;
                            const { error: uploadError } =
                              await supabase.storage
                                .from("migrations")
                                .upload(debugFileName, file);

                            if (!uploadError) {
                              const response = await fetch(
                                "/api/migration/simple/debug-attendance",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    organizationId,
                                    fileName: debugFileName,
                                  }),
                                },
                              );

                              const result = await response.json();
                              console.log("Debug Analysis Results:", result);

                              if (result.success) {
                                alert(
                                  `Match Analysis:\n\n${result.summary.matchRate} of rows match existing clients.\n\nCheck console for detailed analysis.`,
                                );
                              }

                              // Clean up debug file
                              await supabase.storage
                                .from("migrations")
                                .remove([debugFileName]);
                            }
                          } else {
                            alert("Please select a file first");
                          }
                        }}
                        className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Debug: Analyze Why Matches Are Failing
                      </button>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Required CSV Format:</h3>
                    <div className="bg-gray-700 rounded p-4 font-mono text-sm">
                      <p>Client Name/Email, Date, Class Type</p>
                      <p className="text-gray-400 mt-1">
                        John Doe, 2024-01-15, Yoga Class
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging === "attendance"
                        ? "border-green-500 bg-green-900/20"
                        : "border-gray-600"
                    }`}
                    onDragOver={(e) =>
                      !isProcessing && handleDragOver(e, "attendance")
                    }
                    onDragLeave={!isProcessing ? handleDragLeave : undefined}
                    onDrop={(e) => !isProcessing && handleDrop(e, "attendance")}
                  >
                    {isProcessing ? (
                      <div className="space-y-4">
                        <RefreshCw className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
                        <p className="font-semibold">
                          Processing Large File...
                        </p>
                        <div className="max-w-md mx-auto">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                              className="bg-blue-500 h-3 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Processing in batches to handle large dataset...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="mb-4">
                          Drop your attendance CSV file here or click to browse
                        </p>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            console.log(
                              "Attendance file input changed:",
                              e.target.files,
                            );
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log(
                                "Attendance file selected:",
                                file.name,
                              );
                              handleFileUpload("attendance", file);
                            } else {
                              console.log("No file selected");
                            }
                          }}
                          className="hidden"
                          id="attendance-upload"
                          disabled={isProcessing}
                        />
                        <label
                          htmlFor="attendance-upload"
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer inline-block"
                        >
                          <Upload className="inline h-4 w-4 mr-2" />
                          Select CSV File
                        </label>
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={async () => {
                              const input = document.getElementById(
                                "attendance-upload",
                              ) as HTMLInputElement;
                              const file = input?.files?.[0];
                              if (file) {
                                // Upload file for preview
                                const previewFileName = `preview/${Date.now()}.csv`;
                                const { error: uploadError } =
                                  await supabase.storage
                                    .from("migrations")
                                    .upload(previewFileName, file);

                                if (!uploadError) {
                                  const response = await fetch(
                                    "/api/migration/simple/preview-csv",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        organizationId,
                                        fileName: previewFileName,
                                      }),
                                    },
                                  );

                                  const result = await response.json();
                                  if (result.success) {
                                    console.log("CSV Preview:", result);

                                    // Show column selection dialog
                                    const nameCol = prompt(
                                      `Which column contains client names?\nAvailable columns: ${result.headers.join(", ")}\n\nSuggested: ${result.suggestion.nameColumn}`,
                                      result.suggestion.nameColumn,
                                    );

                                    const dateCol = prompt(
                                      `Which column contains dates?\nAvailable columns: ${result.headers.join(", ")}\n\nSuggested: ${result.suggestion.dateColumn}`,
                                      result.suggestion.dateColumn,
                                    );

                                    if (nameCol && dateCol) {
                                      // Run custom import with selected columns
                                      const importResponse = await fetch(
                                        "/api/migration/simple/attendance-custom",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            organizationId,
                                            fileName: previewFileName,
                                            nameColumn: nameCol,
                                            emailColumn:
                                              result.suggestion.emailColumn,
                                            dateColumn: dateCol,
                                          }),
                                        },
                                      );

                                      const importResult =
                                        await importResponse.json();
                                      console.log(
                                        "Import result:",
                                        importResult,
                                      );

                                      if (
                                        importResult.success &&
                                        importResult.imported > 0
                                      ) {
                                        toast.success(
                                          `Imported ${importResult.imported} attendance records!`,
                                        );
                                        checkExistingData(); // Refresh counts
                                      } else {
                                        toast.error(
                                          importResult.message ||
                                            "No records could be matched",
                                        );
                                        console.log(
                                          "Unmatched samples:",
                                          importResult.unmatchedSamples,
                                        );
                                      }
                                    }
                                  }

                                  // Clean up preview file
                                  await supabase.storage
                                    .from("migrations")
                                    .remove([previewFileName]);
                                }
                              }
                            }}
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                          >
                            Custom Import with Column Selection
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Payments */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="h-8 w-8 text-purple-500" />
                <h2 className="text-2xl font-semibold">Import Payments</h2>
              </div>

              {stepStatus.payments === "completed" ? (
                <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-400">
                        All Data Imported Successfully!
                      </p>
                      <p className="text-sm text-gray-300">
                        {importCounts.clients} clients,{" "}
                        {importCounts.attendance} attendance records,{" "}
                        {importCounts.payments} payments
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Link
                      href="/leads"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      View Clients
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={checkExistingData}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                    >
                      <RefreshCw className="inline h-4 w-4 mr-2" />
                      Refresh Status
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4 mb-6">
                    <p className="text-sm">
                      <strong>Optional:</strong> You can skip this step if you
                      don't have payment history to import.
                    </p>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold mb-2">Required CSV Format:</h3>
                    <div className="bg-gray-700 rounded p-4 font-mono text-sm">
                      <p>Client Name/Email, Amount, Date, Payment Method</p>
                      <p className="text-gray-400 mt-1">
                        John Doe, 99.99, 2024-01-15, Card
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging === "payments"
                        ? "border-purple-500 bg-purple-900/20"
                        : "border-gray-600"
                    }`}
                    onDragOver={(e) => handleDragOver(e, "payments")}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, "payments")}
                  >
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <p className="mb-4">
                      Drop your payment CSV file here or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        console.log(
                          "Payment file input changed:",
                          e.target.files,
                        );
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log("Payment file selected:", file.name);
                          handleFileUpload("payments", file);
                        } else {
                          console.log("No file selected");
                        }
                      }}
                      className="hidden"
                      id="payment-upload"
                    />
                    <label
                      htmlFor="payment-upload"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer inline-block"
                    >
                      <Upload className="inline h-4 w-4 mr-2" />
                      Select CSV File
                    </label>
                  </div>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        setStepStatus((prev) => ({
                          ...prev,
                          payments: "completed",
                        }));
                        toast.info("Skipped payment import");
                      }}
                      className="text-gray-400 hover:text-white underline"
                    >
                      Skip this step
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() =>
              setCurrentStep(Math.max(1, currentStep - 1) as 1 | 2 | 3)
            }
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              currentStep === 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            ← Previous Step
          </button>

          <button
            onClick={() =>
              setCurrentStep(Math.min(3, currentStep + 1) as 1 | 2 | 3)
            }
            disabled={currentStep === 3}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              currentStep === 3
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
