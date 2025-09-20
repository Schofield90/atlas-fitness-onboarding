import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const mealId = params.id;

    // Get meal with ingredients and verify ownership through meal plan
    const { data: meal, error } = await supabase
      .from("nutrition_meals")
      .select(
        `
        *,
        nutrition_ingredients (*),
        nutrition_meal_plans!inner (
          user_id,
          organization_id
        )
      `,
      )
      .eq("id", mealId)
      .eq("nutrition_meal_plans.user_id", userWithOrg.id)
      .eq("nutrition_meal_plans.organization_id", userWithOrg.organizationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return NextResponse.json(
          { error: "Meal not found or access denied" },
          { status: 404 },
        );
      }
      console.error("Error fetching meal:", error);
      return createErrorResponse(error, 500);
    }

    // Format response
    const formattedMeal = {
      ...meal,
      ingredients: meal.nutrition_ingredients || [],
    };

    // Remove the joined meal plan data from response
    delete formattedMeal.nutrition_meal_plans;

    return NextResponse.json({
      success: true,
      data: formattedMeal,
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/meals/[id]:", error);
    return createErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const mealId = params.id;
    const body = await request.json();

    // Verify meal ownership through meal plan
    const { data: existingMeal, error: checkError } = await supabase
      .from("nutrition_meals")
      .select(
        `
        id,
        nutrition_meal_plans!inner (
          user_id,
          organization_id
        )
      `,
      )
      .eq("id", mealId)
      .eq("nutrition_meal_plans.user_id", userWithOrg.id)
      .eq("nutrition_meal_plans.organization_id", userWithOrg.organizationId)
      .single();

    if (checkError || !existingMeal) {
      return NextResponse.json(
        { error: "Meal not found or access denied" },
        { status: 404 },
      );
    }

    // Update meal data
    const mealUpdateData: any = {};

    // Only update allowed fields
    const allowedFields = [
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
      "recipe",
      "prep_minutes",
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        mealUpdateData[field] = body[field];
      }
    }

    if (Object.keys(mealUpdateData).length > 0) {
      mealUpdateData.updated_at = new Date().toISOString();

      const { data: updatedMeal, error: updateError } = await supabase
        .from("nutrition_meals")
        .update(mealUpdateData)
        .eq("id", mealId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating meal:", updateError);
        return createErrorResponse(updateError, 500);
      }
    }

    // Handle ingredients update if provided
    if (body.ingredients && Array.isArray(body.ingredients)) {
      // Delete existing ingredients
      await supabase
        .from("nutrition_ingredients")
        .delete()
        .eq("meal_id", mealId);

      // Insert new ingredients
      if (body.ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("nutrition_ingredients")
          .insert(
            body.ingredients.map((ing: any) => ({
              meal_id: mealId,
              item: ing.item,
              grams: ing.grams,
              calories: ing.calories || 0,
              protein: ing.protein || 0,
              carbs: ing.carbs || 0,
              fat: ing.fat || 0,
            })),
          );

        if (ingredientsError) {
          console.error("Error updating ingredients:", ingredientsError);
          return createErrorResponse(ingredientsError, 500);
        }
      }
    }

    // Fetch and return updated meal with ingredients
    const { data: finalMeal, error: fetchError } = await supabase
      .from("nutrition_meals")
      .select(
        `
        *,
        nutrition_ingredients (*)
      `,
      )
      .eq("id", mealId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated meal:", fetchError);
      return createErrorResponse(fetchError, 500);
    }

    return NextResponse.json({
      success: true,
      message: "Meal updated successfully",
      data: {
        ...finalMeal,
        ingredients: finalMeal.nutrition_ingredients || [],
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/nutrition/meals/[id]:", error);
    return createErrorResponse(error);
  }
}
