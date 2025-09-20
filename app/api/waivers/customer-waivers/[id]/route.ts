import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

const updateCustomerWaiverSchema = z.object({
  status: z.enum(["pending", "signed", "expired", "cancelled"]).optional(),
  signature_data: z.string().optional(),
  signature_method: z.enum(["digital", "wet_signature", "uploaded"]).optional(),
  witness_name: z.string().optional(),
  witness_signature: z.string().optional(),
  witness_email: z.string().email().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Fetch customer waiver with related data
    const { data: customerWaiver, error } = await supabase
      .from("customer_waivers")
      .select(
        `
        *,
        waivers (
          id,
          title,
          waiver_type,
          content,
          requires_witness
        )
      `,
      )
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Customer waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error fetching customer waiver:", error);
      return NextResponse.json(
        { error: "Failed to fetch customer waiver" },
        { status: 500 },
      );
    }

    // Get customer details
    let customer = null;

    // Try clients table first
    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, email, phone")
      .eq("id", customerWaiver.customer_id)
      .single();

    if (clientData) {
      customer = clientData;
    } else {
      // Try leads table
      const { data: leadData } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, phone")
        .eq("id", customerWaiver.customer_id)
        .single();

      if (leadData) {
        customer = {
          ...leadData,
          name: `${leadData.first_name} ${leadData.last_name}`.trim(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...customerWaiver,
        customer,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/waivers/customer-waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCustomerWaiverSchema.parse(body);

    // Special handling for signing
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    if (validatedData.status === "signed") {
      updateData.signed_at = new Date().toISOString();
    }

    // Update customer waiver
    const { data: customerWaiver, error } = await supabase
      .from("customer_waivers")
      .update(updateData)
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .select(
        `
        *,
        waivers (
          id,
          title,
          waiver_type,
          content,
          requires_witness
        )
      `,
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Customer waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error updating customer waiver:", error);
      return NextResponse.json(
        { error: "Failed to update customer waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: customerWaiver });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error in PUT /api/waivers/customer-waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    // Get user's organization
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Mark as cancelled instead of hard delete
    const { data: customerWaiver, error } = await supabase
      .from("customer_waivers")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("organization_id", userOrg.organization_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Customer waiver not found" },
          { status: 404 },
        );
      }
      console.error("Error cancelling customer waiver:", error);
      return NextResponse.json(
        { error: "Failed to cancel customer waiver" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: customerWaiver });
  } catch (error) {
    console.error("Error in DELETE /api/waivers/customer-waivers/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
