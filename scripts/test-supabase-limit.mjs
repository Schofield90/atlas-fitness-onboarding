#!/usr/bin/env node
/**
 * Test Supabase query limits
 * Replicates exact LTV query to see how many payments Supabase returns
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lzlrojoaxrqvmhempnkn.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k";
const ORG_ID = "ee1206d7-62fb-49cf-9f39-95b9c54423a4";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log("🔍 Testing Supabase Payment Query Limits\n");

// Test 1: Simple count
console.log("Test 1: Simple COUNT query");
const { count } = await supabase
  .from("payments")
  .select("*", { count: "exact", head: true })
  .eq("organization_id", ORG_ID)
  .not("client_id", "is", null);

console.log(`✅ Total payments with client_id: ${count}\n`);

// Test 2: Fetch with .range(0, 999999)
console.log("Test 2: Fetch with .range(0, 999999)");
const { data: paymentsWithRange } = await supabase
  .from("payments")
  .select("id, amount, client_id")
  .eq("organization_id", ORG_ID)
  .not("client_id", "is", null)
  .range(0, 999999);

console.log(`✅ Payments fetched: ${paymentsWithRange?.length || 0}`);
console.log(
  `✅ Total amount: £${paymentsWithRange?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}\n`,
);

// Test 3: Fetch with joined clients table (EXACT LTV QUERY)
console.log("Test 3: LTV query with joined clients table");
const { data: paymentsWithClients } = await supabase
  .from("payments")
  .select(
    `
    id,
    client_id,
    amount,
    payment_date,
    payment_provider,
    payment_status,
    clients!payments_client_id_fkey(
      id,
      first_name,
      last_name,
      email,
      status
    )
  `,
  )
  .eq("organization_id", ORG_ID)
  .not("client_id", "is", null)
  .order("payment_date", { ascending: false })
  .range(0, 999999);

console.log(`✅ Payments with clients fetched: ${paymentsWithClients?.length || 0}`);
console.log(
  `✅ Total amount: £${paymentsWithClients?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)}`,
);

// Check unique clients
const uniqueClients = new Set(paymentsWithClients?.map((p) => p.client_id));
console.log(`✅ Unique clients: ${uniqueClients.size}\n`);

// Test 4: Try different range values
console.log("Test 4: Testing different range limits");
const rangeLimits = [1000, 10000, 50000, 100000, 999999];

for (const limit of rangeLimits) {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("organization_id", ORG_ID)
    .not("client_id", "is", null)
    .range(0, limit);

  console.log(`   range(0, ${limit.toLocaleString()}): ${data?.length || 0} rows`);
}

console.log("\n✅ Test complete!");
console.log("\n📊 Summary:");
console.log(`   Database has: ${count} payments`);
console.log(`   Supabase returns: ${paymentsWithClients?.length || 0} payments`);
console.log(`   Missing: ${count - (paymentsWithClients?.length || 0)} payments`);

if (count !== paymentsWithClients?.length) {
  console.log("\n🚨 ISSUE FOUND: Supabase is not returning all payments!");
  console.log("   This explains why LTV report shows £60k instead of £426k");
}
