import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Import GoCardless payment history from CSV export
 * Handles large CSV files from GoCardless dashboard exports
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const organizationId = formData.get("organizationId") as string;

    if (!file || !organizationId) {
      return NextResponse.json(
        { error: "CSV file and organization ID are required" },
        { status: 400 },
      );
    }

    // Use admin client for all operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Read CSV content
    const csvContent = await file.text();
    const lines = csvContent.split("\n");

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV file is empty or invalid" },
        { status: 400 },
      );
    }

    // Parse CSV headers
    const headers = lines[0].split(",").map((h) => h.trim());

    // Find column indexes
    const idIndex = headers.indexOf("id");
    const emailIndex = headers.indexOf("customers.email");
    const firstNameIndex = headers.indexOf("customers.given_name");
    const lastNameIndex = headers.indexOf("customers.family_name");
    const amountIndex = headers.indexOf("amount");
    const statusIndex = headers.indexOf("status");
    const chargeDateIndex = headers.indexOf("charge_date");
    const descriptionIndex = headers.indexOf("description");
    const customerIdIndex = headers.indexOf("customers.id");

    if (
      idIndex === -1 ||
      emailIndex === -1 ||
      amountIndex === -1 ||
      statusIndex === -1
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid CSV format. Required columns: id, customers.email, amount, status",
        },
        { status: 400 },
      );
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let clientsCreated = 0;
    const errors: Array<{ paymentId: string; error: string }> = [];

    // Valid payment statuses to import
    const VALID_STATUSES = ["paid_out", "confirmed", "submitted"];

    // Process each payment (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV line (handles quoted values)
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

        // Remove quotes from values
        const cleanValue = (index: number): string => {
          let value = values[index] || "";
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          return value.trim();
        };

        const paymentId = cleanValue(idIndex);
        const customerEmail = cleanValue(emailIndex);
        const customerFirstName = cleanValue(firstNameIndex);
        const customerLastName = cleanValue(lastNameIndex);
        const amount = parseFloat(cleanValue(amountIndex));
        const status = cleanValue(statusIndex);
        const chargeDate = cleanValue(chargeDateIndex);
        const description = cleanValue(descriptionIndex);
        const customerId = cleanValue(customerIdIndex);

        // Skip if no payment ID or invalid status
        if (!paymentId || !customerEmail) {
          skipped++;
          continue;
        }

        // Only import successful payments
        if (!VALID_STATUSES.includes(status)) {
          skipped++;
          continue;
        }

        // Skip invalid amounts
        if (isNaN(amount) || amount <= 0) {
          skipped++;
          continue;
        }

        // Find or create client by email
        let { data: client } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("org_id", organizationId)
          .ilike("email", customerEmail)
          .maybeSingle();

        if (!client) {
          // Create cancelled client for historical data
          const { data: newClient, error: clientError } = await supabaseAdmin
            .from("clients")
            .insert({
              org_id: organizationId,
              first_name: customerFirstName || "Unknown",
              last_name: customerLastName || "",
              email: customerEmail,
              status: "cancelled",
              source: "gocardless_csv_import",
            })
            .select("id")
            .single();

          if (clientError) {
            errors.push({
              paymentId,
              error: `Failed to create client: ${clientError.message}`,
            });
            skipped++;
            continue;
          }

          client = newClient;
          clientsCreated++;
        }

        // Check if payment exists
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("provider_payment_id", paymentId)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (existingPayment) {
          // Update existing payment with client link
          const { error: updateError } = await supabaseAdmin
            .from("payments")
            .update({ client_id: client.id })
            .eq("id", existingPayment.id);

          if (updateError) {
            errors.push({
              paymentId,
              error: `Failed to update: ${updateError.message}`,
            });
            skipped++;
          } else {
            updated++;
          }
        } else {
          // Create new payment
          const { error: insertError } = await supabaseAdmin
            .from("payments")
            .insert({
              organization_id: organizationId,
              client_id: client.id,
              amount,
              payment_provider: "gocardless",
              provider_payment_id: paymentId,
              payment_status: status,
              payment_method: "direct_debit",
              payment_date: chargeDate,
              description: description || "GoCardless payment",
              metadata: {
                gocardless_payment_id: paymentId,
                gocardless_customer_id: customerId,
                customer_email: customerEmail,
                customer_name:
                  `${customerFirstName} ${customerLastName}`.trim(),
                imported_from_csv: true,
                csv_import_date: new Date().toISOString(),
              },
            });

          if (insertError) {
            errors.push({
              paymentId,
              error: `Failed to insert: ${insertError.message}`,
            });
            skipped++;
          } else {
            imported++;
          }
        }
      } catch (error: any) {
        errors.push({
          paymentId: `line-${i}`,
          error: error.message,
        });
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "CSV import completed",
      stats: {
        totalProcessed: lines.length - 1,
        imported,
        updated,
        skipped,
        clientsCreated,
        errors: errors.length,
      },
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `CSV import failed: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
