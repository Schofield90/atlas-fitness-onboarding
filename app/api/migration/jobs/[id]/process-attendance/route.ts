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
    // Get job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("migration_jobs")
      .select("organization_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({
        success: false,
        error: "Migration job not found",
      });
    }

    const organizationId = job.organization_id;

    // Get all clients for this organization for matching
    const { data: allClients, error: clientsError } = await supabaseAdmin
      .from("clients")
      .select("id, name, first_name, last_name, email, phone")
      .eq("organization_id", organizationId);

    if (clientsError || !allClients) {
      return NextResponse.json({
        success: false,
        error: "Failed to load clients for matching",
      });
    }

    // Create multiple lookup maps for flexible matching
    const clientByEmail = new Map();
    const clientByFullName = new Map();
    const clientByFirstLast = new Map();
    const clientByLastFirst = new Map();
    const clientByPhone = new Map();
    const clientByPartialName = new Map();

    allClients.forEach((client) => {
      // Email matching (most reliable)
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase().trim(), client.id);
      }

      // Full name matching
      if (client.name) {
        clientByFullName.set(client.name.toLowerCase().trim(), client.id);
        // Also store partial matches
        const nameParts = client.name.toLowerCase().split(/\s+/);
        nameParts.forEach((part) => {
          if (part.length > 2) {
            if (!clientByPartialName.has(part)) {
              clientByPartialName.set(part, []);
            }
            clientByPartialName.get(part).push(client.id);
          }
        });
      }

      // First + Last name matching
      if (client.first_name && client.last_name) {
        const firstLast = `${client.first_name} ${client.last_name}`
          .toLowerCase()
          .trim();
        const lastFirst = `${client.last_name}, ${client.first_name}`
          .toLowerCase()
          .trim();
        const lastFirstSpace = `${client.last_name} ${client.first_name}`
          .toLowerCase()
          .trim();

        clientByFirstLast.set(firstLast, client.id);
        clientByLastFirst.set(lastFirst, client.id);
        clientByLastFirst.set(lastFirstSpace, client.id);
      }

      // Phone matching (normalize to digits only)
      if (client.phone) {
        const normalizedPhone = client.phone.replace(/\D/g, "");
        if (normalizedPhone.length >= 10) {
          clientByPhone.set(normalizedPhone, client.id);
          // Also store last 10 digits (in case of country codes)
          if (normalizedPhone.length > 10) {
            clientByPhone.set(normalizedPhone.slice(-10), client.id);
          }
        }
      }
    });

    // Get attendance files for this job
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
      imported: 0,
      skipped: 0,
      matched_by_email: 0,
      matched_by_name: 0,
      matched_by_phone: 0,
      matched_by_partial: 0,
      no_match: 0,
      errors: 0,
      unmatchedNames: [] as string[],
    };

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

        // Check if this looks like an attendance file
        const headers = Object.keys(parseResult.data[0] || {});
        const lowerHeaders = headers.map((h) => h.toLowerCase());

        const hasAttendanceIndicators =
          lowerHeaders.some((h) => h.includes("date")) ||
          lowerHeaders.some((h) => h.includes("class")) ||
          lowerHeaders.some((h) => h.includes("attendance")) ||
          lowerHeaders.some((h) => h.includes("booking"));

        if (!hasAttendanceIndicators) {
          console.log(`Skipping non-attendance file: ${file.file_name}`);
          continue;
        }

        console.log(`Processing attendance file: ${file.file_name}`);
        console.log(`Headers found: ${headers.join(", ")}`);

        const bookingsToInsert = [];

        for (const row of parseResult.data as any[]) {
          try {
            // Try to find client name in various fields
            const possibleNameFields = [
              "Name",
              "name",
              "Client Name",
              "client name",
              "Member Name",
              "member name",
              "Customer",
              "customer",
              "Client",
              "client",
              "Member",
              "member",
              "Full Name",
              "full name",
              "Attendee",
              "attendee",
              "Person",
              "person",
            ];

            let clientName = null;
            for (const field of possibleNameFields) {
              if (row[field] && row[field].trim()) {
                clientName = row[field].trim();
                break;
              }
            }

            // Try to find email
            const possibleEmailFields = [
              "Email",
              "email",
              "Email Address",
              "email address",
              "E-mail",
              "e-mail",
              "Mail",
              "mail",
            ];

            let email = null;
            for (const field of possibleEmailFields) {
              if (row[field] && row[field].trim()) {
                email = row[field].trim();
                break;
              }
            }

            // Try to find phone
            const possiblePhoneFields = [
              "Phone",
              "phone",
              "Phone Number",
              "phone number",
              "Mobile",
              "mobile",
              "Cell",
              "cell",
              "Telephone",
              "telephone",
            ];

            let phone = null;
            for (const field of possiblePhoneFields) {
              if (row[field] && row[field].trim()) {
                phone = row[field].trim();
                break;
              }
            }

            // Try to find date
            const possibleDateFields = [
              "Date",
              "date",
              "Class Date",
              "class date",
              "Attendance Date",
              "attendance date",
              "Booking Date",
              "booking date",
              "Session Date",
              "session date",
              "Event Date",
              "event date",
            ];

            let date = null;
            for (const field of possibleDateFields) {
              if (row[field] && row[field].trim()) {
                date = row[field].trim();
                break;
              }
            }

            // Try to find class/activity name
            const possibleClassFields = [
              "Class",
              "class",
              "Class Name",
              "class name",
              "Activity",
              "activity",
              "Service",
              "service",
              "Session",
              "session",
              "Event",
              "event",
              "Type",
              "type",
              "Program",
              "program",
            ];

            let className = null;
            for (const field of possibleClassFields) {
              if (row[field] && row[field].trim()) {
                className = row[field].trim();
                break;
              }
            }

            if (!date) {
              results.skipped++;
              continue;
            }

            // Try to match client using multiple strategies
            let clientId = null;
            let matchMethod = null;

            // 1. Try email match (most reliable)
            if (email && clientByEmail.has(email.toLowerCase().trim())) {
              clientId = clientByEmail.get(email.toLowerCase().trim());
              matchMethod = "email";
              results.matched_by_email++;
            }

            // 2. Try exact name matches
            if (!clientId && clientName) {
              const nameLower = clientName.toLowerCase().trim();

              // Try exact full name
              if (clientByFullName.has(nameLower)) {
                clientId = clientByFullName.get(nameLower);
                matchMethod = "full_name";
                results.matched_by_name++;
              }
              // Try first last format
              else if (clientByFirstLast.has(nameLower)) {
                clientId = clientByFirstLast.get(nameLower);
                matchMethod = "first_last";
                results.matched_by_name++;
              }
              // Try last, first format
              else if (clientByLastFirst.has(nameLower)) {
                clientId = clientByLastFirst.get(nameLower);
                matchMethod = "last_first";
                results.matched_by_name++;
              }
            }

            // 3. Try phone match
            if (!clientId && phone) {
              const normalizedPhone = phone.replace(/\D/g, "");
              if (normalizedPhone.length >= 10) {
                const last10 = normalizedPhone.slice(-10);
                if (clientByPhone.has(last10)) {
                  clientId = clientByPhone.get(last10);
                  matchMethod = "phone";
                  results.matched_by_phone++;
                } else if (clientByPhone.has(normalizedPhone)) {
                  clientId = clientByPhone.get(normalizedPhone);
                  matchMethod = "phone";
                  results.matched_by_phone++;
                }
              }
            }

            // 4. Try partial name matching as last resort
            if (!clientId && clientName) {
              const nameParts = clientName.toLowerCase().split(/\s+/);
              for (const part of nameParts) {
                if (part.length > 2 && clientByPartialName.has(part)) {
                  const candidates = clientByPartialName.get(part);
                  // If only one candidate with this partial match, use it
                  if (candidates.length === 1) {
                    clientId = candidates[0];
                    matchMethod = "partial";
                    results.matched_by_partial++;
                    break;
                  }
                }
              }
            }

            if (!clientId) {
              results.no_match++;
              if (clientName && !results.unmatchedNames.includes(clientName)) {
                results.unmatchedNames.push(clientName);
              }
              continue;
            }

            // Create booking record
            bookingsToInsert.push({
              client_id: clientId,
              organization_id: organizationId,
              booking_date: date,
              booking_type: className || "Class",
              booking_status: "attended",
              source: "migration",
              notes: `Imported from attendance file. Match method: ${matchMethod}`,
              created_at: new Date().toISOString(),
            });

            results.imported++;
          } catch (err: any) {
            console.error("Error processing attendance row:", err);
            results.errors++;
          }
        }

        // Batch insert bookings
        if (bookingsToInsert.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from("bookings")
            .insert(bookingsToInsert);

          if (insertError) {
            console.error("Error inserting bookings:", insertError);
            results.errors += bookingsToInsert.length;
            results.imported -= bookingsToInsert.length;
          }
        }
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }

    // Update job metadata with results
    const { data: currentJob } = await supabaseAdmin
      .from("migration_jobs")
      .select("metadata")
      .eq("id", jobId)
      .single();

    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          ...currentJob?.metadata,
          attendance_imported: results.imported,
          attendance_processing_complete: true,
          attendance_match_stats: {
            by_email: results.matched_by_email,
            by_name: results.matched_by_name,
            by_phone: results.matched_by_phone,
            by_partial: results.matched_by_partial,
            no_match: results.no_match,
          },
        },
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} attendance records`,
      unmatchedSample: results.unmatchedNames.slice(0, 10),
    });
  } catch (error: any) {
    console.error("Process attendance error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Processing failed",
    });
  }
}
