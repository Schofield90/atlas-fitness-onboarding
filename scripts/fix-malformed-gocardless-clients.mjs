import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

async function fixMalformedClients() {
  console.log("🔧 Starting malformed client fix...\n");

  // Get all malformed clients from CSV import
  const { data: malformedClients, error: fetchError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, created_at")
    .eq("org_id", organizationId)
    .eq("source", "gocardless_csv_import")
    .or(
      `email.not.like.%@%,first_name.like.% %,last_name.like.% %`
    );

  if (fetchError) {
    console.error("❌ Error fetching malformed clients:", fetchError);
    return;
  }

  console.log(`📋 Found ${malformedClients.length} potentially malformed clients\n`);

  let fixed = 0;
  let deleted = 0;
  let errors = [];

  for (const malformed of malformedClients) {
    try {
      // Get payments for this malformed client
      const { data: payments } = await supabase
        .from("payments")
        .select("id, metadata")
        .eq("client_id", malformed.id)
        .limit(1);

      if (!payments || payments.length === 0) {
        // No payments, safe to delete
        await supabase.from("clients").delete().eq("id", malformed.id);
        deleted++;
        continue;
      }

      // Try to extract real email from payment metadata
      const payment = payments[0];
      const realEmail = payment.metadata?.customer_email;

      if (!realEmail || !realEmail.includes("@")) {
        console.log(`⚠️  No valid email in metadata for ${malformed.first_name} ${malformed.last_name}`);
        continue;
      }

      // Find real client by email
      const { data: realClient } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .eq("org_id", organizationId)
        .ilike("email", realEmail)
        .neq("id", malformed.id)
        .maybeSingle();

      if (realClient) {
        // Update all payments to link to real client
        const { error: updateError } = await supabase
          .from("payments")
          .update({ client_id: realClient.id })
          .eq("client_id", malformed.id);

        if (updateError) {
          errors.push({ malformedId: malformed.id, error: updateError.message });
          console.error(`❌ Failed to update payments for ${realEmail}`);
          continue;
        }

        // Delete malformed client
        await supabase.from("clients").delete().eq("id", malformed.id);

        fixed++;
        console.log(`✅ Fixed ${realEmail}: ${malformed.first_name} ${malformed.last_name} → ${realClient.first_name} ${realClient.last_name}`);
      } else {
        // No matching real client found - the malformed one might be the only record
        // Try to fix the malformed client by updating its fields from metadata
        const { data: allPayments } = await supabase
          .from("payments")
          .select("metadata")
          .eq("client_id", malformed.id)
          .limit(1);

        if (allPayments && allPayments[0]) {
          const metadata = allPayments[0].metadata;
          const realName = metadata?.customer_name || "";
          const [firstName, ...lastNameParts] = realName.split(" ");
          const lastName = lastNameParts.join(" ");

          if (firstName && lastName) {
            await supabase
              .from("clients")
              .update({
                first_name: firstName,
                last_name: lastName,
                email: realEmail,
              })
              .eq("id", malformed.id);

            fixed++;
            console.log(`✅ Updated malformed client: ${malformed.first_name} → ${firstName} ${lastName} (${realEmail})`);
          }
        }
      }
    } catch (error) {
      errors.push({ malformedId: malformed.id, error: error.message });
      console.error(`❌ Error processing ${malformed.id}:`, error.message);
    }
  }

  console.log("\n✅ Fix complete!\n");
  console.log("📊 Summary:");
  console.log(`  - Clients fixed: ${fixed}`);
  console.log(`  - Empty clients deleted: ${deleted}`);
  console.log(`  - Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n❌ First 10 errors:");
    errors.slice(0, 10).forEach((err) => console.log(err));
  }
}

fixMalformedClients().catch(console.error);
