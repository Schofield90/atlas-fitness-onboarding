import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

/**
 * POST /api/migration/jobs/[id]/import-attendance
 * Import attendance data and match to existing clients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[IMPORT-ATTENDANCE] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting attendance import for job ${jobId}`);

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", logs },
        { status: 401 },
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { success: false, error: "User organization not found", logs },
        { status: 401 },
      );
    }

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
      .eq("organization_id", userOrg.organization_id);

    // Create lookup maps
    const clientByName = new Map();
    const clientByEmail = new Map();

    clients?.forEach((client) => {
      // Name variations for matching
      const fullName = client.name || `${client.first_name} ${client.last_name}`;
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
          row.status || 
          row["attendance status"] || 
          row.attended ||
          "attended";

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
          organization_id: userOrg.organization_id,
          booking_date: dateValue,
          booking_time: timeValue || "00:00",
          booking_type: className || "Class",
          booking_status: status.toLowerCase().includes("cancel") ? "cancelled" : "attended",
          attended_at: status.toLowerCase().includes("attend") ? new Date().toISOString() : null,
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

    // Insert bookings in batches
    const batchSize = 50;
    for (let i = 0; i < bookings.length; i += batchSize) {
      const batch = bookings.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from("bookings")
        .insert(batch);

      if (error) {
        log(`Batch insert error: ${error.message}`);
      }
    }

    log(`Import complete - Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

    // Update migration job with attendance import status
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          attendance_imported: true,
          attendance_count: successCount,
          attendance_import_date: new Date().toISOString(),
        },
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        total: parseResult.data.length,
        imported: successCount,
        skipped: skipCount,
        errors: errorCount,
      },
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