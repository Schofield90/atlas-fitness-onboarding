import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

const BATCH_SIZE = 500; // Process 500 records at a time

export async function POST(request: NextRequest) {
  try {
    const {
      organizationId,
      migrationJobId,
      fileName,
      offset = 0,
    } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all clients for matching (cache this)
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id, email, name, first_name, last_name")
      .eq("organization_id", organizationId);

    if (clientsError || !clients || clients.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No clients found. Please import clients first.",
      });
    }

    // Create lookup maps
    const clientByEmail = new Map();
    const clientByName = new Map();

    clients.forEach((client) => {
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase().trim(), client.id);
      }
      if (client.name) {
        clientByName.set(client.name.toLowerCase().trim(), client.id);
      }
      if (client.first_name && client.last_name) {
        const fullName = `${client.first_name} ${client.last_name}`
          .toLowerCase()
          .trim();
        clientByName.set(fullName, client.id);
        const lastFirst = `${client.last_name}, ${client.first_name}`
          .toLowerCase()
          .trim();
        clientByName.set(lastFirst, client.id);
      }
    });

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("migrations")
      .download(fileName);

    if (downloadError || !fileData) {
      return NextResponse.json({
        success: false,
        error: "Failed to download file",
      });
    }

    const csvText = await fileData.text();
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data found in CSV",
      });
    }

    // Process only a batch of records
    const totalRecords = parseResult.data.length;
    const startIdx = offset;
    const endIdx = Math.min(offset + BATCH_SIZE, totalRecords);
    const batchData = parseResult.data.slice(startIdx, endIdx);

    let imported = 0;
    let skipped = 0;
    const bookingsToInsert = [];

    console.log(
      `Processing batch: ${startIdx} to ${endIdx} of ${totalRecords} total records`,
    );

    // Log the first row's keys to understand the CSV structure
    if (startIdx === 0 && batchData.length > 0) {
      console.log("CSV Column Headers:", Object.keys(batchData[0]));
      console.log("First row data:", batchData[0]);
    }

    for (const row of batchData as any[]) {
      try {
        // Find client identifier (try multiple field names - case insensitive)
        const findField = (fieldNames: string[]) => {
          for (const key of Object.keys(row)) {
            for (const fieldName of fieldNames) {
              if (key.toLowerCase().includes(fieldName.toLowerCase())) {
                return row[key];
              }
            }
          }
          return null;
        };

        const email =
          findField(["email", "e-mail", "mail"]) ||
          row.Email ||
          row.email ||
          row["Email Address"] ||
          row["Client Email"] ||
          row["Member Email"] ||
          null;

        // Try to find name from various possible columns
        let name =
          findField([
            "name",
            "client",
            "member",
            "customer",
            "person",
            "user",
            "student",
            "participant",
          ]) ||
          row.Name ||
          row.name ||
          row["Client Name"] ||
          row["Member Name"] ||
          row.Client ||
          row.Member ||
          row.Customer ||
          row["Full Name"] ||
          (row["First Name"] && row["Last Name"])
            ? `${row["First Name"]} ${row["Last Name"]}`
            : null;

        // If still no name, try the first non-date column that contains text
        if (!name) {
          for (const key of Object.keys(row)) {
            const value = row[key];
            if (value && typeof value === "string" && value.length > 2) {
              // Check if it's not a date and not a number
              if (
                !value.match(/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/) &&
                !value.match(/^\d+(\.\d+)?$/) &&
                !key.toLowerCase().includes("date") &&
                !key.toLowerCase().includes("time")
              ) {
                name = value;
                console.log(`Using column '${key}' as name field: ${value}`);
                break;
              }
            }
          }
        }

        // Find date (try multiple field names)
        const date =
          row.Date ||
          row.date ||
          row["Class Date"] ||
          row["Attendance Date"] ||
          row["Booking Date"] ||
          row["Session Date"] ||
          row["Visit Date"] ||
          null;

        if (!date) {
          console.log("Skipped: No date found in row");
          skipped++;
          continue;
        }

        // Try to match client
        let clientId = null;

        // Try email first (most reliable)
        if (email && clientByEmail.has(email.toLowerCase().trim())) {
          clientId = clientByEmail.get(email.toLowerCase().trim());
        }
        // Then try name
        else if (name && clientByName.has(name.toLowerCase().trim())) {
          clientId = clientByName.get(name.toLowerCase().trim());
        }

        if (!clientId) {
          console.log(`Skipped: No matching client for ${name || email}`);
          skipped++;
          continue;
        }

        // Get class/activity name
        const className =
          row.Class ||
          row.class ||
          row["Class Name"] ||
          row.Activity ||
          row.Service ||
          row.Type ||
          row.Program ||
          row["Session Type"] ||
          "General Class";

        // Create booking record
        bookingsToInsert.push({
          client_id: clientId,
          organization_id: organizationId,
          booking_date: date,
          booking_type: className,
          booking_status: "attended",
          source: "csv_import",
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Row error:", err);
        skipped++;
      }
    }

    // Batch insert bookings
    if (bookingsToInsert.length > 0) {
      // Insert in smaller chunks to avoid database limits
      const insertChunks = [];
      for (let i = 0; i < bookingsToInsert.length; i += 100) {
        insertChunks.push(bookingsToInsert.slice(i, i + 100));
      }

      for (const chunk of insertChunks) {
        const { error: insertError } = await supabaseAdmin
          .from("bookings")
          .insert(chunk);

        if (insertError) {
          console.error("Insert error:", insertError);
          // Continue with other chunks even if one fails
        } else {
          imported += chunk.length;
        }
      }
    }

    // Check if there are more records to process
    const hasMore = endIdx < totalRecords;
    const progress = Math.round((endIdx / totalRecords) * 100);

    // Get existing metadata to accumulate counts
    const { data: jobData } = await supabaseAdmin
      .from("migration_jobs")
      .select("metadata")
      .eq("id", migrationJobId)
      .single();

    const previousImported = jobData?.metadata?.attendance_imported || 0;
    const previousSkipped = jobData?.metadata?.attendance_skipped || 0;

    // Update job metadata with accumulated progress
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          attendance_imported: previousImported + imported,
          attendance_skipped: previousSkipped + skipped,
          attendance_progress: progress,
          attendance_total: totalRecords,
          attendance_offset: endIdx,
          attendance_complete: !hasMore,
        },
      })
      .eq("id", migrationJobId);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: batchData.length,
      progress,
      hasMore,
      nextOffset: hasMore ? endIdx : null,
      totalRecords,
      message: hasMore
        ? `Processed ${endIdx} of ${totalRecords} records (${progress}%)`
        : `Import complete! Processed all ${totalRecords} records`,
    });
  } catch (error: any) {
    console.error("Attendance batch import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Import failed",
    });
  }
}
