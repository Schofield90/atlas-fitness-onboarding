import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    // Try admin client first
    let supabase;
    try {
      supabase = await createAdminClient();
      console.log("Using admin client");
    } catch {
      supabase = createClient();
      console.log("Using regular client");
    }

    const results: any = {
      leads: {},
      clients: {},
      customer_memberships: {},
      membership_plans: {},
      crossChecks: {},
    };

    // 1. Find all Sam Schofield records in leads table
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .or(
        `name.ilike.%Sam Schofield%,first_name.ilike.%Sam%,email.eq.samschofield90@hotmail.co.uk`,
      );

    results.leads = {
      count: leads?.length || 0,
      records: leads,
    };

    // 2. Find all Sam Schofield records in clients table
    const { data: clients } = await supabase
      .from("clients")
      .select("*")
      .or(`name.ilike.%Sam Schofield%,email.eq.samschofield90@hotmail.co.uk`);

    results.clients = {
      count: clients?.length || 0,
      records: clients,
    };

    // 3. Check customer_memberships for all possible IDs
    const allIds = [
      ...(leads || []).map((l) => l.id),
      ...(clients || []).map((c) => c.id),
    ];

    if (allIds.length > 0) {
      const { data: memberships } = await supabase
        .from("customer_memberships")
        .select(
          `
          *,
          membership_plan:membership_plans(*),
          customer:leads(*)
        `,
        )
        .in("customer_id", allIds);

      results.customer_memberships = {
        count: memberships?.length || 0,
        records: memberships,
      };
    }

    // 4. Check if customer_memberships has ANY records
    const { data: allMemberships, count } = await supabase
      .from("customer_memberships")
      .select("*", { count: "exact" })
      .limit(5);

    results.customer_memberships.totalInTable = count;
    results.customer_memberships.sample = allMemberships;

    // 5. Check membership_plans table
    const { data: plans } = await supabase
      .from("membership_plans")
      .select("*")
      .limit(5);

    results.membership_plans = {
      records: plans,
    };

    // 6. Cross-reference checks
    if (leads && leads.length > 0) {
      // Check if any lead ID exists in customer_memberships
      for (const lead of leads) {
        const { data: directCheck } = await supabase
          .from("customer_memberships")
          .select("*")
          .eq("customer_id", lead.id);

        results.crossChecks[`lead_${lead.id}`] = {
          name: lead.name,
          hasMembership: directCheck && directCheck.length > 0,
          membershipCount: directCheck?.length || 0,
        };
      }
    }

    // 7. Check the actual foreign key constraint
    const { data: constraintCheck } = await supabase
      .rpc("get_foreign_keys", { table_name: "customer_memberships" })
      .select("*");

    results.foreignKeyInfo =
      constraintCheck || "Could not fetch foreign key info";

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
