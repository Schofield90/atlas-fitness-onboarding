import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { supabaseAdmin } from "@/app/lib/supabase/admin";
import Papa from "papaparse";

/**
 * POST /api/migration/jobs/[id]/import-payments
 * Import payment data and match to existing clients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const jobId = params.id;
  const logs: string[] = [];

  const log = (message: string) => {
    console.log(`[IMPORT-PAYMENTS] ${message}`);
    logs.push(`${new Date().toISOString()}: ${message}`);
  };

  try {
    log(`Starting payment import for job ${jobId}`);

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

    log(`Parsed ${parseResult.data.length} payment records`);

    // Load existing clients for matching
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, name, first_name, last_name, email, phone")
      .eq("organization_id", userOrg.organization_id);

    // Create lookup maps
    const clientByName = new Map();
    const clientByEmail = new Map();
    const clientByPhone = new Map();

    clients?.forEach((client) => {
      // Name variations for matching
      const fullName = client.name || `${client.first_name} ${client.last_name}`;
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
        const status = 
          row.status || 
          row["payment status"] ||
          "completed";

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
          organization_id: userOrg.organization_id,
          amount: amount,
          payment_date: dateValue,
          payment_method: method.toLowerCase(),
          payment_status: status.toLowerCase() === "failed" ? "failed" : 
                         status.toLowerCase() === "pending" ? "pending" : "completed",
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

    // Insert payments in batches
    const batchSize = 50;
    for (let i = 0; i < payments.length; i += batchSize) {
      const batch = payments.slice(i, i + batchSize);
      const { error } = await supabaseAdmin
        .from("payments")
        .insert(batch);

      if (error) {
        log(`Batch insert error: ${error.message}`);
      }
    }

    log(`Import complete - Success: ${successCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);

    // Update migration job with payment import status
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          payments_imported: true,
          payments_count: successCount,
          payments_import_date: new Date().toISOString(),
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