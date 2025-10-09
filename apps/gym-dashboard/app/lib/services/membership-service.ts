import { createClient } from "@/app/lib/supabase/client";
import { getCurrentUserOrganization } from "@/app/lib/organization-service";

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price_pennies: number;
  billing_period: string;
  features: any;
  is_active: boolean;
  trial_days?: number;
  class_limit?: number | null;
  signup_fee_pennies?: number;
  cancellation_fee_pennies?: number;
  cancellation_notice_days?: number;
  contract_length_months?: number;
  created_at: string;
  updated_at: string;
  organization_id: string;
  stats?: {
    active_members: number;
    total_revenue: number;
  };
}

export async function getMembershipPlans(): Promise<{
  plans: MembershipPlan[];
  error: string | null;
}> {
  try {
    // Use API route with proper authentication and request stats
    const response = await fetch("/api/membership-plans?include_stats=true");
    const result = await response.json();

    if (!response.ok) {
      console.error("Error fetching membership plans:", result.error);
      return {
        plans: [],
        error: result.error || "Failed to load membership plans",
      };
    }

    // Normalize the data - prioritize price_pennies, fallback to converting price
    const normalizedPlans = (result.membershipPlans || result.plans || []).map(
      (plan: any) => {
        // Use price_pennies if it exists, otherwise convert price (pounds) to pennies
        const mappedPrice =
          plan.price_pennies !== undefined && plan.price_pennies !== 0
            ? plan.price_pennies
            : plan.price
              ? plan.price * 100
              : 0;
        console.log(
          `Plan ${plan.name}: raw price=${plan.price}, raw price_pennies=${plan.price_pennies}, mapped price_pennies=${mappedPrice}`,
        );
        return {
          ...plan,
          price: plan.price, // Keep the original price field
          price_pennies: mappedPrice, // Normalized price in pennies
          features: Array.isArray(plan.features)
            ? plan.features
            : plan.features
              ? [plan.features]
              : [],
        };
      },
    );

    return { plans: normalizedPlans, error: null };
  } catch (error: any) {
    console.error("Unexpected error in getMembershipPlans:", error);
    return {
      plans: [],
      error: error.message || "Failed to fetch membership plans",
    };
  }
}

export async function createMembershipPlan(
  plan: Omit<MembershipPlan, "id" | "created_at" | "updated_at">,
): Promise<{ plan: MembershipPlan | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get organization ID
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return { plan: null, error: orgError || "No organization found" };
    }

    // Prepare plan data (map price_pennies to price column)
    const { price_pennies, ...restPlan } = plan;
    const planData = {
      ...restPlan,
      organization_id: organizationId,
      price: price_pennies || 0, // Map to 'price' column
    };

    // Create the plan
    const { data, error } = await supabase
      .from("membership_plans")
      .insert(planData)
      .select()
      .single();

    if (error) {
      console.error("Error creating membership plan:", error);
      return { plan: null, error: error.message };
    }

    return { plan: data, error: null };
  } catch (error: any) {
    console.error("Unexpected error in createMembershipPlan:", error);
    return {
      plan: null,
      error: error.message || "Failed to create membership plan",
    };
  }
}

export async function updateMembershipPlan(
  id: string,
  updates: Partial<MembershipPlan>,
): Promise<{ plan: MembershipPlan | null; error: string | null }> {
  try {
    const supabase = createClient();

    // Get organization ID to ensure we're updating our own plan
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return { plan: null, error: orgError || "No organization found" };
    }

    // Map price_pennies to price if it exists in updates
    const updateData = { ...updates };
    if ("price_pennies" in updateData) {
      updateData.price = updateData.price_pennies;
      delete updateData.price_pennies;
    }

    // Update the plan
    const { data, error } = await supabase
      .from("membership_plans")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", organizationId) // Security: ensure we only update our own plans
      .select()
      .single();

    if (error) {
      console.error("Error updating membership plan:", error);
      return { plan: null, error: error.message };
    }

    return { plan: data, error: null };
  } catch (error: any) {
    console.error("Unexpected error in updateMembershipPlan:", error);
    return {
      plan: null,
      error: error.message || "Failed to update membership plan",
    };
  }
}

export async function deleteMembershipPlan(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Get organization ID
    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return { success: false, error: orgError || "No organization found" };
    }

    // Delete the plan
    const { error } = await supabase
      .from("membership_plans")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId); // Security: ensure we only delete our own plans

    if (error) {
      console.error("Error deleting membership plan:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Unexpected error in deleteMembershipPlan:", error);
    return {
      success: false,
      error: error.message || "Failed to delete membership plan",
    };
  }
}
