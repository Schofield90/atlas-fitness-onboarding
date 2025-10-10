import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/referral-codes/validate
 *
 * Validates a referral code
 *
 * Request body:
 * {
 *   code: string
 *   refereeClientId: string (the person using the code)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     referralCode: { id, code, referrer_client_id, credit_amount, credit_type }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, organization } = await requireAuth(supabase);

    const body = await request.json();
    const { code, refereeClientId } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Referral code is required" },
        { status: 400 },
      );
    }

    // Fetch referral code
    const { data: referralCode, error: fetchError } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("code", code.toUpperCase())
      .single();

    if (fetchError || !referralCode) {
      return NextResponse.json(
        { success: false, error: "Invalid referral code" },
        { status: 404 },
      );
    }

    // Validate: Is active?
    if (!referralCode.is_active) {
      return NextResponse.json(
        { success: false, error: "This referral code is no longer active" },
        { status: 400 },
      );
    }

    // Validate: Check expiration
    if (referralCode.expires_at) {
      const expiryDate = new Date(referralCode.expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "This referral code has expired" },
          { status: 400 },
        );
      }
    }

    // Validate: Check max uses
    if (
      referralCode.max_uses !== null &&
      referralCode.times_used >= referralCode.max_uses
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This referral code has reached its usage limit",
        },
        { status: 400 },
      );
    }

    // Validate: Cannot use own referral code
    if (
      refereeClientId &&
      referralCode.referrer_client_id === refereeClientId
    ) {
      return NextResponse.json(
        { success: false, error: "You cannot use your own referral code" },
        { status: 400 },
      );
    }

    // Validate: Check if this client has already used this referral code
    if (refereeClientId) {
      const { count: previousUses } = await supabase
        .from("referral_credits")
        .select("*", { count: "exact", head: true })
        .eq("referral_code_id", referralCode.id)
        .eq("referee_client_id", refereeClientId);

      if (previousUses && previousUses > 0) {
        return NextResponse.json(
          { success: false, error: "You have already used this referral code" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode: {
          id: referralCode.id,
          code: referralCode.code,
          referrer_client_id: referralCode.referrer_client_id,
          credit_amount: referralCode.credit_amount,
          credit_type: referralCode.credit_type,
          description: referralCode.description,
        },
      },
    });
  } catch (error: any) {
    console.error("Error validating referral code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate referral code" },
      { status: 500 },
    );
  }
}
