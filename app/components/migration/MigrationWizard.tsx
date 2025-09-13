"use client";

import React, { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Database,
  Brain,
  Settings,
  Play,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/Badge";

interface MigrationWizardProps {
  organizationId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface FileUpload {
  file: File;
  preview: string[];
  analysis?: any;
}

interface FieldMapping {
  sourceField: string;
  targetTable: string;
  targetField: string;
  confidence: number;
  transformationType: string;
}

type WizardStep = "upload" | "analysis" | "mapping" | "review" | "import";

export function MigrationWizard({
  organizationId,
  onComplete,
  onCancel,
}: MigrationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [migrationJobId, setMigrationJobId] = useState<string>("");
  const [migrationName, setMigrationName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Step 1: File Upload
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setIsLoading(true);
      setError("");

      try {
        const uploads: FileUpload[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file
          if (file.size > 100 * 1024 * 1024) {
            // 100MB
            throw new Error(`File ${file.name} is too large (max 100MB)`);
          }

          if (
            ![
              "text/csv",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ].includes(file.type)
          ) {
            throw new Error(
              `File ${file.name} is not a supported format (CSV/Excel only)`,
            );
          }

          // Generate preview
          const preview = await generateFilePreview(file);
          uploads.push({ file, preview });
        }

        setUploadedFiles(uploads);

        if (!migrationName) {
          const defaultName = `GoTeamUp Migration ${new Date().toLocaleDateString()}`;
          setMigrationName(defaultName);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "File upload failed");
      } finally {
        setIsLoading(false);
      }
    },
    [migrationName],
  );

  // Step 2: Start Analysis
  const startAnalysis = useCallback(async () => {
    if (!migrationName.trim()) {
      setError("Please enter a migration name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Create migration job
      const jobResponse = await fetch("/api/migration/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          name: migrationName,
          description: "GoTeamUp data migration",
          sourcePlatform: "goteamup",
          settings: {
            skipDuplicates: true,
            validateData: true,
            createBackup: false,
            batchSize: 100,
          },
        }),
      });

      if (!jobResponse.ok) {
        throw new Error("Failed to create migration job");
      }

      const jobData = await jobResponse.json();
      setMigrationJobId(jobData.jobId);

      // Upload files
      const formData = new FormData();
      uploadedFiles.forEach((upload, index) => {
        formData.append(`file-${index}`, upload.file);
      });

      const uploadResponse = await fetch(
        `/api/migration/jobs/${jobData.jobId}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      // Start AI analysis
      const analysisResponse = await fetch(
        `/api/migration/jobs/${jobData.jobId}/analyze`,
        {
          method: "POST",
        },
      );

      if (!analysisResponse.ok) {
        throw new Error("Failed to start analysis");
      }

      setCurrentStep("analysis");
      pollAnalysisStatus(jobData.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed to start");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, migrationName, uploadedFiles]);

  // Poll analysis status
  const pollAnalysisStatus = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/migration/jobs/${jobId}/progress`);
        if (!response.ok) return;

        const progress = await response.json();

        if (progress.status === "processed") {
          clearInterval(pollInterval);

          // Get analysis results
          const analysisResponse = await fetch(
            `/api/migration/jobs/${jobId}/analysis`,
          );
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            setAnalysis(analysisData);
            setFieldMappings(analysisData.fieldMappings || []);
            setCurrentStep("mapping");
          }
        } else if (progress.status === "failed") {
          clearInterval(pollInterval);
          setError(progress.errors?.[0] || "Analysis failed");
        }
      } catch (err) {
        console.error("Error polling analysis status:", err);
      }
    }, 2000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }, []);

  // Step 3: Review and adjust field mappings
  const updateFieldMapping = useCallback(
    (index: number, updates: Partial<FieldMapping>) => {
      setFieldMappings((prev) =>
        prev.map((mapping, i) =>
          i === index ? { ...mapping, ...updates } : mapping,
        ),
      );
    },
    [],
  );

  // Step 4: Start import
  const startImport = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      // Save updated field mappings
      await fetch(`/api/migration/jobs/${migrationJobId}/mappings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: fieldMappings }),
      });

      // Start import process
      const response = await fetch(
        `/api/migration/jobs/${migrationJobId}/import`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start import");
      }

      setCurrentStep("import");
      pollImportStatus(migrationJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed to start");
    } finally {
      setIsLoading(false);
    }
  }, [migrationJobId, fieldMappings]);

  // Poll import status
  const pollImportStatus = useCallback(
    async (jobId: string) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/migration/jobs/${jobId}/progress`);
          if (!response.ok) return;

          const progress = await response.json();

          if (progress.status === "completed") {
            clearInterval(pollInterval);
            onComplete();
          } else if (progress.status === "failed") {
            clearInterval(pollInterval);
            setError(progress.errors?.[0] || "Import failed");
          }
        } catch (err) {
          console.error("Error polling import status:", err);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    },
    [onComplete],
  );

  // Helper function to generate file preview
  async function generateFilePreview(file: File): Promise<string[]> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").slice(0, 5); // First 5 lines
        resolve(lines.filter((line) => line.trim()));
      };
      reader.readAsText(file.slice(0, 1024)); // First 1KB for preview
    });
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: "upload", label: "Upload Files", icon: Upload },
      { key: "analysis", label: "AI Analysis", icon: Brain },
      { key: "mapping", label: "Field Mapping", icon: Settings },
      { key: "review", label: "Review", icon: CheckCircle },
      { key: "import", label: "Import", icon: Play },
    ];

    const currentIndex = steps.findIndex((step) => step.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  isActive
                    ? "text-blue-400"
                    : isCompleted
                      ? "text-green-400"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-500 mx-4" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Upload Your GoTeamUp Data</CardTitle>
          <CardDescription className="text-gray-400">
            Upload CSV or Excel files containing your member data, class
            bookings, and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label 
            htmlFor="file-upload-input"
            className="block"
          >
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 cursor-pointer transition-all bg-gray-800/50 hover:bg-gray-800/80"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("border-blue-500", "bg-gray-800");
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-blue-500", "bg-gray-800");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-blue-500", "bg-gray-800");
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
            >
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  <span className="text-blue-500 hover:text-blue-400 underline cursor-pointer">
                    Click to upload
                  </span>
                  <span className="text-gray-400"> or drag and drop</span>
                </p>
                <p className="text-sm text-gray-500">
                  CSV, Excel files up to 100MB
                </p>
              </div>
            </div>
            <input
              id="file-upload-input"
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files);
                }
              }}
            />
          </label>

          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-medium text-gray-900">Uploaded Files:</h4>
              {uploadedFiles.map((upload, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="font-medium">{upload.file.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({(upload.file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setUploadedFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Preview:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {upload.preview.slice(0, 3).join("\n")}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Migration Name
            </label>
            <input
              type="text"
              value={migrationName}
              onChange={(e) => setMigrationName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., GoTeamUp Migration January 2024"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={startAnalysis}
          disabled={
            uploadedFiles.length === 0 || !migrationName.trim() || isLoading
          }
        >
          {isLoading ? "Starting..." : "Start Analysis"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis in Progress</CardTitle>
          <CardDescription>
            Our AI is analyzing your data structure and suggesting optimal field
            mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Analyzing Your Data
            </h3>
            <p className="text-gray-600">
              This may take a few minutes depending on file size...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Field Mappings</CardTitle>
          <CardDescription>
            AI has analyzed your data and suggested these field mappings. Review
            and adjust as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldMappings.length > 0 ? (
            <div className="space-y-4">
              {fieldMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">
                            Source Field
                          </label>
                          <div className="text-gray-900">
                            {mapping.sourceField}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-gray-700">
                            Target Field
                          </label>
                          <div className="text-gray-900">
                            {mapping.targetTable}.{mapping.targetField}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <Badge
                          variant={
                            mapping.confidence > 0.8 ? "default" : "secondary"
                          }
                          className={
                            mapping.confidence > 0.8
                              ? "bg-green-100 text-green-800"
                              : mapping.confidence > 0.6
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {Math.round(mapping.confidence * 100)}% confidence
                        </Badge>
                        <Badge variant="outline">
                          {mapping.transformationType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No field mappings found
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep("review")}
          disabled={fieldMappings.length === 0}
        >
          Continue to Review
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ready to Import</CardTitle>
          <CardDescription>
            Review the migration summary before starting the import process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Files to Import
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {uploadedFiles.map((upload, index) => (
                    <li key={index}>• {upload.file.name}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Field Mappings
                </h4>
                <p className="text-sm text-gray-600">
                  {fieldMappings.length} fields mapped with{" "}
                  {Math.round(
                    (fieldMappings.reduce((sum, m) => sum + m.confidence, 0) /
                      fieldMappings.length) *
                      100,
                  )}
                  % average confidence
                </p>
              </div>
            </div>

            {analysis?.recommendations && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  AI Recommendations
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {analysis.recommendations
                    .slice(0, 3)
                    .map((rec: string, index: number) => (
                      <li key={index}>• {rec}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("mapping")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mappings
        </Button>
        <Button onClick={startImport} disabled={isLoading}>
          {isLoading ? "Starting Import..." : "Start Import"}
          <Play className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import in Progress</CardTitle>
          <CardDescription>
            Your data is being imported. You can close this window and check
            progress later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Importing Records
            </h3>
            <p className="text-gray-600">
              This process will continue in the background...
            </p>
            <Button className="mt-4" onClick={onComplete}>
              Go to Migration Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          GoTeamUp Migration Wizard
        </h1>
        <p className="text-gray-400">
          Follow these steps to import your GoTeamUp data into Atlas Fitness CRM
        </p>
      </div>

      {renderStepIndicator()}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {currentStep === "upload" && renderUploadStep()}
      {currentStep === "analysis" && renderAnalysisStep()}
      {currentStep === "mapping" && renderMappingStep()}
      {currentStep === "review" && renderReviewStep()}
      {currentStep === "import" && renderImportStep()}
    </div>
  );
}
