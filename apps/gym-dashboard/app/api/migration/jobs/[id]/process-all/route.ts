import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

/**
 * POST /api/migration/jobs/[id]/process-all
 * Process all uploaded files (clients, attendance, payments) in one go
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[PROCESS-ALL] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting complete migration processing for job ${jobId}`);

    // Get current user
    const supabase = createAdminClient();
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

    // Get all files for this job
    const supabaseAdmin = createAdminClient();
    const { data: files, error: filesError } = await supabaseAdmin
      .from("migration_files")
      .select("*")
      .eq("migration_job_id", jobId)
      .order("created_at", { ascending: true });

    if (filesError || !files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files found for this job", logs },
        { status: 400 },
      );
    }

    log(`Found ${files.length} files to process`);

    // Categorize files based on content
    const clientFiles: any[] = [];
    const attendanceFiles: any[] = [];
    const paymentFiles: any[] = [];

    for (const file of files) {
      log(`Analyzing file: ${file.file_name}`);

      // Download and peek at file content to determine type
      const supabaseAdminForStorage = createAdminClient();
      const { data: fileData } = await supabaseAdminForStorage.storage
        .from("migrations")
        .download(file.storage_path);

      if (fileData) {
        const csvText = await fileData.text();
        const preview = Papa.parse(csvText, {
          header: true,
          preview: 5, // Just look at first 5 rows
        });

        const headers = Object.keys(preview.data[0] || {}).map((h) =>
          h.toLowerCase(),
        );

        log(`File: ${file.name}, Headers: ${headers.join(", ")}`);
        log(`First row sample: ${JSON.stringify(preview.data[0])}`);

        // Detect file type based on headers
        if (
          headers.some((h) => h.includes("first") && h.includes("name")) ||
          headers.some((h) => h.includes("last") && h.includes("name")) ||
          headers.some((h) => h.includes("phone")) ||
          headers.some((h) => h.includes("address")) ||
          headers.some((h) => h.includes("emergency"))
        ) {
          log(`Detected as CLIENT file based on headers`);
          clientFiles.push({ ...file, csvText });
        } else if (
          headers.some((h) => h.includes("attendance")) ||
          headers.some((h) => h.includes("class") && h.includes("date")) ||
          headers.some((h) => h.includes("booking")) ||
          headers.some((h) => h.includes("attended"))
        ) {
          log(`Detected as ATTENDANCE file based on headers`);
          attendanceFiles.push({ ...file, csvText });
        } else if (
          headers.some((h) => h.includes("payment")) ||
          headers.some((h) => h.includes("amount")) ||
          headers.some((h) => h.includes("transaction")) ||
          headers.some((h) => h.includes("invoice"))
        ) {
          log(`Detected as PAYMENT file based on headers`);
          paymentFiles.push({ ...file, csvText });
        } else {
          // Default to client file if unclear
          log(`Could not determine type, defaulting to CLIENT file`);
          clientFiles.push({ ...file, csvText });
        }
      }
    }

    // Update job status
    const supabaseAdminForJobUpdate = createAdminClient();
    await supabaseAdminForJobUpdate
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    const results = {
      clients: { imported: 0, skipped: 0, errors: 0 },
      attendance: { imported: 0, skipped: 0, errors: 0 },
      payments: { imported: 0, skipped: 0, errors: 0 },
    };

    // Step 1: Process client files first
    if (clientFiles.length > 0) {
      log(`Processing ${clientFiles.length} client files...`);

      for (const file of clientFiles) {
        const parseResult = Papa.parse(file.csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        log(`Parsed ${parseResult.data.length} client records`);

        for (const row of parseResult.data as any[]) {
          try {
            // Map fields flexibly
            const clientData: any = {
              organization_id: userOrg.organization_id,
              source: "goteamup",
              source_id: row.id || `goteamup_${Date.now()}_${Math.random()}`,
            };

            // Name mapping
            if (row["First Name"] && row["Last Name"]) {
              clientData.first_name = row["First Name"];
              clientData.last_name = row["Last Name"];
              clientData.name = `${row["First Name"]} ${row["Last Name"]}`;
            } else if (row.Name) {
              clientData.name = row.Name;
              const parts = row.Name.split(" ");
              clientData.first_name = parts[0];
              clientData.last_name = parts.slice(1).join(" ");
            }

            // Contact info
            clientData.email = row.Email || row["Email Address"] || null;
            clientData.phone =
              row.Phone || row["Phone Number"] || row.Mobile || null;

            // Check for existing client
            if (clientData.email) {
              const supabaseAdminForExisting = createAdminClient();
              const { data: existing } = await supabaseAdminForExisting
                .from("clients")
                .select("id")
                .eq("organization_id", userOrg.organization_id)
                .eq("email", clientData.email)
                .single();

              if (existing) {
                results.clients.skipped++;
                continue;
              }
            }

            // Create client
            const supabaseAdminForClient = createAdminClient();
            const { error: clientError } = await supabaseAdminForClient
              .from("clients")
              .insert(clientData);

            if (clientError) {
              results.clients.errors++;
              log(`Error creating client: ${clientError.message}`);
            } else {
              results.clients.imported++;
            }
          } catch (err: any) {
            results.clients.errors++;
            log(`Error processing client row: ${err.message}`);
          }
        }
      }
    }

    // Step 2: Load all clients for matching attendance/payments
    const supabaseAdminForClients = createAdminClient();
    const { data: allClients } = await supabaseAdminForClients
      .from("clients")
      .select("id, name, first_name, last_name, email, phone")
      .eq("organization_id", userOrg.organization_id);

    const clientByName = new Map();
    const clientByEmail = new Map();
    const clientByPhone = new Map();

    allClients?.forEach((client) => {
      const fullName =
        client.name || `${client.first_name} ${client.last_name}`;
      clientByName.set(fullName.toLowerCase(), client.id);

      if (client.email) {
        clientByEmail.set(client.email.toLowerCase(), client.id);
      }

      if (client.phone) {
        const normalizedPhone = client.phone.replace(/\D/g, "");
        clientByPhone.set(normalizedPhone, client.id);
      }
    });

    // Step 3: Process attendance files
    if (attendanceFiles.length > 0) {
      log(`Processing ${attendanceFiles.length} attendance files...`);

      for (const file of attendanceFiles) {
        const parseResult = Papa.parse(file.csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        log(`Parsed ${parseResult.data.length} attendance records`);

        // Log first row to see headers
        if (parseResult.data.length > 0) {
          log(
            `Sample attendance row headers: ${JSON.stringify(Object.keys(parseResult.data[0]))}`,
          );
        }

        const bookings = [];

        for (const row of parseResult.data as any[]) {
          try {
            // All headers are lowercase due to transformHeader
            const dateValue =
              row.date ||
              row["class date"] ||
              row["attendance date"] ||
              row["booking date"];
            const timeValue =
              row.time || row["class time"] || row["start time"];
            const clientName =
              row["client name"] ||
              row["member name"] ||
              row.name ||
              row.member ||
              row.customer;
            const email = row.email || row["email address"];
            const className =
              row["class name"] || row.activity || row.class || row.service;

            if (!dateValue || !clientName) {
              log(
                `Skipping attendance record: missing date (${dateValue}) or client name (${clientName})`,
              );
              results.attendance.skipped++;
              continue;
            }

            // Match client
            let clientId = null;
            if (email && clientByEmail.has(email.toLowerCase())) {
              clientId = clientByEmail.get(email.toLowerCase());
              log(`Matched client by email: ${email}`);
            } else if (clientByName.has(clientName.toLowerCase())) {
              clientId = clientByName.get(clientName.toLowerCase());
              log(`Matched client by name: ${clientName}`);
            }

            if (!clientId) {
              log(
                `Could not match client: ${clientName} (email: ${email || "none"})`,
              );
              results.attendance.skipped++;
              continue;
            }

            bookings.push({
              client_id: clientId,
              organization_id: userOrg.organization_id,
              booking_date: dateValue,
              booking_time: timeValue || "00:00",
              booking_type: className || "Class",
              booking_status: "attended",
              attended_at: new Date().toISOString(),
              notes: `Imported from migration job ${jobId}`,
              source: "migration",
            });

            results.attendance.imported++;
          } catch (err: any) {
            results.attendance.errors++;
          }
        }

        // Batch insert bookings
        if (bookings.length > 0) {
          const supabaseAdminForBookings = createAdminClient();
          const { error } = await supabaseAdminForBookings
            .from("bookings")
            .insert(bookings);

          if (error) {
            log(`Error inserting bookings: ${error.message}`);
          }
        }
      }
    }

    // Step 4: Process payment files
    if (paymentFiles.length > 0) {
      log(`Processing ${paymentFiles.length} payment files...`);

      for (const file of paymentFiles) {
        const parseResult = Papa.parse(file.csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        const payments = [];

        for (const row of parseResult.data as any[]) {
          try {
            const dateValue =
              row.date || row["payment date"] || row["transaction date"];
            const amountStr =
              row.amount || row["payment amount"] || row.total || row.paid;
            const amount = parseFloat(
              String(amountStr).replace(/[^0-9.-]/g, ""),
            );
            const clientName =
              row["client name"] ||
              row["customer name"] ||
              row.name ||
              row.member;
            const email = row.email || row["email address"];
            const phone = row.phone || row["phone number"] || row.mobile;

            if (!dateValue || !clientName || isNaN(amount)) {
              results.payments.skipped++;
              continue;
            }

            // Match client
            let clientId = null;
            if (email && clientByEmail.has(email.toLowerCase())) {
              clientId = clientByEmail.get(email.toLowerCase());
            } else if (phone) {
              const normalizedPhone = phone.replace(/\D/g, "");
              if (clientByPhone.has(normalizedPhone)) {
                clientId = clientByPhone.get(normalizedPhone);
              }
            }

            if (!clientId && clientByName.has(clientName.toLowerCase())) {
              clientId = clientByName.get(clientName.toLowerCase());
            }

            if (!clientId) {
              results.payments.skipped++;
              continue;
            }

            payments.push({
              client_id: clientId,
              organization_id: userOrg.organization_id,
              amount: amount,
              payment_date: dateValue,
              payment_method: row["payment method"] || row.method || "card",
              payment_status: "completed",
              description:
                row.description || row.notes || `Payment from ${clientName}`,
              metadata: {
                imported_from: "migration",
                migration_job_id: jobId,
              },
            });

            results.payments.imported++;
          } catch (err: any) {
            results.payments.errors++;
          }
        }

        // Batch insert payments
        if (payments.length > 0) {
          const supabaseAdminForPayments = createAdminClient();
          const { error } = await supabaseAdminForPayments
            .from("payments")
            .insert(payments);

          if (error) {
            log(`Error inserting payments: ${error.message}`);
          }
        }
      }
    }

    // Update job as completed
    const supabaseAdminForCompletion = createAdminClient();
    await supabaseAdminForCompletion
      .from("migration_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        successful_records: results.clients.imported,
        total_records: results.clients.imported + results.clients.skipped,
        metadata: {
          clients_imported: results.clients.imported,
          attendance_imported: results.attendance.imported,
          payments_imported: results.payments.imported,
          processing_complete: true,
        },
      })
      .eq("id", jobId);

    log(`Migration complete!`);

    return NextResponse.json({
      success: true,
      logs,
      results,
    });
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);

    const supabaseAdminForError = createAdminClient();
    await supabaseAdminForError
      .from("migration_jobs")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

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
