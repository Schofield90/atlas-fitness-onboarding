/**
 * GoTeamUp Migration Service
 * Handles file upload, processing, and data migration with AI analysis
 */

import { createClient } from "@supabase/supabase-js";
import { enhancedQueueManager } from "../queue/enhanced-queue-manager";
import { supabaseAdmin } from "../supabase/admin";
import { uploadFileToStorage } from "./file-upload-service";
import { analyzeDataWithAI } from "./ai-data-analyzer";

export interface MigrationJobConfig {
  organizationId: string;
  name: string;
  description?: string;
  sourcePlatform: string;
  settings: {
    skipDuplicates: boolean;
    validateData: boolean;
    createBackup: boolean;
    batchSize: number;
  };
}

export interface FileUploadResult {
  fileId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface MigrationProgress {
  jobId: string;
  status:
    | "pending"
    | "processing"
    | "analyzing"
    | "importing"
    | "completed"
    | "failed";
  totalRecords: number;
  processedRecords: number;
  successfulImports: number;
  failedImports: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number;
  currentStep: string;
  errors: string[];
}

export class MigrationService {
  private supabase = supabaseAdmin;

  /**
   * Initialize a new migration job
   */
  async createMigrationJob(
    config: MigrationJobConfig,
    userId: string,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from("migration_jobs")
        .insert({
          organization_id: config.organizationId,
          name: config.name,
          description: config.description,
          source_platform: config.sourcePlatform,
          status: "pending",
          settings: config.settings,
          created_by: userId,
          // Temporary values - will be updated after file upload
          original_filename: "pending",
          file_size_bytes: 0,
          file_type: "pending",
          storage_path: "pending",
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create migration job: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error("Error creating migration job:", error);
      throw error;
    }
  }

  /**
   * Upload migration files and associate with job
   */
  async uploadMigrationFiles(
    jobId: string,
    files: File[],
    organizationId: string,
  ): Promise<FileUploadResult[]> {
    const uploadResults: FileUploadResult[] = [];

    try {
      // Validate file types and sizes
      for (const file of files) {
        this.validateFile(file);
      }

      // Upload files to Supabase Storage
      for (const file of files) {
        const result = await this.uploadSingleFile(jobId, file, organizationId);
        uploadResults.push(result);
      }

      // Update migration job with primary file info
      if (uploadResults.length > 0) {
        const primaryFile = uploadResults[0];
        await this.supabase
          .from("migration_jobs")
          .update({
            original_filename: primaryFile.fileName,
            file_size_bytes: primaryFile.fileSize,
            file_type: this.getFileExtension(primaryFile.fileName),
            storage_path: primaryFile.filePath,
            status: "processing",
          })
          .eq("id", jobId);
      }

      return uploadResults;
    } catch (error) {
      // Clean up any uploaded files on error
      await this.cleanupUploadedFiles(uploadResults);
      throw error;
    }
  }

  /**
   * Start AI analysis and field mapping for uploaded files
   */
  async startDataAnalysis(jobId: string): Promise<void> {
    try {
      // Add job to AI analysis queue
      await enhancedQueueManager.addJob(
        "AI_PROCESSING",
        "analyze-migration-data",
        {
          migrationJobId: jobId,
          analysisType: "goteamup-import",
        },
        {
          priority: 5, // High priority for user-initiated analysis
          delay: 1000, // Small delay to ensure file upload is complete
          attempts: 3,
        },
      );

      // Update job status
      await this.updateJobStatus(jobId, "analyzing");

      console.log(`Started AI analysis for migration job ${jobId}`);
    } catch (error) {
      console.error("Error starting data analysis:", error);
      await this.updateJobStatus(
        jobId,
        "failed",
        `Analysis start failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Process migration data with AI field mapping
   */
  async processMigrationData(jobId: string): Promise<void> {
    try {
      // Get migration job details
      const { data: job, error: jobError } = await this.supabase
        .from("migration_jobs")
        .select(
          `
          *,
          migration_files(*)
        `,
        )
        .eq("id", jobId)
        .single();

      if (jobError || !job) {
        throw new Error(`Migration job not found: ${jobError?.message}`);
      }

      // Update status
      await this.updateJobStatus(jobId, "processing");

      // Process each file
      for (const file of job.migration_files) {
        await this.processFile(jobId, file, job.organization_id);
      }

      // Add to import queue
      await enhancedQueueManager.addJob(
        "WORKFLOW_ACTIONS",
        "import-migration-records",
        {
          migrationJobId: jobId,
          organizationId: job.organization_id,
        },
        {
          priority: 4,
          attempts: 5,
        },
      );
    } catch (error) {
      console.error("Error processing migration data:", error);
      await this.updateJobStatus(
        jobId,
        "failed",
        `Processing failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get migration job progress
   */
  async getMigrationProgress(jobId: string): Promise<MigrationProgress> {
    try {
      const { data, error } = await this.supabase
        .from("migration_dashboard")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !data) {
        throw new Error(`Migration job not found: ${error?.message}`);
      }

      // Get recent logs for current step
      const { data: recentLogs } = await this.supabase
        .from("migration_logs")
        .select("message, log_level")
        .eq("migration_job_id", jobId)
        .eq("log_level", "error")
        .order("created_at", { ascending: false })
        .limit(5);

      const errors = recentLogs?.map((log) => log.message) || [];

      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (data.status === "processing" && data.duration_minutes > 0) {
        const progressRate = data.processed_records / data.duration_minutes;
        const remainingRecords = data.total_records - data.processed_records;
        estimatedTimeRemaining = Math.round(remainingRecords / progressRate);
      }

      return {
        jobId,
        status: data.status,
        totalRecords: data.total_records,
        processedRecords: data.processed_records,
        successfulImports: data.successful_imports,
        failedImports: data.failed_imports,
        progressPercentage: data.progress_percentage,
        estimatedTimeRemaining,
        currentStep: this.getCurrentStep(data.status),
        errors,
      };
    } catch (error) {
      console.error("Error getting migration progress:", error);
      throw error;
    }
  }

  /**
   * Cancel a running migration job
   */
  async cancelMigrationJob(jobId: string): Promise<void> {
    try {
      await this.updateJobStatus(jobId, "cancelled");

      // Clean up any background jobs
      // Note: This would require additional queue management functionality
      console.log(`Migration job ${jobId} cancelled`);
    } catch (error) {
      console.error("Error cancelling migration job:", error);
      throw error;
    }
  }

  /**
   * Get migration conflicts requiring resolution
   */
  async getMigrationConflicts(jobId: string) {
    try {
      const { data, error } = await this.supabase
        .from("migration_conflicts")
        .select(
          `
          *,
          migration_records(source_row_number, source_data)
        `,
        )
        .eq("migration_job_id", jobId)
        .is("resolved_at", null) // Use resolved_at to check if pending
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to get conflicts: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error getting migration conflicts:", error);
      throw error;
    }
  }

  /**
   * Resolve a migration conflict
   */
  async resolveMigrationConflict(
    conflictId: string,
    resolution: {
      action: "use_existing" | "use_new" | "merge" | "skip";
      data?: any;
    },
    userId: string,
  ): Promise<void> {
    try {
      await this.supabase
        .from("migration_conflicts")
        .update({
          resolution_strategy: resolution.action,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", conflictId);

      console.log(
        `Conflict ${conflictId} resolved with action: ${resolution.action}`,
      );
    } catch (error) {
      console.error("Error resolving conflict:", error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validateFile(file: File): void {
    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} is too large. Maximum size is 100MB.`);
    }

    // Check file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `File type ${file.type} is not supported. Please upload CSV or Excel files.`,
      );
    }
  }

  private async uploadSingleFile(
    jobId: string,
    file: File,
    organizationId: string,
  ): Promise<FileUploadResult> {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `migrations/${organizationId}/${jobId}/${fileName}`;

    try {
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from("migration-uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Record file in database
      const { data: fileRecord, error: dbError } = await this.supabase
        .from("migration_files")
        .insert({
          migration_job_id: jobId,
          organization_id: organizationId,
          filename: fileName,
          original_filename: file.name,
          file_type: this.getFileExtension(file.name),
          file_size_bytes: file.size,
          mime_type: file.type,
          storage_path: data.path,
          processing_status: "uploaded",
        })
        .select("id")
        .single();

      if (dbError) {
        throw new Error(`Database record failed: ${dbError.message}`);
      }

      return {
        fileId: fileRecord.id,
        filePath: data.path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  private async processFile(
    jobId: string,
    file: any,
    organizationId: string,
  ): Promise<void> {
    try {
      // Download file content
      const { data: fileContent, error } = await this.supabase.storage
        .from("migration-uploads")
        .download(file.storage_path);

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      // Parse file content based on type
      const parsedData = await this.parseFileContent(
        fileContent,
        file.file_type,
      );

      // Analyze with AI
      const analysis = await analyzeDataWithAI(parsedData, "goteamup");

      // Store analysis results
      await this.supabase
        .from("migration_files")
        .update({
          processing_status: "processed",
          detected_data_types: analysis.dataTypes,
          column_analysis: analysis.columns,
          data_quality_score: analysis.qualityScore,
          total_rows: parsedData.length,
          valid_rows: analysis.validRows,
        })
        .eq("id", file.id);

      // Create field mappings from AI analysis
      await this.createFieldMappings(
        jobId,
        organizationId,
        analysis.fieldMappings,
      );

      // Create migration records
      await this.createMigrationRecords(jobId, organizationId, parsedData);
    } catch (error) {
      console.error("Error processing file:", error);

      // Update file status to failed
      await this.supabase
        .from("migration_files")
        .update({
          processing_status: "failed",
        })
        .eq("id", file.id);

      throw error;
    }
  }

  private async parseFileContent(
    content: Blob,
    fileType: string,
  ): Promise<any[]> {
    // This would contain CSV/Excel parsing logic
    // For now, returning mock data structure
    const text = await content.text();

    if (fileType === "csv") {
      // CSV parsing logic
      const lines = text.split("\n");
      const headers = lines[0].split(",");

      return lines.slice(1).map((line, index) => {
        const values = line.split(",");
        const record: any = { _rowNumber: index + 2 };
        headers.forEach((header, i) => {
          record[header.trim()] = values[i]?.trim() || "";
        });
        return record;
      });
    }

    // Excel parsing would require additional library like xlsx
    throw new Error(`File type ${fileType} parsing not implemented`);
  }

  private async createFieldMappings(
    jobId: string,
    organizationId: string,
    mappings: any[],
  ): Promise<void> {
    const mappingRecords = mappings.map((mapping, index) => ({
      migration_job_id: jobId,
      organization_id: organizationId,
      source_field: mapping.sourceField,
      source_column_index: index,
      source_data_type: mapping.sourceDataType,
      source_sample_values: mapping.sampleValues,
      target_table: mapping.targetTable,
      target_field: mapping.targetField,
      target_data_type: mapping.targetDataType,
      transformation_type: mapping.transformationType || "direct",
      transformation_config: mapping.transformationConfig || {},
      ai_confidence: mapping.confidence,
      is_required: mapping.isRequired || false,
      mapping_priority: mapping.priority || 1,
    }));

    const { error } = await this.supabase
      .from("migration_field_mappings")
      .insert(mappingRecords);

    if (error) {
      throw new Error(`Failed to create field mappings: ${error.message}`);
    }
  }

  private async createMigrationRecords(
    jobId: string,
    organizationId: string,
    data: any[],
  ): Promise<void> {
    const batchSize = 1000;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const records = batch.map((row) => ({
        migration_job_id: jobId,
        organization_id: organizationId,
        source_row_number: row._rowNumber,
        source_data: row,
        status: "pending",
      }));

      const { error } = await this.supabase
        .from("migration_records")
        .insert(records);

      if (error) {
        throw new Error(`Failed to create migration records: ${error.message}`);
      }
    }

    // Update total records count
    await this.supabase
      .from("migration_jobs")
      .update({ total_records: data.length })
      .eq("id", jobId);
  }

  private async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "processing" && !errorMessage) {
      updates.started_at = new Date().toISOString();
    }

    if (status === "completed" || status === "failed") {
      updates.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    await this.supabase.from("migration_jobs").update(updates).eq("id", jobId);
  }

  private getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
  }

  private getCurrentStep(status: string): string {
    const stepMapping = {
      pending: "Initializing migration",
      processing: "Processing files",
      analyzing: "Analyzing data with AI",
      importing: "Importing records",
      completed: "Migration completed",
      failed: "Migration failed",
      cancelled: "Migration cancelled",
    };

    return stepMapping[status] || "Unknown step";
  }

  private async cleanupUploadedFiles(
    uploadResults: FileUploadResult[],
  ): Promise<void> {
    for (const result of uploadResults) {
      try {
        await this.supabase.storage
          .from("migration-uploads")
          .remove([result.filePath]);
      } catch (error) {
        console.error("Error cleaning up file:", error);
      }
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
