import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const supabaseAdmin = createAdminClient();

  try {
    // Get the migration files
    const { data: files, error: filesError } = await supabaseAdmin
      .from("migration_files")
      .select("*")
      .eq("migration_job_id", jobId);

    if (filesError || !files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No files found for this migration job",
      });
    }

    const results = {
      clients: { imported: 0, skipped: 0, errors: 0 },
      attendance: { imported: 0, skipped: 0, errors: 0 },
      payments: { imported: 0, skipped: 0, errors: 0 },
    };

    // Get organization ID from the job
    const { data: job } = await supabaseAdmin
      .from("migration_jobs")
      .select("organization_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      return NextResponse.json({
        success: false,
        error: "Migration job not found",
      });
    }

    const organizationId = job.organization_id;

    // Process each file
    for (const file of files) {
      try {
        // Download file from storage
        const { data: fileData, error: downloadError } =
          await supabaseAdmin.storage
            .from("migrations")
            .download(file.storage_path);

        if (downloadError || !fileData) {
          console.error("Failed to download file:", file.file_name);
          continue;
        }

        const csvText = await fileData.text();
        const parseResult = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        if (!parseResult.data || parseResult.data.length === 0) {
          continue;
        }

        // Get headers to detect file type
        const headers = Object.keys(parseResult.data[0] || {}).map((h) =>
          h.toLowerCase(),
        );

        // Detect file type
        const isClients = headers.some(
          (h) =>
            (h.includes("first") && h.includes("name")) ||
            (h.includes("email") && h.includes("phone")),
        );

        const isAttendance = headers.some(
          (h) =>
            h.includes("attendance") ||
            h.includes("class") ||
            h.includes("booking"),
        );

        if (isClients) {
          // Process clients - simplified version
          for (const row of parseResult.data as any[]) {
            try {
              const email = row.Email || row.email || row["Email Address"];
              const firstName = row["First Name"] || row.first_name || "";
              const lastName = row["Last Name"] || row.last_name || "";

              if (!email) {
                results.clients.skipped++;
                continue;
              }

              // Check if client exists
              const { data: existing } = await supabaseAdmin
                .from("clients")
                .select("id")
                .eq("organization_id", organizationId)
                .eq("email", email)
                .single();

              if (existing) {
                results.clients.skipped++;
                continue;
              }

              // Insert client
              const { error } = await supabaseAdmin.from("clients").insert({
                organization_id: organizationId,
                email,
                first_name: firstName,
                last_name: lastName,
                name: `${firstName} ${lastName}`.trim() || email,
                phone: row.Phone || row.phone || row["Phone Number"] || null,
                source: "goteamup",
              });

              if (error) {
                results.clients.errors++;
              } else {
                results.clients.imported++;
              }
            } catch (err) {
              results.clients.errors++;
            }
          }
        } else if (isAttendance) {
          // Process attendance - simplified version
          // First, get all clients for matching
          const { data: clients } = await supabaseAdmin
            .from("clients")
            .select("id, email, name")
            .eq("organization_id", organizationId);

          if (!clients) continue;

          const clientMap = new Map();
          clients.forEach((c) => {
            if (c.email) clientMap.set(c.email.toLowerCase(), c.id);
            if (c.name) clientMap.set(c.name.toLowerCase(), c.id);
          });

          for (const row of parseResult.data as any[]) {
            try {
              const email = row.Email || row.email || row["Email Address"];
              const name =
                row.Name ||
                row.name ||
                row["Client Name"] ||
                row["Member Name"];
              const date =
                row.Date ||
                row.date ||
                row["Class Date"] ||
                row["Attendance Date"];

              if (!date) {
                results.attendance.skipped++;
                continue;
              }

              // Try to match client
              let clientId = null;
              if (email) clientId = clientMap.get(email.toLowerCase());
              if (!clientId && name)
                clientId = clientMap.get(name.toLowerCase());

              if (!clientId) {
                results.attendance.skipped++;
                continue;
              }

              // Insert booking/attendance
              const { error } = await supabaseAdmin.from("bookings").insert({
                client_id: clientId,
                organization_id: organizationId,
                booking_date: date,
                booking_type: row.Class || row.Activity || "Class",
                booking_status: "attended",
                source: "migration",
              });

              if (error) {
                results.attendance.errors++;
              } else {
                results.attendance.imported++;
              }
            } catch (err) {
              results.attendance.errors++;
            }
          }
        }
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }

    // Update job status
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Process error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Processing failed",
    });
  }
}
