import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = createClient();

    const itemId = params.id;
    const body = await request.json();

    // Verify item ownership
    const { data: existingItem, error: checkError } = await supabase
      .from("nutrition_shopping_list")
      .select("id")
      .eq("id", itemId)
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingItem) {
      return NextResponse.json(
        { error: "Shopping list item not found or access denied" },
        { status: 404 },
      );
    }

    // Update item - only allow updating specific fields
    const updateData: any = {};

    if (body.purchased !== undefined) {
      updateData.purchased = body.purchased;
    }

    if (body.quantity !== undefined) {
      updateData.quantity = body.quantity;
    }

    if (body.unit !== undefined) {
      updateData.unit = body.unit;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("nutrition_shopping_list")
      .update(updateData)
      .eq("id", itemId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating shopping list item:", updateError);
      return createErrorResponse(updateError, 500);
    }

    return NextResponse.json({
      success: true,
      message: "Shopping list item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error in PUT /api/nutrition/shopping-list/[id]:", error);
    return createErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = createClient();

    const itemId = params.id;

    // Verify item ownership before deletion
    const { data: existingItem, error: checkError } = await supabase
      .from("nutrition_shopping_list")
      .select("id, ingredient")
      .eq("id", itemId)
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingItem) {
      return NextResponse.json(
        { error: "Shopping list item not found or access denied" },
        { status: 404 },
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from("nutrition_shopping_list")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      console.error("Error deleting shopping list item:", deleteError);
      return createErrorResponse(deleteError, 500);
    }

    return NextResponse.json({
      success: true,
      message: `Shopping list item "${existingItem.ingredient}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/nutrition/shopping-list/[id]:", error);
    return createErrorResponse(error);
  }
}
