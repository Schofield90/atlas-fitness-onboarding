import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get table info
    const tables = ["clients", "customers", "users", "members"];
    const results: any = {};

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select("*", { count: "exact", head: false })
          .limit(5);

        if (error) {
          results[table] = { error: error.message };
        } else {
          results[table] = {
            count: count || 0,
            sample: data || [],
            exists: true,
          };
        }
      } catch (e) {
        results[table] = { error: String(e), exists: false };
      }
    }

    // Also get organization info
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .limit(5);

    // Check for Sam specifically in clients
    const { data: samClient } = await supabase
      .from("clients")
      .select("*")
      .or(
        "email.ilike.%sam%,first_name.ilike.%sam%,last_name.ilike.%schofield%",
      )
      .limit(10);

    return NextResponse.json({
      database: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tables: results,
      organizations: orgs,
      searchForSam: samClient || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error),
        database: process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
      { status: 500 },
    );
  }
}
