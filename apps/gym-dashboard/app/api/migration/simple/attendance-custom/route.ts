import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { organizationId, fileName, nameColumn, emailColumn, dateColumn } =
      await request.json();

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

    let imported = 0;
    let skipped = 0;
    const bookingsToInsert = [];
    const unmatchedSamples = [];

    console.log(
      `Using columns: Name='${nameColumn}', Email='${emailColumn}', Date='${dateColumn}'`,
    );

    for (const row of parseResult.data as any[]) {
      try {
        // Use specified columns
        const name = nameColumn ? row[nameColumn] : null;
        const email = emailColumn ? row[emailColumn] : null;
        const date = dateColumn ? row[dateColumn] : null;

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
          // Collect samples of unmatched records
          if (unmatchedSamples.length < 5) {
            unmatchedSamples.push({ name, email, row });
          }
          continue;
        }

        // Get class/activity name (try various columns)
        const className =
          row.Class ||
          row.Activity ||
          row.Service ||
          row.Type ||
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
      for (let i = 0; i < bookingsToInsert.length; i += 100) {
        const chunk = bookingsToInsert.slice(i, i + 100);
        const { error: insertError } = await supabaseAdmin
          .from("bookings")
          .insert(chunk);

        if (insertError) {
          console.error("Insert error:", insertError);
        } else {
          imported += chunk.length;
        }
      }
    }

    // Log unmatched samples for debugging
    if (unmatchedSamples.length > 0) {
      console.log("Sample unmatched records:", unmatchedSamples);
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: parseResult.data.length,
      unmatchedSamples,
      message:
        imported > 0
          ? `Successfully imported ${imported} attendance records`
          : `No records matched. Sample unmatched: ${JSON.stringify(unmatchedSamples[0])}`,
    });
  } catch (error: any) {
    console.error("Custom attendance import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Import failed",
    });
  }
}
