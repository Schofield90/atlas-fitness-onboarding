import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function GET() {
  try {
    // Test regular client
    const supabase = await createClient();
    const { data: regularData, error: regularError } = await supabase
      .from("account_claim_tokens")
      .select("count(*)")
      .limit(1);

    // Test admin client
    const adminSupabase = createAdminClient();
    const { data: adminData, error: adminError } = await adminSupabase
      .from("account_claim_tokens")
      .select("count(*)")
      .limit(1);

    return NextResponse.json({
      regular: {
        data: regularData,
        error: regularError?.message || null,
      },
      admin: {
        data: adminData,
        error: adminError?.message || null,
      },
      envVars: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
