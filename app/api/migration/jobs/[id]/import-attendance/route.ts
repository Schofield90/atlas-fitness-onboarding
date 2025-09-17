import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow 5 minutes for large attendance imports

/**
 * POST /api/migration/jobs/[id]/import-attendance
 * Import attendance data and match to existing clients
 * Requires x-import-token header for authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;
  const startTime = Date.now();
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[IMPORT-ATTENDANCE] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting attendance import for job ${jobId}`);

    // Verify import token
    const importToken = request.headers.get("x-import-token");
    if (!importToken || importToken !== process.env.IMPORT_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid import token", logs },
        { status: 401 },
      );
    }

    // Get organization from job record using admin client
    const supabaseAdmin = createAdminClient();
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("organization_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job?.organization_id) {
      return NextResponse.json(
        { success: false, error: "Migration job not found", logs },
        { status: 404 },
      );
    }

    const organizationId = job.organization_id;

    // Get form data with file
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided", logs },
        { status: 400 },
      );
    }

    // Parse CSV
    const csvText = await file.text();
    log(`Parsing ${csvText.length} characters of CSV data`);

    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    log(`Parsed ${parseResult.data.length} attendance records`);

    // Load existing clients for matching
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, name, first_name, last_name, email")
      .eq("organization_id", organizationId);

    // Create lookup maps
    const clientByName = new Map();
    const clientByEmail = new Map();

    clients?.forEach((client) => {
      // Name variations for matching
      const fullName =
        client.name || `${client.first_name} ${client.last_name}`;
      clientByName.set(fullName.toLowerCase(), client.id);

      if (client.email) {
        clientByEmail.set(client.email.toLowerCase(), client.id);
      }
    });

    log(`Loaded ${clients?.length || 0} clients for matching`);

    // Process attendance records
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const bookings = [];

    for (const row of parseResult.data as any[]) {
      try {
        // Find date column (flexible matching)
        const dateValue =
          row.date ||
          row["class date"] ||
          row["attendance date"] ||
          row["booking date"] ||
          row.when;

        // Find time column
        const timeValue =
          row.time ||
          row["class time"] ||
          row["start time"] ||
          row["booking time"];

        // Find client name
        const clientName =
          row["client name"] ||
          row["member name"] ||
          row["full name"] ||
          row.name ||
          row.customer ||
          row.member;

        // Find email
        const email = row.email || row["email address"];

        // Find class/activity
        const className =
          row["class name"] ||
          row["class type"] ||
          row.activity ||
          row.class ||
          row.service;

        // Find status
        const status =
          row.status || row["attendance status"] || row.attended || "attended";

        if (!dateValue || !clientName) {
          skipCount++;
          continue;
        }

        // Match client
        let clientId = null;

        if (email && clientByEmail.has(email.toLowerCase())) {
          clientId = clientByEmail.get(email.toLowerCase());
        } else if (clientByName.has(clientName.toLowerCase())) {
          clientId = clientByName.get(clientName.toLowerCase());
        }

        if (!clientId) {
          log(`Could not match client: ${clientName}`);
          skipCount++;
          continue;
        }

        // Create booking record
        bookings.push({
          client_id: clientId,
          organization_id: organizationId,
          booking_date: dateValue,
          booking_time: timeValue || "00:00",
          booking_type: className || "Class",
          booking_status: status.toLowerCase().includes("cancel")
            ? "cancelled"
            : "attended",
          attended_at: status.toLowerCase().includes("attend")
            ? new Date().toISOString()
            : null,
          notes: `Imported from migration job ${jobId}`,
          source: "migration",
          created_at: new Date().toISOString(),
        });

        successCount++;
      } catch (err: any) {
        errorCount++;
        log(`Error processing row: ${err.message}`);
      }
    }

    // Insert bookings in batches to handle large datasets
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < bookings.length; i += batchSize) {
      const batch = bookings.slice(i, i + batchSize);
      const { error, data } = await supabaseAdmin
        .from("bookings")
        .insert(batch)
        .select("id");

      if (error) {
        log(
          `Batch ${Math.floor(i / batchSize) + 1} insert error: ${error.message}`,
        );
        errorCount += batch.length;
      } else {
        totalInserted += data?.length || 0;
        log(
          `Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} bookings`,
        );
      }
    }

    log(`Total bookings inserted: ${totalInserted}`);

    log(
      `Import complete - Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`,
    );

    // Update migration job with attendance import status
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          attendance_imported: true,
          attendance_count: totalInserted,
          attendance_errors: errorCount,
          attendance_import_date: new Date().toISOString(),
        },
        status: totalInserted > 0 ? "completed" : "failed",
      })
      .eq("id", jobId);

    if (updateError) {
      log(`Failed to update job status: ${updateError.message}`);
    }

    const duration = Date.now() - startTime;
    
    // Structured log for monitoring
    const importSummary = {
      jobId,
      organizationId,
      duration_ms: duration,
      total_rows: parseResult.data.length,
      imported: totalInserted,
      skipped: skipCount,
      errors: errorCount,
      batches: Math.ceil(bookings.length / batchSize),
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[IMPORT-ATTENDANCE-SUMMARY] ${JSON.stringify(importSummary)}`);

    return NextResponse.json({
      success: true,
      logs,
      stats: importSummary,
    });
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        logs,
      },
      { status: 500 },
    );
  }
}
