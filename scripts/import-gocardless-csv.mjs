import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const organizationId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";
const csvPath = "/Users/Sam/Downloads/payments_index-export-EX0004AB8Y1ZY0.csv";

async function importGoCardlessCSV() {
  console.log("🚀 Starting GoCardless CSV import...\n");

  // Read CSV
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0].split(",");

  console.log(`📄 Found ${lines.length - 1} payments in CSV\n`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let clientsCreated = 0;
  const errors = [];

  // Process each payment (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split CSV line (handles quotes)
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const payment = {};

    headers.forEach((header, index) => {
      let value = values[index] || "";
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      payment[header.trim()] = value;
    });

    try {
      const paymentId = payment.id;
      const customerEmail = payment["customers.email"];
      const customerFirstName = payment["customers.given_name"];
      const customerLastName = payment["customers.family_name"];
      const amount = parseFloat(payment.amount);
      const status = payment.status;
      const chargeDate = payment.charge_date;

      // Skip if no email or invalid status
      if (!customerEmail || !paymentId) {
        skipped++;
        continue;
      }

      // Only import successful payments
      const VALID_STATUSES = ["paid_out", "confirmed", "submitted"];
      if (!VALID_STATUSES.includes(status)) {
        console.log(`⏭️  Skipping payment ${paymentId} - status: ${status}`);
        skipped++;
        continue;
      }

      // Find or create client by email
      let { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("org_id", organizationId)
        .ilike("email", customerEmail)
        .maybeSingle();

      if (!client) {
        // Create archived client
        const { data: newClient, error: clientError } = await supabase
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
          errors.push({ paymentId, error: clientError.message });
          console.error(`❌ Failed to create client for ${customerEmail}`);
          skipped++;
          continue;
        }

        client = newClient;
        clientsCreated++;
        console.log(`✅ Created client: ${customerEmail}`);
      }

      // Check if payment exists
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("provider_payment_id", paymentId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingPayment) {
        // Update existing payment with client link
        const { error: updateError } = await supabase
          .from("payments")
          .update({ client_id: client.id })
          .eq("id", existingPayment.id);

        if (updateError) {
          errors.push({ paymentId, error: updateError.message });
          skipped++;
        } else {
          updated++;
          if (updated % 10 === 0) {
            console.log(`🔄 Updated ${updated} payments...`);
          }
        }
      } else {
        // Create new payment
        const { error: insertError } = await supabase.from("payments").insert({
          organization_id: organizationId,
          client_id: client.id,
          amount,
          payment_provider: "gocardless",
          provider_payment_id: paymentId,
          payment_status: status,
          payment_method: "direct_debit",
          payment_date: chargeDate,
          description: payment.description || "GoCardless payment",
          metadata: {
            gocardless_payment_id: paymentId,
            gocardless_customer_id: payment["customers.id"],
            customer_email: customerEmail,
            customer_name: `${customerFirstName} ${customerLastName}`.trim(),
            imported_from_csv: true,
          },
        });

        if (insertError) {
          errors.push({ paymentId, error: insertError.message });
          skipped++;
        } else {
          imported++;
          if (imported % 10 === 0) {
            console.log(`📥 Imported ${imported} new payments...`);
          }
        }
      }
    } catch (error) {
      errors.push({ line: i, error: error.message });
      skipped++;
    }
  }

  console.log("\n✅ Import complete!\n");
  console.log("📊 Summary:");
  console.log(`  - New payments imported: ${imported}`);
  console.log(`  - Existing payments updated: ${updated}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Clients created: ${clientsCreated}`);
  console.log(`  - Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n❌ First 10 errors:");
    errors.slice(0, 10).forEach((err) => console.log(err));
  }
}

importGoCardlessCSV().catch(console.error);
