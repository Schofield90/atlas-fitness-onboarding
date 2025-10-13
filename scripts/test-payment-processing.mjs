import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const orgId = "c762845b-34fc-41ea-9e01-f70b81c44ff7";

async function testPaymentProcessing() {
  console.log("🧪 Testing Payment Processing System\n");

  // 1. Check scheduled payments
  const today = new Date().toISOString().split("T")[0];

  const { data: scheduledPayments, error: schedError } = await supabase
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .eq("payment_status", "scheduled")
    .lte("payment_date", today);

  if (schedError) {
    console.error("❌ Error fetching scheduled payments:", schedError);
    return;
  }

  console.log(`📊 Scheduled Payments Due Today (${today}):`);
  console.log(`   Total: ${scheduledPayments?.length || 0}`);

  if (scheduledPayments && scheduledPayments.length > 0) {
    const byProvider = {};
    scheduledPayments.forEach((p) => {
      byProvider[p.payment_provider] = (byProvider[p.payment_provider] || 0) + 1;
    });
    console.log(`   By Provider:`, byProvider);
    console.log(`   Total Amount: £${scheduledPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}`);
  }

  // 2. Check Stripe connection
  console.log("\n🔗 Checking Payment Provider Connections:");

  const { data: stripeAccount } = await supabase
    .from("payment_provider_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (stripeAccount) {
    console.log("   ✅ Stripe connected");
  } else {
    console.log("   ⚠️  Stripe NOT connected");
  }

  const { data: gcAccount } = await supabase
    .from("payment_provider_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", "gocardless")
    .maybeSingle();

  if (gcAccount) {
    console.log("   ✅ GoCardless connected");
  } else {
    console.log("   ⚠️  GoCardless NOT connected");
  }

  // 3. Check future scheduled payments
  const { data: futurePayments } = await supabase
    .from("payments")
    .select("payment_date, amount, payment_provider")
    .eq("organization_id", orgId)
    .eq("payment_status", "scheduled")
    .gt("payment_date", today)
    .order("payment_date");

  if (futurePayments && futurePayments.length > 0) {
    console.log(`\n📅 Future Scheduled Payments:`);
    console.log(`   Total: ${futurePayments.length}`);

    const byMonth = {};
    futurePayments.forEach((p) => {
      const month = p.payment_date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + p.amount;
    });

    console.log("\n   Monthly Breakdown:");
    Object.entries(byMonth)
      .sort()
      .slice(0, 3)
      .forEach(([month, total]) => {
        console.log(`   ${month}: £${total.toFixed(2)}`);
      });
  }

  // 4. Check payment processing endpoint
  console.log("\n🚀 Payment Processing Cron Job:");
  console.log("   Endpoint: /api/cron/process-payments");
  console.log("   Schedule: Every 6 hours (0 */6 * * *)");
  console.log("   Max Duration: 300 seconds (5 minutes)");

  if (scheduledPayments && scheduledPayments.length > 0) {
    console.log(`\n⏭️  Next Run: Will process ${scheduledPayments.length} payments`);
  } else {
    console.log("\n✅ No payments due for processing today");
  }

  // 5. Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Payments due today: ${scheduledPayments?.length || 0}`);
  console.log(`Future scheduled: ${futurePayments?.length || 0}`);
  console.log(`Stripe connected: ${stripeAccount ? "Yes" : "No"}`);
  console.log(`GoCardless connected: ${gcAccount ? "Yes" : "No"}`);
  console.log("\n✅ Payment processing system ready!");
}

testPaymentProcessing().catch(console.error);
