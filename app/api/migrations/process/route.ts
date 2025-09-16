import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import * as XLSX from "xlsx";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { jobId, mappings } = await request.json();

    console.log("Process endpoint called with:", {
      jobId,
      mappingsCount: mappings?.length,
    });
    console.log("First mapping:", mappings?.[0]);
    console.log("All mappings:", JSON.stringify(mappings, null, 2));

    if (!jobId || !mappings) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // Get the migration job and file
    const { data: job, error: jobError } = await supabase
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
      return NextResponse.json(
        { success: false, error: "Migration job not found" },
        { status: 404 },
      );
    }

    // Start processing
    await supabase
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Process in background to avoid timeout
    processInBackground(jobId, job, mappings);

    return NextResponse.json({
      success: true,
      message: "Migration started",
      jobId,
    });
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start migration" },
      { status: 500 },
    );
  }
}

async function processInBackground(jobId: string, job: any, mappings: any[]) {
  try {
    const file = job.migration_files[0];

    // Download and parse file
    const { data: fileData } = await supabaseAdmin.storage
      .from("migrations")
      .download(file.storage_path);

    if (!fileData) {
      throw new Error("Failed to download file");
    }

    let parsedData: any[] = [];

    if (file.file_type.includes("csv")) {
      const text = await fileData.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      parsedData = result.data;
    } else {
      const buffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      parsedData = XLSX.utils.sheet_to_json(firstSheet);
    }

    // Process data in batches to avoid memory issues
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    // If mappings is empty or undefined, try to get from the job's field_mappings
    let effectiveMappings = mappings;
    if (!mappings || mappings.length === 0) {
      console.log("No mappings provided, checking job field_mappings");
      if (job.field_mappings) {
        // Convert field_mappings object to array format
        effectiveMappings = Object.entries(job.field_mappings).map(
          ([source, target]) => ({
            source_field: source,
            target_field: target as string,
            target_table: "clients",
          }),
        );
        console.log("Using job field_mappings:", effectiveMappings);
      } else {
        console.error("No field mappings found in job or request");
        // Return error instead of proceeding with empty mappings
        await supabaseAdmin
          .from("migration_jobs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        return NextResponse.json(
          { success: false, error: "No field mappings configured" },
          { status: 400 },
        );
      }
    }

    // Group mappings by table (default to clients if no target_table specified)
    const tableMappings = effectiveMappings.reduce(
      (acc, m) => {
        const table = m.target_table || "clients"; // Default to clients table
        acc[table] = acc[table] || [];
        acc[table].push(m);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    console.log("Mappings by table:", Object.keys(tableMappings));
    console.log("Client mappings count:", tableMappings.clients?.length || 0);
    console.log("Client mappings detail:", tableMappings.clients);

    // Process clients first (as other records may reference them)
    if (tableMappings.clients) {
      const clientResults = await processClients(
        parsedData,
        tableMappings.clients,
        job.organization_id,
        jobId,
      );
      processed += clientResults.processed;
      successful += clientResults.successful;
      failed += clientResults.failed;
    }

    // Process payments
    if (tableMappings.payments) {
      const paymentResults = await processPayments(
        parsedData,
        tableMappings.payments,
        job.organization_id,
        jobId,
      );
      processed += paymentResults.processed;
      successful += paymentResults.successful;
      failed += paymentResults.failed;
    }

    // Process attendances
    if (tableMappings.attendances) {
      const attendanceResults = await processAttendances(
        parsedData,
        tableMappings.attendances,
        job.organization_id,
        jobId,
      );
      processed += attendanceResults.processed;
      successful += attendanceResults.successful;
      failed += attendanceResults.failed;
    }

    // Update job as completed
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "completed",
        processed_records: processed,
        successful_records: successful,
        failed_records: failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Log completion
    await supabaseAdmin.from("migration_logs").insert({
      migration_job_id: jobId,
      organization_id: job.organization_id,
      level: "info",
      message: `Migration completed: ${successful} successful, ${failed} failed out of ${processed} processed`,
      details: { processed, successful, failed },
    });
  } catch (error) {
    console.error("Background processing error:", error);

    // Update job as failed
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Log error
    await supabaseAdmin.from("migration_logs").insert({
      migration_job_id: jobId,
      organization_id: job.organization_id,
      level: "error",
      message: "Migration failed",
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function processClients(
  data: any[],
  mappings: any[],
  organizationId: string,
  jobId: string,
) {
  let processed = 0;
  let successful = 0;
  let failed = 0;

  console.log("processClients called with:", {
    dataCount: data.length,
    mappingsCount: mappings.length,
    organizationId,
    jobId,
  });
  console.log("Mappings in processClients:", mappings);

  // Extract unique clients based on email
  const emailMapping = mappings.find((m) => m.target_field === "email");
  if (!emailMapping) {
    console.error("No email field mapping found in mappings:", mappings);
    return { processed, successful, failed };
  }

  const uniqueClients = new Map();

  console.log("Email mapping:", emailMapping);
  console.log("First data row:", data[0]);
  console.log("Data row keys:", data[0] ? Object.keys(data[0]) : "No data");

  for (const row of data) {
    const email = row[emailMapping.source_field];
    if (email && !uniqueClients.has(email)) {
      uniqueClients.set(email, row);
    }
  }

  console.log("Unique clients found:", uniqueClients.size);

  // Process each unique client
  for (const [email, row] of uniqueClients) {
    processed++;

    try {
      // Check for existing client
      const { data: existing } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("email", email)
        .eq("organization_id", organizationId)
        .single();

      if (existing) {
        // Record as duplicate
        await supabaseAdmin.from("migration_records").insert({
          migration_job_id: jobId,
          organization_id: organizationId,
          source_record_id: email,
          record_type: "client",
          source_data: row,
          status: "duplicate",
          target_id: existing.id,
          target_table: "clients",
        });

        await supabaseAdmin.from("migration_conflicts").insert({
          migration_job_id: jobId,
          organization_id: organizationId,
          migration_record_id: null,
          conflict_type: "duplicate_email",
          existing_record_id: existing.id,
          existing_data: existing,
          incoming_data: row,
          resolution_strategy: "skip",
        });

        continue;
      }

      // Map fields to client data
      const clientData: any = {
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        metadata: {}, // Initialize metadata for address fields
      };

      // Fields that should go into metadata instead of direct columns
      const metadataFields = ["address", "city", "postcode", "country"];

      for (const mapping of mappings) {
        if (mapping.source_field && row[mapping.source_field] !== undefined) {
          // Determine data type based on target field if not specified
          let dataType = mapping.data_type;
          if (!dataType) {
            if (mapping.target_field === "date_of_birth") {
              dataType = "date";
            } else if (["age", "phone"].includes(mapping.target_field)) {
              dataType = "string"; // Keep phone as string
            } else {
              dataType = "string"; // Default to string
            }
          }

          const value = transformValue(
            row[mapping.source_field],
            dataType,
            mapping.transformation_rule,
          );

          if (value !== null && value !== "") {
            // Check if this field should go into metadata
            if (metadataFields.includes(mapping.target_field)) {
              clientData.metadata[mapping.target_field] = value;
            } else {
              clientData[mapping.target_field] = value;
            }
          }
        }
      }

      // Also store the full address in metadata if we have address components
      if (row["Address Line 1"] || row["Address Line 2"]) {
        clientData.metadata.address_line_1 = row["Address Line 1"] || "";
        clientData.metadata.address_line_2 = row["Address Line 2"] || "";
      }
      if (row["City"]) {
        clientData.metadata.city = row["City"];
      }
      if (row["Postcode"]) {
        clientData.metadata.postcode = row["Postcode"];
      }
      if (row["Country"]) {
        clientData.metadata.country = row["Country"];
      }

      // Ensure required fields
      if (!clientData.email) {
        throw new Error("Email is required");
      }

      // Create client
      console.log(
        `Attempting to insert client ${email} with data:`,
        clientData,
      );

      const { data: newClient, error: insertError } = await supabaseAdmin
        .from("clients")
        .insert(clientData)
        .select()
        .single();

      if (insertError) {
        console.error(`Supabase insert error for ${email}:`, insertError);
        throw new Error(
          `Database insert failed: ${insertError.message || JSON.stringify(insertError)}`,
        );
      }

      console.log(
        `Successfully inserted client ${email} with ID:`,
        newClient?.id,
      );

      // Record success
      await supabaseAdmin.from("migration_records").insert({
        migration_job_id: jobId,
        organization_id: organizationId,
        source_record_id: email,
        record_type: "client",
        source_data: row,
        mapped_data: clientData,
        target_id: newClient.id,
        target_table: "clients",
        status: "success",
        processed_at: new Date().toISOString(),
      });

      successful++;
    } catch (error) {
      failed++;

      // Get detailed error message
      let errorMessage = "Unknown error";
      let errorDetails = {};

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (typeof error === "object" && error !== null) {
        errorMessage = JSON.stringify(error);
        errorDetails = error;
      }

      console.error(`Failed to import client ${email}:`, error);
      console.error("Client data that failed:", clientData);

      // Record failure with detailed error
      await supabaseAdmin.from("migration_records").insert({
        migration_job_id: jobId,
        organization_id: organizationId,
        source_record_id: email,
        record_type: "client",
        source_data: row,
        mapped_data: clientData, // Include the mapped data to see what was attempted
        status: "failed",
        error_message: errorMessage,
        error_details: errorDetails,
      });

      // Log error
      await supabaseAdmin.from("migration_logs").insert({
        migration_job_id: jobId,
        organization_id: organizationId,
        level: "error",
        message: `Failed to import client: ${email}`,
        details: {
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    // Update progress periodically
    if (processed % 10 === 0) {
      await supabaseAdmin
        .from("migration_jobs")
        .update({
          processed_records: processed,
          successful_records: successful,
          failed_records: failed,
        })
        .eq("id", jobId);
    }
  }

  return { processed, successful, failed };
}

async function processPayments(
  data: any[],
  mappings: any[],
  organizationId: string,
  jobId: string,
) {
  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Process each payment row
  for (const row of data) {
    processed++;

    try {
      // Map fields to payment data
      const paymentData: any = {
        organization_id: organizationId,
        created_at: new Date().toISOString(),
      };

      for (const mapping of mappings) {
        if (mapping.source_field && row[mapping.source_field] !== undefined) {
          const value = transformValue(
            row[mapping.source_field],
            mapping.data_type,
            mapping.transformation_rule,
          );

          if (value !== null) {
            paymentData[mapping.target_field] = value;
          }
        }
      }

      // Try to match with existing client
      const emailField = mappings.find(
        (m) => m.target_field === "email",
      )?.source_field;
      if (emailField && row[emailField]) {
        const { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("email", row[emailField])
          .eq("organization_id", organizationId)
          .single();

        if (client) {
          paymentData.client_id = client.id;
        }
      }

      // Create payment record
      const { data: newPayment, error: insertError } = await supabaseAdmin
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      successful++;
    } catch (error) {
      failed++;

      // Log error
      await supabaseAdmin.from("migration_logs").insert({
        migration_job_id: jobId,
        organization_id: organizationId,
        level: "error",
        message: "Failed to import payment",
        details: {
          row,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return { processed, successful, failed };
}

async function processAttendances(
  data: any[],
  mappings: any[],
  organizationId: string,
  jobId: string,
) {
  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Similar to processPayments but for attendance records
  // Implementation would follow the same pattern

  return { processed, successful, failed };
}

function transformValue(
  value: any,
  dataType: string,
  transformationRule?: any,
): any {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (dataType) {
    case "date":
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();

    case "number":
      const num = Number(value);
      return isNaN(num) ? null : num;

    case "boolean":
      const lower = String(value).toLowerCase();
      return ["true", "1", "yes", "y"].includes(lower);

    case "json":
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return value;
      }

    default:
      return String(value).trim();
  }
}
