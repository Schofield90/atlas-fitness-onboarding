import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const { organizationId, migrationJobId, fileName } = await request.json();
    const supabaseAdmin = createAdminClient();

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

    for (const row of parseResult.data as any[]) {
      try {
        // Try to find email in various fields
        const email =
          row.Email ||
          row.email ||
          row["Email Address"] ||
          row["E-mail"] ||
          row["e-mail"] ||
          null;

        // Skip if no email
        if (!email) {
          skipped++;
          continue;
        }

        // Check if client already exists
        const { data: existing } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("email", email)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Get name fields
        const firstName =
          row["First Name"] ||
          row.first_name ||
          row.FirstName ||
          row.firstname ||
          row.First ||
          "";

        const lastName =
          row["Last Name"] ||
          row.last_name ||
          row.LastName ||
          row.lastname ||
          row.Last ||
          "";

        const fullName =
          row.Name ||
          row.name ||
          row["Full Name"] ||
          `${firstName} ${lastName}`.trim() ||
          email;

        // Get phone
        const phone =
          row.Phone ||
          row.phone ||
          row["Phone Number"] ||
          row.Mobile ||
          row.mobile ||
          row.Cell ||
          null;

        // Insert client
        const { error: insertError } = await supabaseAdmin
          .from("clients")
          .insert({
            organization_id: organizationId,
            email,
            first_name: firstName,
            last_name: lastName,
            name: fullName,
            phone,
            source: "csv_import",
            created_at: new Date().toISOString(),
          });

        if (!insertError) {
          imported++;
        } else {
          console.error("Insert error:", insertError);
          skipped++;
        }
      } catch (err) {
        console.error("Row error:", err);
        skipped++;
      }
    }

    // Update job metadata
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          clients_imported: imported,
          clients_skipped: skipped,
          clients_complete: true,
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
    console.error("Client import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Import failed",
    });
  }
}
