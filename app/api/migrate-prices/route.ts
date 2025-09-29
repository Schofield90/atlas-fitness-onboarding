import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization - try both tables
    let organizationId: string | null = null;
    let userRole: string | null = null;

    // Try user_organizations first (newer table)
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .single();

    if (userOrg) {
      organizationId = userOrg.organization_id;
      userRole = userOrg.role;
    } else {
      // Fallback to organization_members (older table)
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .single();

      if (orgMember) {
        organizationId = orgMember.organization_id;
        userRole = orgMember.role || "admin"; // Default to admin if no role
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    if (userRole && !["owner", "admin"].includes(userRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // First, check if there are any plans with a price column but null price_pennies
    const { data: checkData, error: checkError } = await supabase
      .from("membership_plans")
      .select("id, name, price, price_pennies")
      .eq("organization_id", organizationId);

    if (checkError) {
      console.error("Error checking plans:", checkError);
      return NextResponse.json(
        { error: "Failed to check plans" },
        { status: 500 },
      );
    }

    // Find plans that need migration
    const plansNeedingMigration =
      checkData?.filter(
        (plan) =>
          plan.price !== null &&
          plan.price !== undefined &&
          (plan.price_pennies === null || plan.price_pennies === 0) &&
          plan.price > 0,
      ) || [];

    console.log("Plans needing migration:", plansNeedingMigration);

    if (plansNeedingMigration.length === 0) {
      return NextResponse.json({
        message: "No plans need migration",
        checked: checkData?.length || 0,
        migrated: 0,
      });
    }

    // Migrate each plan
    let migrationCount = 0;
    const errors: string[] = [];

    for (const plan of plansNeedingMigration) {
      const pricePennies = Math.round((plan.price || 0) * 100);

      const { error: updateError } = await supabase
        .from("membership_plans")
        .update({
          price_pennies: pricePennies,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq("organization_id", organizationId);

      if (updateError) {
        console.error(`Error updating plan ${plan.id}:`, updateError);
        errors.push(`Failed to update ${plan.name}: ${updateError.message}`);
      } else {
        migrationCount++;
        console.log(
          `Migrated ${plan.name}: £${plan.price} -> ${pricePennies} pennies`,
        );
      }
    }

    // Also update signup_fee_pennies and cancellation_fee_pennies if they're null
    const { error: feesError } = await supabase
      .from("membership_plans")
      .update({
        signup_fee_pennies: 0,
        cancellation_fee_pennies: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .or("signup_fee_pennies.is.null,cancellation_fee_pennies.is.null");

    if (feesError) {
      console.error("Error updating fees:", feesError);
      errors.push(`Warning: Could not update fee fields: ${feesError.message}`);
    }

    // Verify the migration
    const { data: verifyData, error: verifyError } = await supabase
      .from("membership_plans")
      .select("id, name, price, price_pennies")
      .eq("organization_id", organizationId);

    if (verifyError) {
      console.error("Error verifying:", verifyError);
    }

    const verificationResults =
      verifyData?.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        price_pennies: plan.price_pennies,
        status:
          plan.price && plan.price_pennies === plan.price * 100
            ? "MIGRATED_SUCCESSFULLY"
            : plan.price_pennies && !plan.price
              ? "PRICE_PENNIES_ONLY"
              : plan.price && plan.price_pennies !== plan.price * 100
                ? "MIGRATION_MISMATCH"
                : "NO_DATA",
      })) || [];

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migrationCount} plans updated`,
      checked: checkData?.length || 0,
      migrated: migrationCount,
      errors: errors.length > 0 ? errors : undefined,
      verification: verificationResults,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check current status
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization - try both tables
    let organizationId: string | null = null;

    // Try user_organizations first (newer table)
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (userOrg) {
      organizationId = userOrg.organization_id;
    } else {
      // Fallback to organization_members (older table)
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (orgMember) {
        organizationId = orgMember.organization_id;
      }
    }

    if (!organizationId) {
      console.error("No organization found for user:", user.id);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get all plans and their price status
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("id, name, price, price_pennies")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (plansError) {
      console.error("Error fetching plans:", plansError);
      return NextResponse.json(
        { error: "Failed to fetch plans" },
        { status: 500 },
      );
    }

    const status =
      plans?.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        price_pennies: plan.price_pennies,
        needs_migration:
          plan.price !== null &&
          plan.price > 0 &&
          (plan.price_pennies === null || plan.price_pennies === 0),
      })) || [];

    const summary = {
      total_plans: status.length,
      plans_with_price: status.filter((p) => p.price !== null).length,
      plans_with_price_pennies: status.filter(
        (p) => p.price_pennies !== null && p.price_pennies > 0,
      ).length,
      needs_migration: status.filter((p) => p.needs_migration).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      plans: status,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error: "Status check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
