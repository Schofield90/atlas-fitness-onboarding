import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Simplified migration endpoint - runs for ALL membership plans in the database
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user (for basic auth check)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Running migration for user:", user.email);

    // Get ALL plans that have price but not price_pennies
    const { data: checkData, error: checkError } = await supabase
      .from("membership_plans")
      .select("id, organization_id, name, price, price_pennies");

    if (checkError) {
      console.error("Error checking plans:", checkError);
      return NextResponse.json(
        { error: "Failed to check plans", details: checkError.message },
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

    console.log(
      `Found ${plansNeedingMigration.length} plans needing migration out of ${checkData?.length || 0} total`,
    );

    if (plansNeedingMigration.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No plans need migration",
        checked: checkData?.length || 0,
        migrated: 0,
        allPlans: checkData?.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          price_pennies: p.price_pennies,
          org_id: p.organization_id,
        })),
      });
    }

    // Migrate each plan
    let migrationCount = 0;
    const migrationResults: any[] = [];
    const errors: string[] = [];

    for (const plan of plansNeedingMigration) {
      const pricePennies = Math.round((plan.price || 0) * 100);

      console.log(
        `Migrating ${plan.name} (${plan.organization_id}): £${plan.price} -> ${pricePennies} pennies`,
      );

      const { error: updateError } = await supabase
        .from("membership_plans")
        .update({
          price_pennies: pricePennies,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (updateError) {
        console.error(`Error updating plan ${plan.id}:`, updateError);
        errors.push(`Failed to update ${plan.name}: ${updateError.message}`);
        migrationResults.push({
          id: plan.id,
          name: plan.name,
          status: "FAILED",
          error: updateError.message,
        });
      } else {
        migrationCount++;
        migrationResults.push({
          id: plan.id,
          name: plan.name,
          oldPrice: plan.price,
          newPricePennies: pricePennies,
          status: "SUCCESS",
        });
      }
    }

    // Also ensure signup_fee_pennies and cancellation_fee_pennies have defaults
    await supabase
      .from("membership_plans")
      .update({
        signup_fee_pennies: 0,
        cancellation_fee_pennies: 0,
      })
      .or("signup_fee_pennies.is.null,cancellation_fee_pennies.is.null");

    // Verify the migration
    const { data: verifyData } = await supabase
      .from("membership_plans")
      .select("id, name, price, price_pennies");

    const finalStatus =
      verifyData?.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        price_pennies: plan.price_pennies,
        status:
          plan.price_pennies && plan.price_pennies > 0
            ? "OK"
            : "NEEDS_ATTENTION",
      })) || [];

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migrationCount} of ${plansNeedingMigration.length} plans updated`,
      checked: checkData?.length || 0,
      attempted: plansNeedingMigration.length,
      migrated: migrationCount,
      results: migrationResults,
      errors: errors.length > 0 ? errors : undefined,
      finalStatus,
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

// GET endpoint to check current status of ALL plans
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user (for basic auth check)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get ALL plans and their price status
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("id, organization_id, name, price, price_pennies")
      .order("created_at", { ascending: false });

    if (plansError) {
      console.error("Error fetching plans:", plansError);
      return NextResponse.json(
        {
          error: "Failed to fetch plans",
          details: plansError.message,
        },
        { status: 500 },
      );
    }

    const status =
      plans?.map((plan) => ({
        id: plan.id,
        organization_id: plan.organization_id,
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
      plans_with_price: status.filter((p) => p.price !== null && p.price > 0)
        .length,
      plans_with_price_pennies: status.filter(
        (p) => p.price_pennies !== null && p.price_pennies > 0,
      ).length,
      needs_migration: status.filter((p) => p.needs_migration).length,
    };

    console.log("Status check summary:", summary);

    return NextResponse.json({
      success: true,
      summary,
      plans: status,
      user: user.email,
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
