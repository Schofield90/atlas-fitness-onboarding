import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { organizationId, migrationJobId, fileName } = await request.json();
    const supabaseAdmin = createAdminClient();

    // Get all clients for matching
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
      // Email lookup
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase().trim(), client.id);
      }

      // Name lookups (multiple formats)
      if (client.name) {
        clientByName.set(client.name.toLowerCase().trim(), client.id);
      }

      if (client.first_name && client.last_name) {
        const fullName = `${client.first_name} ${client.last_name}`
          .toLowerCase()
          .trim();
        clientByName.set(fullName, client.id);

        // Also try last, first
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

    let imported = 0;
    let skipped = 0;
    const bookingsToInsert = [];

    for (const row of parseResult.data as any[]) {
      try {
        // Find client identifier (email or name)
        const email =
          row.Email ||
          row.email ||
          row["Email Address"] ||
          row["Client Email"] ||
          null;

        const name =
          row.Name ||
          row.name ||
          row["Client Name"] ||
          row["Member Name"] ||
          row.Client ||
          row.Member ||
          row.Customer ||
          row["Full Name"] ||
          null;

        // Find date
        const date =
          row.Date ||
          row.date ||
          row["Class Date"] ||
          row["Attendance Date"] ||
          row["Booking Date"] ||
          row["Session Date"] ||
          null;

        if (!date) {
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
          "General Class";

        // Prepare booking record
        bookingsToInsert.push({
          client_id: clientId,
          organization_id: organizationId,
          booking_date: date,
          booking_type: className,
          booking_status: "attended",
          source: "csv_import",
          created_at: new Date().toISOString(),
        });

        imported++;
      } catch (err) {
        console.error("Row error:", err);
        skipped++;
      }
    }

    // Batch insert bookings
    if (bookingsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("bookings")
        .insert(bookingsToInsert);

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({
          success: false,
          error: "Failed to insert bookings",
        });
      }
    }

    // Update job metadata
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          attendance_imported: imported,
          attendance_skipped: skipped,
          attendance_complete: true,
        },
      })
      .eq("id", migrationJobId);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: parseResult.data.length,
    });
  } catch (error: any) {
    console.error("Attendance import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Import failed",
    });
  }
}
