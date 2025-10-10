import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/discount-codes/validate
 *
 * Validates a discount code and returns discount details
 *
 * Request body:
 * {
 *   code: string
 *   customerId: string
 *   membershipPlanId: string
 *   purchaseAmount: number (in pennies)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     discountCode: { id, code, type, amount, description }
 *     discountAmount: number (in pennies)
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { user, organization } = await requireAuth(supabase);

    const body = await request.json();
    const { code, customerId, membershipPlanId, purchaseAmount } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Discount code is required" },
        { status: 400 },
      );
    }

    // Fetch discount code
    const { data: discountCode, error: fetchError } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("code", code.toUpperCase())
      .single();

    if (fetchError || !discountCode) {
      return NextResponse.json(
        { success: false, error: "Invalid discount code" },
        { status: 404 },
      );
    }

    // Validate: Is active?
    if (!discountCode.is_active) {
      return NextResponse.json(
        { success: false, error: "This discount code is no longer active" },
        { status: 400 },
      );
    }

    // Validate: Check expiration
    if (discountCode.expires_at) {
      const expiryDate = new Date(discountCode.expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "This discount code has expired" },
          { status: 400 },
        );
      }
    }

    // Validate: Check start date
    if (discountCode.starts_at) {
      const startDate = new Date(discountCode.starts_at);
      if (startDate > new Date()) {
        return NextResponse.json(
          { success: false, error: "This discount code is not yet valid" },
          { status: 400 },
        );
      }
    }

    // Validate: Check max uses
    if (
      discountCode.max_uses !== null &&
      discountCode.current_uses >= discountCode.max_uses
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This discount code has reached its usage limit",
        },
        { status: 400 },
      );
    }

    // Validate: Check customer usage limit
    if (customerId && discountCode.max_uses_per_customer) {
      const { count: customerUses } = await supabase
        .from("discount_code_usage")
        .select("*", { count: "exact", head: true })
        .eq("discount_code_id", discountCode.id)
        .eq("customer_id", customerId);

      if (customerUses && customerUses >= discountCode.max_uses_per_customer) {
        return NextResponse.json(
          { success: false, error: "You have already used this discount code" },
          { status: 400 },
        );
      }
    }

    // Validate: Check minimum purchase amount
    if (
      discountCode.min_purchase_amount &&
      purchaseAmount < discountCode.min_purchase_amount * 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum purchase of £${discountCode.min_purchase_amount} required for this discount`,
        },
        { status: 400 },
      );
    }

    // Validate: Check if applies to this membership plan
    if (
      discountCode.applies_to_plans &&
      discountCode.applies_to_plans.length > 0
    ) {
      if (
        !membershipPlanId ||
        !discountCode.applies_to_plans.includes(membershipPlanId)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This discount code does not apply to the selected membership",
          },
          { status: 400 },
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.type === "percentage") {
      discountAmount = Math.round(purchaseAmount * (discountCode.amount / 100));
    } else if (discountCode.type === "fixed") {
      discountAmount = Math.round(discountCode.amount * 100); // Convert to pennies
      // Ensure discount doesn't exceed purchase amount
      if (discountAmount > purchaseAmount) {
        discountAmount = purchaseAmount;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        discountCode: {
          id: discountCode.id,
          code: discountCode.code,
          type: discountCode.type,
          amount: discountCode.amount,
          description: discountCode.description,
        },
        discountAmount, // in pennies
      },
    });
  } catch (error: any) {
    console.error("Error validating discount code:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate discount code" },
      { status: 500 },
    );
  }
}
