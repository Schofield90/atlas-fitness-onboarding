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
    const paymentsToInsert = [];

    for (const row of parseResult.data as any[]) {
      try {
        // Find client identifier
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
          row["Customer Name"] ||
          row.Client ||
          row.Customer ||
          null;

        // Find amount
        const amountStr =
          row.Amount ||
          row.amount ||
          row["Payment Amount"] ||
          row.Total ||
          row.Paid ||
          row.Payment ||
          null;

        if (!amountStr) {
          skipped++;
          continue;
        }

        const amount = parseFloat(String(amountStr).replace(/[^0-9.-]/g, ""));
        if (isNaN(amount)) {
          skipped++;
          continue;
        }

        // Find date
        const date =
          row.Date ||
          row.date ||
          row["Payment Date"] ||
          row["Transaction Date"] ||
          row["Paid Date"] ||
          null;

        if (!date) {
          skipped++;
          continue;
        }

        // Try to match client using multiple strategies
        let clientId = null;

        // Strategy 1: Email match (exact)
        if (email && clientByEmail.has(email.toLowerCase().trim())) {
          clientId = clientByEmail.get(email.toLowerCase().trim());
        }

        // Strategy 2: Name match (exact)
        if (!clientId && name && clientByName.has(name.toLowerCase().trim())) {
          clientId = clientByName.get(name.toLowerCase().trim());
        }

        // Strategy 3: Fuzzy name match
        if (!clientId && name) {
          const normalizedName = name.toLowerCase().trim().replace(/\s+/g, " ");

          // Check if any client name contains this name or vice versa
          for (const [clientName, id] of clientByName) {
            if (
              clientName.includes(normalizedName) ||
              normalizedName.includes(clientName)
            ) {
              clientId = id;
              break;
            }
          }

          // Strategy 4: Name parts matching
          if (!clientId) {
            const nameParts = normalizedName.split(" ");
            for (const [clientName, id] of clientByName) {
              const clientParts = clientName.split(" ");
              let matchCount = 0;

              for (const part of nameParts) {
                if (part.length > 2 && clientParts.includes(part)) {
                  matchCount++;
                }
              }

              // If we match at least 2 parts or 1 part for single-word names
              if (
                matchCount >= 2 ||
                (matchCount === 1 && nameParts.length === 1)
              ) {
                clientId = id;
                console.log(
                  `Matched payment for "${name}" to client "${clientName}" via name parts`,
                );
                break;
              }
            }
          }
        }

        if (!clientId) {
          // Log what we couldn't match for debugging
          console.log(
            `Could not match payment - Name: "${name}", Email: "${email}"`,
          );
          skipped++;
          continue;
        }

        // Get payment method
        const method =
          row["Payment Method"] ||
          row.Method ||
          row.Type ||
          row["Payment Type"] ||
          "card";

        // Get description
        const description =
          row.Description ||
          row.Notes ||
          row.Reference ||
          row.Memo ||
          `Payment from ${name || email}`;

        // Prepare payment record
        paymentsToInsert.push({
          client_id: clientId,
          organization_id: organizationId,
          amount: amount,
          payment_date: date,
          payment_method: method.toLowerCase(),
          payment_status: "completed",
          description,
          metadata: {
            source: "csv_import",
            migration_job_id: migrationJobId,
          },
          created_at: new Date().toISOString(),
        });

        imported++;
      } catch (err) {
        console.error("Row error:", err);
        skipped++;
      }
    }

    // Batch insert payments
    if (paymentsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("payments")
        .insert(paymentsToInsert);

      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({
          success: false,
          error: "Failed to insert payments",
        });
      }
    }

    // Update job metadata
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        metadata: {
          payments_imported: imported,
          payments_skipped: skipped,
          payments_complete: true,
        },
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", migrationJobId);

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: parseResult.data.length,
    });
  } catch (error: any) {
    console.error("Payment import error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Import failed",
    });
  }
}
