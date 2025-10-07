import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { migrationService } from "@/app/lib/services/migration-service";
import { requireAuth } from "@/app/lib/api/auth-check";
import { sendEmail } from "@/app/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for large CSV files

/**
 * Import GoCardless payment history from CSV export
 * Handles large CSV files from GoCardless dashboard exports
 * Uses background processing for files with >100 payments
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    const userId = user.id;

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

    const totalRows = lines.length - 1; // Exclude header row

    // Use background processing for large files (>100 rows)
    const shouldUseBackground = totalRows > 100;

    if (shouldUseBackground) {
      // Create migration job for background processing
      const jobId = await migrationService.createMigrationJob(
        {
          organizationId,
          name: `GoCardless CSV Import - ${file.name}`,
          description: `Importing ${totalRows} payments from CSV`,
          sourcePlatform: "gocardless_csv",
          settings: {
            skipDuplicates: true,
            validateData: true,
            createBackup: false,
            batchSize: 10,
          },
        },
        userId,
      );

      // Start background processing (don't await)
      processCSVImportInBackground(jobId, organizationId, lines, {
        idIndex,
        emailIndex,
        firstNameIndex,
        lastNameIndex,
        amountIndex,
        statusIndex,
        chargeDateIndex,
        descriptionIndex,
        customerIdIndex,
      }).catch((error) => {
        console.error("Background CSV import failed:", error);
      });

      return NextResponse.json({
        success: true,
        message: `Import started in background. Processing ${totalRows} payments.`,
        stats: {
          totalProcessed: totalRows,
          imported: 0,
          updated: 0,
          skipped: 0,
          clientsCreated: 0,
          errors: 0,
        },
        jobId,
        backgroundProcessing: true,
      });
    }

    // Direct processing for small files
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let clientsCreated = 0;
    const errors: Array<{ paymentId: string; error: string }> = [];

    // Valid payment statuses to import
    const VALID_STATUSES = ["paid_out", "confirmed", "submitted"];

    console.log(`📊 Starting direct CSV import: ${totalRows} rows to process`);

    // Process each payment (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Log progress every 50 records
      if (i % 50 === 0) {
        console.log(
          `⏳ Progress: ${i}/${lines.length - 1} rows processed (${imported} imported, ${updated} updated, ${skipped} skipped)`,
        );
      }

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

// Background processing function for large CSV imports
async function processCSVImportInBackground(
  jobId: string,
  organizationId: string,
  lines: string[],
  columnIndexes: {
    idIndex: number;
    emailIndex: number;
    firstNameIndex: number;
    lastNameIndex: number;
    amountIndex: number;
    statusIndex: number;
    chargeDateIndex: number;
    descriptionIndex: number;
    customerIdIndex: number;
  },
) {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Update job status to processing
    await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        total_records: lines.length - 1,
      })
      .eq("id", jobId);

    const {
      idIndex,
      emailIndex,
      firstNameIndex,
      lastNameIndex,
      amountIndex,
      statusIndex,
      chargeDateIndex,
      descriptionIndex,
      customerIdIndex,
    } = columnIndexes;

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let clientsCreated = 0;
    const errors: Array<{ paymentId: string; error: string }> = [];
    const VALID_STATUSES = ["paid_out", "confirmed", "submitted"];

    console.log(
      `📊 Background processing: ${lines.length - 1} total rows to process`,
    );

    // Process each payment (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Update progress every 10 records
      if (i % 10 === 0) {
        const processed = i - 1;
        const progressPercentage = Math.round(
          (processed / (lines.length - 1)) * 100,
        );

        await supabaseAdmin
          .from("migration_jobs")
          .update({
            processed_records: processed,
            successful_imports: imported + updated,
            failed_imports: errors.length,
            progress_percentage: progressPercentage,
          })
          .eq("id", jobId);

        console.log(
          `⏳ Background progress: ${processed}/${lines.length - 1} (${progressPercentage}%) - ${imported} imported, ${updated} updated, ${skipped} skipped`,
        );
      }

      try {
        // Parse CSV line (handles quoted values)
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

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

        // Skip invalid rows
        if (!paymentId || !customerEmail) {
          skipped++;
          continue;
        }

        if (!VALID_STATUSES.includes(status)) {
          skipped++;
          continue;
        }

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

    // Mark job as completed
    const { data: jobData } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        processed_records: lines.length - 1,
        successful_imports: imported + updated,
        failed_imports: errors.length,
        progress_percentage: 100,
        result_summary: {
          imported,
          updated,
          skipped,
          clientsCreated,
          errors: errors.slice(0, 10),
        },
      })
      .eq("id", jobId)
      .select("result_summary, name")
      .single();

    console.log(
      `✅ Background import completed: ${imported} imported, ${updated} updated, ${clientsCreated} clients created, ${skipped} skipped, ${errors.length} errors`,
    );

    // Send email notification if email was provided
    const notificationEmail = jobData?.result_summary?.notification_email;
    if (notificationEmail) {
      try {
        await sendEmail({
          to: notificationEmail,
          subject: "✅ GoCardless Import Complete",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10B981;">Import Successful!</h2>
              <p>Your GoCardless payment import has completed successfully.</p>

              <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Import Summary</h3>
                <ul style="list-style: none; padding: 0;">
                  <li>✅ <strong>${imported}</strong> payments imported</li>
                  <li>🔄 <strong>${updated}</strong> payments updated</li>
                  <li>👤 <strong>${clientsCreated}</strong> clients auto-created</li>
                  <li>⏭️ <strong>${skipped}</strong> records skipped</li>
                  ${errors.length > 0 ? `<li>⚠️ <strong>${errors.length}</strong> errors</li>` : ""}
                </ul>
              </div>

              <p>
                <a href="https://login.gymleadhub.co.uk/members"
                   style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Members
                </a>
              </p>

              <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from GymLeadHub
              </p>
            </div>
          `,
          organizationId,
        });

        console.log(`📧 Success email sent to ${notificationEmail}`);
      } catch (emailError) {
        console.error("Failed to send completion email:", emailError);
      }
    }
  } catch (error: any) {
    console.error("Background CSV import failed:", error);

    // Mark job as failed
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: jobData } = await supabaseAdmin
      .from("migration_jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        result_summary: {
          error: error.message,
        },
      })
      .eq("id", jobId)
      .select("result_summary, organization_id")
      .single();

    // Send failure email notification if email was provided
    const notificationEmail = jobData?.result_summary?.notification_email;
    if (notificationEmail && jobData?.organization_id) {
      try {
        await sendEmail({
          to: notificationEmail,
          subject: "❌ GoCardless Import Failed",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #EF4444;">Import Failed</h2>
              <p>Unfortunately, your GoCardless payment import encountered an error and could not complete.</p>

              <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #991B1B;">Error Details</h3>
                <p style="color: #7F1D1D; font-family: monospace;">${error.message}</p>
              </div>

              <p>Please try the following:</p>
              <ul>
                <li>Check that your CSV file is in the correct format</li>
                <li>Verify all required columns are present</li>
                <li>Try importing a smaller file to test</li>
                <li>Contact support if the issue persists</li>
              </ul>

              <p>
                <a href="https://login.gymleadhub.co.uk/settings/integrations/payments/import?provider=gocardless"
                   style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Try Again
                </a>
              </p>

              <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from GymLeadHub
              </p>
            </div>
          `,
          organizationId: jobData.organization_id,
        });

        console.log(`📧 Failure email sent to ${notificationEmail}`);
      } catch (emailError) {
        console.error("Failed to send failure email:", emailError);
      }
    }
  }
}
