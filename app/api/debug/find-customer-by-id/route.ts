import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    // Try admin client first
    let supabase;
    try {
      supabase = await createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const membershipCustomerId = "65bca601-ae69-41da-88dd-fe2c08ac6859";

    const results: any = {
      customerIdFromMembership: membershipCustomerId,
    };

    // Check leads table
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", membershipCustomerId)
      .single();

    results.inLeadsTable = {
      found: !!lead,
      data: lead,
    };

    // Check clients table
    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", membershipCustomerId)
      .single();

    results.inClientsTable = {
      found: !!client,
      data: client,
    };

    // Get the membership details
    const { data: membership } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plan:membership_plans(*),
        customer:leads(*)
      `,
      )
      .eq("customer_id", membershipCustomerId)
      .single();

    results.membershipDetails = membership;

    // Find if there's a Sam Schofield in leads table
    const { data: samInLeads } = await supabase
      .from("leads")
      .select("*")
      .or(`name.ilike.%Sam Schofield%,email.eq.samschofield90@hotmail.co.uk`);

    results.samSchofieldsInLeads = {
      count: samInLeads?.length || 0,
      records: samInLeads,
    };

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
