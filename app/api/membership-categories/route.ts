import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/api/auth-check";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface MembershipCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/membership-categories
 * Fetch all categories for the authenticated user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: categories, error } = await supabase
      .from("membership_categories")
      .select("*")
      .eq("organization_id", user.organizationId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/membership-categories
 * Create a new membership category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { name, description, color = "#6B7280", display_order = 0 } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check for duplicate category names
    const { data: existing } = await supabase
      .from("membership_categories")
      .select("id")
      .eq("organization_id", user.organizationId)
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 },
      );
    }

    // Create the category
    const { data: category, error } = await supabase
      .from("membership_categories")
      .insert({
        organization_id: user.organizationId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6B7280",
        display_order: display_order || 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/membership-categories
 * Update an existing membership category
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, name, description, color, display_order } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify category belongs to organization
    const { data: existingCategory } = await supabase
      .from("membership_categories")
      .select("id")
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .maybeSingle();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Check for name conflicts if name is being changed
    if (name) {
      const { data: duplicate } = await supabase
        .from("membership_categories")
        .select("id")
        .eq("organization_id", user.organizationId)
        .eq("name", name.trim())
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 },
        );
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (color !== undefined) updateData.color = color;
    if (display_order !== undefined) updateData.display_order = display_order;

    // Update the category
    const { data: category, error } = await supabase
      .from("membership_categories")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error: any) {
    console.error("Update category error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/membership-categories?id=<category_id>
 * Delete a membership category (sets category_id to NULL for associated plans)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify category belongs to organization
    const { data: existingCategory } = await supabase
      .from("membership_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("organization_id", user.organizationId)
      .maybeSingle();

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    // Delete the category (ON DELETE SET NULL will handle removing the category from plans)
    const { error } = await supabase
      .from("membership_categories")
      .delete()
      .eq("id", categoryId)
      .eq("organization_id", user.organizationId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 },
    );
  }
}
