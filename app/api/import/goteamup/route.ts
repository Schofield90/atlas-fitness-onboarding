import { NextRequest, NextResponse } from "next/server";
import { GoTeamUpImporter, parseCSV } from "@/app/lib/services/goteamup-import";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { migrationService } from "@/app/lib/services/migration-service";
import { requireAuth } from "@/app/lib/api/auth-check";

export const runtime = "nodejs"; // Ensure Node runtime (not edge)
export const dynamic = "force-dynamic"; // No caching
export const maxDuration = 300; // Increase to 5 minutes for large imports

// Background job processing for large imports
export async function POST(request: NextRequest) {
  return handleImportRequest(request, false); // Direct processing
}

// New endpoint for background processing
export async function PUT(request: NextRequest) {
  return handleImportRequest(request, true); // Background processing
}

async function handleImportRequest(
  request: NextRequest,
  useBackgroundProcessing: boolean,
) {
  console.log("GoTeamUp import endpoint called");

  try {
    // Authenticate user
    const user = await requireAuth();
    const userId = user.id;
    const organizationId = user.organizationId;

    console.log("Authenticated user:", userId, "Organization:", organizationId);

    // Use admin client for database operations - bypasses RLS
    const supabase = createAdminClient();

    // Parse form data first (can only read body once)
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 },
      );
    }

    // Parse CSV
    const fileContent = await file.text();
    const rows = parseCSVContent(fileContent);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Create importer with supabase client
    const importer = new GoTeamUpImporter(supabase, organizationId);

    // Auto-detect type if not specified
    let importType = fileType;
    if (!importType || importType === "auto") {
      const headers = Object.keys(rows[0]);
      importType = importer.detectFileType(headers);

      if (importType === "unknown") {
        return NextResponse.json(
          {
            error:
              "Could not detect file type. Please specify if this is a payments or attendance file.",
          },
          { status: 400 },
        );
      }
    }

    // Check if we should use background processing for large files
    // Use background processing for files with more than 100 rows to avoid timeouts
    const shouldUseBackground = useBackgroundProcessing || rows.length > 100;

    if (shouldUseBackground) {
      // Create migration job for background processing
      const jobId = await migrationService.createMigrationJob(
        {
          organizationId,
          name: `GoTeamUp ${importType} Import - ${file.name}`,
          description: `Importing ${rows.length} records from ${file.name}`,
          sourcePlatform: "goteamup",
          settings: {
            skipDuplicates: true,
            validateData: true,
            createBackup: false,
            batchSize: 10,
          },
        },
        userId,
      );

      // Start background processing with parsed rows (no file upload needed)
      await processGoTeamUpImportInBackground(
        jobId,
        organizationId,
        rows,
        importType,
      );

      return NextResponse.json({
        success: true,
        message: `Import started in background. Processing ${rows.length} records.`,
        stats: {
          total: rows.length,
          success: 0,
          errors: 0,
          skipped: 0,
        },
        jobId,
        type: importType,
        backgroundProcessing: true,
      });
    } else {
      // Direct processing for small files
      let result;
      if (importType === "payments") {
        result = await importer.importPayments(rows);
      } else if (importType === "attendance") {
        result = await importer.importAttendance(rows);
      } else if (importType === "clients") {
        result = await importer.importClients(rows);
      } else {
        return NextResponse.json(
          { error: "Invalid import type" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        success: result.success,
        message: result.message,
        stats: result.stats,
        errors: result.errors,
        type: importType,
        backgroundProcessing: false,
      });
    }
  } catch (error: any) {
    console.error("Import error:", error);

    // Handle timeout specifically
    if (error.message?.includes("timeout") || error.message?.includes("504")) {
      return NextResponse.json(
        {
          error:
            "Import is taking too long. Try importing a smaller file or split your data into multiple files.",
          details: "Maximum processing time is 60 seconds",
        },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 },
    );
  }
}

// Helper to parse CSV content (handles quoted values properly)
function parseCSVContent(content: string): any[] {
  const lines = content.split("\n");
  if (lines.length < 2) {
    return [];
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const data = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    data.push(row);
  }

  return data;
}

// Helper to parse a single CSV line (handles quoted values)
function parseCSVLine(line: string): string[] {
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
}

// Background processing function for GoTeamUp imports
async function processGoTeamUpImportInBackground(
  jobId: string,
  organizationId: string,
  rows: any[],
  importType: string,
) {
  try {
    // Use admin client for background processing - no cookies/sessions
    const supabase = createAdminClient();

    // Update job status to processing
    await supabase
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        total_records: rows.length,
      })
      .eq("id", jobId);

    // Create progress tracking callback
    let lastProgress = { processed: 0, success: 0, errors: 0, skipped: 0 };

    const progressCallback = async (progress: any) => {
      // Update progress every 10 records to avoid too many database calls
      if (
        progress.processed - lastProgress.processed >= 10 ||
        progress.processed === progress.total
      ) {
        await supabase
          .from("migration_jobs")
          .update({
            processed_records: progress.processed,
            successful_imports: progress.success,
            failed_imports: progress.errors,
            progress_percentage: Math.round(
              (progress.processed / progress.total) * 100,
            ),
          })
          .eq("id", jobId);

        lastProgress = { ...progress };
      }
    };

    // Create importer with progress callback
    const importer = new GoTeamUpImporter(
      supabase,
      organizationId,
      progressCallback,
      true,
    );

    // Process the import
    let result;
    if (importType === "payments") {
      result = await importer.importPayments(rows, 10); // Use smaller batch size
    } else if (importType === "attendance") {
      result = await importer.importAttendance(rows, 10); // Use smaller batch size
    } else if (importType === "clients") {
      result = await importer.importClients(rows, 10); // Use smaller batch size
    } else {
      throw new Error("Invalid import type");
    }

    // Update final job status
    await supabase
      .from("migration_jobs")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        processed_records: result.stats.total,
        successful_imports: result.stats.success,
        failed_imports: result.stats.errors,
        progress_percentage: 100,
        error_message: result.success ? null : result.message,
      })
      .eq("id", jobId);

    // Log any errors
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        await supabase.from("migration_logs").insert({
          migration_job_id: jobId,
          log_level: "error",
          message: `Row ${error.row}: ${error.error}`,
          created_at: new Date().toISOString(),
        });
      }
    }

    console.log(`Background import completed for job ${jobId}:`, result.stats);
  } catch (error) {
    console.error(`Background import failed for job ${jobId}:`, error);

    // Update job as failed
    const supabase = createAdminClient();
    await supabase
      .from("migration_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", jobId);
  }
}
