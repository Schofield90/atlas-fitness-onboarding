import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token parameter is required" },
        { status: 400 },
      );
    }

    // Create both regular and admin clients
    const supabase = createClient();
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const debug: any = {
      token,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // 1. Check token with regular client (as anon/public would see it)
    console.log("Checking token with regular client...");
    const { data: tokenDataAnon, error: tokenErrorAnon } = await supabase
      .from("account_claim_tokens")
      .select("*")
      .eq("token", token)
      .single();

    debug.checks.tokenAsAnon = {
      success: !tokenErrorAnon,
      data: tokenDataAnon,
      error: tokenErrorAnon
        ? {
            code: tokenErrorAnon.code,
            message: tokenErrorAnon.message,
            details: tokenErrorAnon.details,
            hint: tokenErrorAnon.hint,
          }
        : null,
    };

    // 2. Check token with admin client (bypasses RLS)
    console.log("Checking token with admin client...");
    const { data: tokenDataAdmin, error: tokenErrorAdmin } = await supabaseAdmin
      .from("account_claim_tokens")
      .select("*")
      .eq("token", token)
      .single();

    debug.checks.tokenAsAdmin = {
      success: !tokenErrorAdmin,
      data: tokenDataAdmin,
      error: tokenErrorAdmin
        ? {
            code: tokenErrorAdmin.code,
            message: tokenErrorAdmin.message,
          }
        : null,
    };

    if (tokenDataAdmin) {
      // 3. Check client with regular client
      console.log("Checking client with regular client...");
      const { data: clientDataAnon, error: clientErrorAnon } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, phone, date_of_birth")
        .eq("id", tokenDataAdmin.client_id)
        .single();

      debug.checks.clientAsAnon = {
        success: !clientErrorAnon,
        data: clientDataAnon,
        error: clientErrorAnon
          ? {
              code: clientErrorAnon.code,
              message: clientErrorAnon.message,
              details: clientErrorAnon.details,
              hint: clientErrorAnon.hint,
            }
          : null,
      };

      // 4. Check client with admin client
      console.log("Checking client with admin client...");
      const { data: clientDataAdmin, error: clientErrorAdmin } =
        await supabaseAdmin
          .from("clients")
          .select("*")
          .eq("id", tokenDataAdmin.client_id)
          .single();

      debug.checks.clientAsAdmin = {
        success: !clientErrorAdmin,
        data: clientDataAdmin,
        error: clientErrorAdmin
          ? {
              code: clientErrorAdmin.code,
              message: clientErrorAdmin.message,
            }
          : null,
      };

      // 5. Check RLS function
      console.log("Checking RLS function...");
      const { data: rlsResult, error: rlsError } = await supabase.rpc(
        "has_valid_claim_token",
        { client_id_param: tokenDataAdmin.client_id },
      );

      debug.checks.rlsFunction = {
        success: !rlsError,
        result: rlsResult,
        error: rlsError
          ? {
              code: rlsError.code,
              message: rlsError.message,
            }
          : null,
      };

      // 6. Token validation
      if (tokenDataAdmin) {
        debug.tokenValidation = {
          isExpired: tokenDataAdmin.expires_at
            ? new Date(tokenDataAdmin.expires_at) < new Date()
            : false,
          isClaimed: !!tokenDataAdmin.claimed_at,
          isPermanent: !tokenDataAdmin.expires_at,
          expiresAt: tokenDataAdmin.expires_at,
          claimedAt: tokenDataAdmin.claimed_at,
          createdAt: tokenDataAdmin.created_at,
        };
      }
    }

    // 7. Summary
    debug.summary = {
      tokenFound: !!tokenDataAdmin,
      tokenAccessiblePublicly: !!tokenDataAnon,
      clientFound: !!debug.checks.clientAsAdmin?.data,
      clientAccessiblePublicly: !!debug.checks.clientAsAnon?.data,
      canClaim: !!(
        tokenDataAdmin &&
        !tokenDataAdmin.claimed_at &&
        (!tokenDataAdmin.expires_at ||
          new Date(tokenDataAdmin.expires_at) > new Date())
      ),
    };

    return NextResponse.json(debug, { status: 200 });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
