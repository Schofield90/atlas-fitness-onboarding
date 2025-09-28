import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    // Create service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // First, let's see what organizations exist
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name, owner_id")
      .limit(5);

    if (orgsError) {
      return NextResponse.json({ error: orgsError.message }, { status: 500 });
    }

    // For each org, check how many clients they have
    const orgDetails = [];
    for (const org of orgs || []) {
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org.id);
      
      orgDetails.push({
        ...org,
        client_count: count || 0
      });
    }

    // Also check if there are any clients without org_id
    const { count: orphanCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .is("org_id", null);

    // Get sample clients
    const { data: sampleClients } = await supabase
      .from("clients")
      .select("id, email, first_name, last_name, org_id, organization_id")
      .limit(10);

    return NextResponse.json({
      organizations: orgDetails,
      orphan_clients_count: orphanCount,
      sample_clients: sampleClients,
      total_orgs: orgs?.length || 0
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}