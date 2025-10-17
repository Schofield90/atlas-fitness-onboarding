import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/migration/jobs/[id]/import-payments
 * Import payment data and match to existing clients
 * Requires x-import-token header for authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[IMPORT-PAYMENTS] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting payment import for job ${jobId}`);

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

    log(`Parsed ${parseResult.data.length} payment records`);

    // Load existing clients for matching
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, name, first_name, last_name, email, phone")
      .eq("organization_id", organizationId);

    // Create lookup maps
    const clientByName = new Map();
    const clientByEmail = new Map();
    const clientByPhone = new Map();

    clients?.forEach((client) => {
      // Name variations for matching
      const fullName =
        client.name || `${client.first_name} ${client.last_name}`;
      clientByName.set(fullName.toLowerCase(), client.id);

      if (client.email) {
        clientByEmail.set(client.email.toLowerCase(), client.id);
      }

      if (client.phone) {
        // Normalize phone number (remove non-digits)
        const normalizedPhone = client.phone.replace(/\D/g, "");
        clientByPhone.set(normalizedPhone, client.id);
      }
    });

    log(`Loaded ${clients?.length || 0} clients for matching`);

    // Process payment records
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const payments = [];

    for (const row of parseResult.data as any[]) {
      try {
        // Find date column (flexible matching)
        const dateValue =
          row.date ||
          row["payment date"] ||
          row["transaction date"] ||
          row["paid date"] ||
          row.when;

        // Find amount
        const amountStr =
          row.amount ||
          row["payment amount"] ||
          row.total ||
          row.paid ||
          row.value;

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, ""));

        // Find client name
        const clientName =
          row["client name"] ||
          row["customer name"] ||
          row["member name"] ||
          row.name ||
          row.customer ||
          row.member;

        // Find email
        const email = row.email || row["email address"];

        // Find phone
        const phone = row.phone || row["phone number"] || row.mobile;

        // Find payment method
        const method =
          row["payment method"] ||
          row.method ||
          row.type ||
          row["payment type"] ||
          "card";

        // Find description
        const description =
          row.description ||
          row.notes ||
          row.reference ||
          row.details ||
          row.memo ||
          "";

        // Find status
        const status = row.status || row["payment status"] || "completed";

        if (!dateValue || !clientName || isNaN(amount)) {
          skipCount++;
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
          log(`Could not match client: ${clientName}`);
          skipCount++;
          continue;
        }

        // Create payment record
        payments.push({
          client_id: clientId,
          organization_id: organizationId,
          amount: amount,
          payment_date: dateValue,
          payment_method: method.toLowerCase(),
          payment_status:
            status.toLowerCase() === "failed"
              ? "failed"
              : status.toLowerCase() === "pending"
                ? "pending"
                : "completed",
          description: description || `Payment from ${clientName}`,
          metadata: {
            imported_from: "migration",
            migration_job_id: jobId,
            original_data: row,
          },
          created_at: new Date().toISOString(),
        });

        successCount++;
      } catch (err: any) {
        errorCount++;
        log(`Error processing row: ${err.message}`);
      }
    }

    // Insert payments in batches to handle large datasets
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { error, data } = await supabaseAdmin
        .from("payments")
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
          `Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} payments`,
        );
      }
    }

    log(`Total payments inserted: ${totalInserted}`);

    log(
      `Import complete - Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`,
    );

    // Update migration job with payment import status
    const { error: updateError } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          payments_imported: true,
          payments_count: totalInserted,
          payments_errors: errorCount,
          payments_import_date: new Date().toISOString(),
        },
        status: totalInserted > 0 ? "completed" : "failed",
      })
      .eq("id", jobId);

    if (updateError) {
      log(`Failed to update job status: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        total: parseResult.data.length,
        imported: totalInserted,
        skipped: skipCount,
        errors: errorCount,
        batches: Math.ceil(payments.length / batchSize),
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
