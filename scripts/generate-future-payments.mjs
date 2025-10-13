import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const orgId = "c762845b-34fc-41ea-9e01-f70b81c44ff7";

async function generateFuturePayments() {
  const { data: memberships, error: membershipError } = await supabase
    .from("customer_memberships")
    .select("id, client_id, membership_plan_id, start_date, next_billing_date, payment_provider, membership_plans!inner(id, name, price, billing_period)")
    .eq("organization_id", orgId)
    .eq("status", "active");

  if (membershipError) {
    console.error("Error:", membershipError);
    return;
  }

  console.log("Found", memberships.length, "active memberships");

  const payments = [];
  const monthsAhead = 3;

  memberships.forEach(m => {
    const plan = m.membership_plans;
    if (plan.billing_period === "one_time") return;

    const baseDate = new Date(m.next_billing_date || m.start_date);

    for (let i = 1; i <= monthsAhead; i++) {
      const pd = new Date(baseDate);
      if (plan.billing_period === "monthly") pd.setMonth(pd.getMonth() + i);
      else if (plan.billing_period === "annual" || plan.billing_period === "yearly") pd.setFullYear(pd.getFullYear() + i);
      else if (plan.billing_period === "weekly") pd.setDate(pd.getDate() + i * 7);
      else pd.setMonth(pd.getMonth() + i);

      payments.push({
        organization_id: orgId,
        client_id: m.client_id,
        amount: plan.price,
        payment_date: pd.toISOString().split("T")[0],
        payment_provider: m.payment_provider || "stripe",
        payment_status: "scheduled",
        description: "Scheduled recurring payment for " + plan.name,
        metadata: { membership_id: m.id, plan_name: plan.name, scheduled: true }
      });
    }
  });

  console.log("Creating", payments.length, "future payments...");

  let created = 0;
  for (let i = 0; i < payments.length; i += 100) {
    const batch = payments.slice(i, i + 100);
    const { error } = await supabase.from("payments").insert(batch);
    if (error) {
      console.error("Batch error:", error.message);
    } else {
      created += batch.length;
    }
  }

  console.log("Created", created, "scheduled payments");
  
  const breakdown = {};
  payments.forEach(p => {
    const month = p.payment_date.substring(0, 7);
    breakdown[month] = (breakdown[month] || 0) + p.amount;
  });

  console.log("\nScheduled Revenue by Month:");
  Object.entries(breakdown).sort().forEach(([month, total]) => {
    console.log("  " + month + ": £" + total.toFixed(2));
  });
}

generateFuturePayments().catch(console.error);
