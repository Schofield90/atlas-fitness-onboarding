import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireAdminAccess } from "@/app/lib/admin/impersonation";

export async function GET() {
  try {
    const { isAdmin } = await requireAdminAccess();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: organizations, error } = await supabase
      .from("admin_organization_metrics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { isAdmin } = await requireAdminAccess();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      email,
      phone,
      address,
      subscription_status = "trialing",
    } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        email,
        phone,
        address,
        subscription_status,
        settings: {
          timezone: "Europe/London",
          currency: "GBP",
          date_format: "DD/MM/YYYY",
        },
      })
      .select()
      .single();

    if (orgError) {
      throw orgError;
    }

    return NextResponse.json({
      success: true,
      organization: org,
      message: "Organization created successfully",
    });
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 },
    );
  }
}
