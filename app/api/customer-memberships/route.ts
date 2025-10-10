import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAuth } from "@/app/lib/api/auth-check";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId parameter" },
        { status: 400 },
      );
    }

    // Fetch memberships for this customer
    const { data: memberships, error } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        membership_plan:membership_plans(*)
      `,
      )
      .or(`customer_id.eq.${customerId},client_id.eq.${customerId}`)
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching memberships:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch memberships" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, memberships: memberships || [] });
  } catch (error: any) {
    console.error("Error in GET /api/customer-memberships:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      customerId,
      membershipPlanId,
      startDate,
      notes,
      paymentMethod,
      cashStatus,
      discountCodeId,
      discountAmount,
      referralCodeId,
    } = body;

    if (!customerId || !membershipPlanId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
        { status: 400 },
      );
    }

    // Determine if this is a lead or client
    const { data: clientCheck } = await supabase
      .from("clients")
      .select("id")
      .eq("id", customerId)
      .eq("org_id", user.organizationId)
      .single();

    const isClient = !!clientCheck;

    // Get membership plan to calculate end date
    const { data: plan } = await supabase
      .from("membership_plans")
      .select("billing_period")
      .eq("id", membershipPlanId)
      .eq("organization_id", user.organizationId)
      .single();

    if (!plan) {
      return NextResponse.json(
        { error: "Membership plan not found" },
        { status: 404 },
      );
    }

    // Calculate end date based on billing period
    const start = new Date(startDate);
    let endDate = null;
    if (plan.billing_period === "monthly") {
      endDate = new Date(start.setMonth(start.getMonth() + 1));
    } else if (plan.billing_period === "yearly") {
      endDate = new Date(start.setFullYear(start.getFullYear() + 1));
    }

    // Create membership
    const membershipData: any = {
      organization_id: user.organizationId,
      membership_plan_id: membershipPlanId,
      status: "active",
      start_date: startDate,
      end_date: endDate?.toISOString().split("T")[0],
      next_billing_date: endDate?.toISOString().split("T")[0],
      notes: notes || null,
      created_by: user.id,
    };

    if (isClient) {
      membershipData.client_id = customerId;
    } else {
      membershipData.customer_id = customerId;
    }

    const { data: membership, error } = await supabase
      .from("customer_memberships")
      .insert(membershipData)
      .select()
      .single();

    if (error) {
      console.error("Error creating membership:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create membership" },
        { status: 500 },
      );
    }

    // Record discount code usage if provided
    if (discountCodeId && discountAmount) {
      const { error: usageError } = await supabase
        .from("discount_code_usage")
        .insert({
          discount_code_id: discountCodeId,
          customer_id: customerId,
          membership_id: membership.id,
          amount_discounted: discountAmount,
        });

      if (usageError) {
        console.error("Error recording discount code usage:", usageError);
        // Don't fail the request - membership was created successfully
      }
    }

    // Record referral credit if provided
    if (referralCodeId) {
      // Get referral code details to calculate credit
      const { data: referralCode } = await supabase
        .from("referral_codes")
        .select("referrer_client_id, credit_amount, credit_type")
        .eq("id", referralCodeId)
        .single();

      if (referralCode) {
        // Calculate credit amount (for now, only fixed amounts are supported)
        const creditAmount = referralCode.credit_amount;

        const { error: creditError } = await supabase
          .from("referral_credits")
          .insert({
            organization_id: user.organizationId,
            referrer_client_id: referralCode.referrer_client_id,
            referee_client_id: customerId,
            referral_code_id: referralCodeId,
            membership_id: membership.id,
            credit_amount: creditAmount,
            credit_status: "pending", // Can be approved later by staff
          });

        if (creditError) {
          console.error("Error recording referral credit:", creditError);
          // Don't fail the request - membership was created successfully
        }
      }
    }

    // Get the plan price for the initial payment
    const { data: planDetails } = await supabase
      .from("membership_plans")
      .select("price_pennies, price, name")
      .eq("id", membershipPlanId)
      .single();

    if (!planDetails) {
      console.error("Could not fetch plan details for payment record");
      return NextResponse.json({ success: true, membership });
    }

    const priceInPennies = planDetails.price_pennies || planDetails.price * 100;

    // Create initial payment record based on payment method
    let paymentStatus = "pending";
    if (paymentMethod === "cash") {
      paymentStatus = cashStatus === "received" ? "succeeded" : "outstanding";
    } else if (paymentMethod === "direct_debit") {
      paymentStatus = "pending"; // Will be confirmed once mandate is set up
    } else if (paymentMethod === "card") {
      paymentStatus = "pending"; // Will be confirmed once card is charged
    }

    const paymentData = {
      organization_id: user.organizationId,
      client_id: isClient ? customerId : null,
      amount: priceInPennies,
      payment_date: startDate,
      payment_status: paymentStatus,
      payment_provider: paymentMethod, // 'cash', 'card', or 'direct_debit'
      description: `${planDetails.name} - Initial payment`,
      metadata: {
        membership_id: membership.id,
        payment_method: paymentMethod,
        cash_status: paymentMethod === "cash" ? cashStatus : undefined,
      },
    };

    const { error: paymentError } = await supabase
      .from("payments")
      .insert(paymentData);

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      // Don't fail the whole request - membership was created successfully
    }

    return NextResponse.json({ success: true, membership });
  } catch (error: any) {
    console.error("Error in POST /api/customer-memberships:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const membershipId = url.searchParams.get("id");

    if (!membershipId) {
      return NextResponse.json(
        { error: "Missing membership ID" },
        { status: 400 },
      );
    }

    // Verify the membership belongs to the user's organization
    const { data: membership, error: fetchError } = await supabase
      .from("customer_memberships")
      .select("id, organization_id")
      .eq("id", membershipId)
      .eq("organization_id", user.organizationId)
      .single();

    if (fetchError || !membership) {
      return NextResponse.json(
        { error: "Membership not found or unauthorized" },
        { status: 404 },
      );
    }

    // Delete the membership
    const { error: deleteError } = await supabase
      .from("customer_memberships")
      .delete()
      .eq("id", membershipId)
      .eq("organization_id", user.organizationId);

    if (deleteError) {
      console.error("Error deleting membership:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete membership" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE /api/customer-memberships:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
