import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { parse } from "csv-parse/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Import memberships from GoTeamUp customer CSV export
 *
 * Creates membership plans and assigns clients based on:
 * - Active Memberships column
 * - Last Payment Amount column
 * - Payment terms from membership name
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const organizationId = formData.get("organizationId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 },
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Read CSV file
    const csvText = await file.text();

    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    });

    console.log(`Parsed ${records.length} records from CSV`);

    // Track stats
    let plansCreated = 0;
    let membershipsCreated = 0;
    let membershipsUpdated = 0;
    let clientsNotFound = 0;
    let skippedNoMembership = 0;

    const processedPlans = new Map<string, string>(); // membershipKey -> planId
    const failures: Array<{
      email: string;
      reason: string;
      membership: string;
    }> = [];

    // PHASE 1: Create unique membership plans
    for (const record of records) {
      const activeMemberships = record["Active Memberships"]?.trim();
      const lastPaymentAmount = parseFloat(
        record["Last Payment Amount (GBP)"] || "0",
      );

      if (!activeMemberships || activeMemberships === "") {
        continue; // Skip clients without active memberships
      }

      // Parse payment amount to pennies
      const amountPennies = Math.round(lastPaymentAmount * 100);

      // Create a unique key for this membership plan
      const membershipKey = `${activeMemberships}|${amountPennies}`;

      if (processedPlans.has(membershipKey)) {
        continue; // Already created this plan
      }

      // Extract billing period from membership name
      let billingPeriod = "monthly"; // default
      const nameLower = activeMemberships.toLowerCase();

      if (nameLower.includes("week") && !nameLower.includes("month")) {
        billingPeriod = "weekly";
      } else if (nameLower.includes("year") || nameLower.includes("12 month")) {
        billingPeriod = "yearly";
      } else if (nameLower.includes("lifetime") || nameLower.includes("life time")) {
        billingPeriod = "one-time";
      }

      // Check if plan already exists in database
      const { data: existingPlan } = await supabaseAdmin
        .from("membership_plans")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("name", activeMemberships)
        .eq("price_pennies", amountPennies)
        .maybeSingle();

      if (existingPlan) {
        processedPlans.set(membershipKey, existingPlan.id);
        console.log(`Plan already exists: ${activeMemberships}`);
        continue;
      }

      // Create new membership plan
      const { data: newPlan, error: planError } = await supabaseAdmin
        .from("membership_plans")
        .insert({
          organization_id: organizationId,
          name: activeMemberships,
          description: `Imported from GoTeamUp - ${activeMemberships}`,
          price_pennies: amountPennies,
          price: lastPaymentAmount,
          billing_period: billingPeriod,
          is_active: true,
          payment_provider: "manual", // GoTeamUp manages billing
          metadata: {
            imported_from: "goteamup",
            import_date: new Date().toISOString(),
            original_name: activeMemberships,
          },
        })
        .select("id")
        .single();

      if (planError) {
        console.error(`Error creating plan "${activeMemberships}":`, planError);
        failures.push({
          email: "N/A",
          reason: `Failed to create plan: ${planError.message}`,
          membership: activeMemberships,
        });
        continue;
      }

      if (newPlan) {
        processedPlans.set(membershipKey, newPlan.id);
        plansCreated++;
        console.log(
          `✅ Created plan: ${activeMemberships} (£${lastPaymentAmount})`,
        );
      }
    }

    // PHASE 2: Assign clients to their memberships
    for (const record of records) {
      const email = record["Email"]?.trim().toLowerCase();
      const activeMemberships = record["Active Memberships"]?.trim();
      const lastPaymentAmount = parseFloat(
        record["Last Payment Amount (GBP)"] || "0",
      );
      const lastPaymentDate = record["Last Payment Date"]?.trim();
      const status = record["Status"]?.trim().toLowerCase();

      if (!email) {
        continue;
      }

      if (!activeMemberships || activeMemberships === "") {
        skippedNoMembership++;
        continue;
      }

      // Find client by email
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id, email")
        .eq("org_id", organizationId)
        .ilike("email", email)
        .maybeSingle();

      if (!client) {
        clientsNotFound++;
        failures.push({
          email,
          reason: "Client not found in database",
          membership: activeMemberships,
        });
        continue;
      }

      // Get the plan ID for this membership
      const amountPennies = Math.round(lastPaymentAmount * 100);
      const membershipKey = `${activeMemberships}|${amountPennies}`;
      const planId = processedPlans.get(membershipKey);

      if (!planId) {
        failures.push({
          email,
          reason: "Membership plan not found/created",
          membership: activeMemberships,
        });
        continue;
      }

      // Check if membership already exists
      const { data: existingMembership } = await supabaseAdmin
        .from("customer_memberships")
        .select("id")
        .eq("client_id", client.id)
        .eq("membership_plan_id", planId)
        .maybeSingle();

      if (existingMembership) {
        // Update existing membership
        const { error: updateError } = await supabaseAdmin
          .from("customer_memberships")
          .update({
            status: status === "active" ? "active" : "inactive",
            payment_status: "current",
            payment_provider: "manual",
            next_billing_date: lastPaymentDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingMembership.id);

        if (!updateError) {
          membershipsUpdated++;
        }
      } else {
        // Create new membership
        const { error: membershipError } = await supabaseAdmin
          .from("customer_memberships")
          .insert({
            client_id: client.id,
            organization_id: organizationId,
            membership_plan_id: planId,
            status: status === "active" ? "active" : "inactive",
            payment_status: "current",
            payment_provider: "manual",
            start_date: lastPaymentDate || new Date().toISOString().split("T")[0],
            next_billing_date: lastPaymentDate || null,
            metadata: {
              imported_from: "goteamup",
              import_date: new Date().toISOString(),
            },
          });

        if (!membershipError) {
          membershipsCreated++;
          console.log(`✅ Assigned ${email} to ${activeMemberships}`);
        } else {
          console.error(`Error creating membership for ${email}:`, membershipError);
          failures.push({
            email,
            reason: membershipError.message,
            membership: activeMemberships,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords: records.length,
        plansCreated,
        membershipsCreated,
        membershipsUpdated,
        skippedNoMembership,
        clientsNotFound,
        failures: failures.length,
      },
      message: `Created ${plansCreated} plans and assigned ${membershipsCreated} memberships (${membershipsUpdated} updated)`,
      failures: failures.slice(0, 10), // First 10 failures for debugging
    });
  } catch (error: any) {
    console.error("GoTeamUp membership import error:", error);
    return NextResponse.json(
      { error: `Import failed: ${error.message}` },
      { status: 500 },
    );
  }
}
