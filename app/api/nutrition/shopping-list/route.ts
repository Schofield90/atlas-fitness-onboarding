import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { ShoppingListItem } from "@/app/lib/types/nutrition";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get("week") || "1");
    const showPurchased = searchParams.get("show_purchased") === "true";

    // Validate week parameter
    if (week < 1 || week > 4) {
      return NextResponse.json(
        { error: "Invalid week parameter. Must be between 1 and 4." },
        { status: 400 },
      );
    }

    // Build query
    let query = supabase
      .from("nutrition_shopping_list")
      .select("*")
      .eq("user_id", userWithOrg.id)
      .eq("organization_id", userWithOrg.organizationId)
      .eq("week", week)
      .order("category", { ascending: true })
      .order("ingredient", { ascending: true });

    // Filter out purchased items unless requested
    if (!showPurchased) {
      query = query.eq("purchased", false);
    }

    const { data: shoppingList, error } = await query;

    if (error) {
      console.error("Error fetching shopping list:", error);
      return createErrorResponse(error, 500);
    }

    // Group items by category for better organization
    const groupedItems = (shoppingList || []).reduce(
      (acc: any, item: ShoppingListItem) => {
        const category = item.category || "Other";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {},
    );

    return NextResponse.json({
      success: true,
      data: {
        week,
        items: shoppingList || [],
        grouped: groupedItems,
        summary: {
          total: shoppingList?.length || 0,
          purchased: shoppingList?.filter((item) => item.purchased).length || 0,
          remaining:
            shoppingList?.filter((item) => !item.purchased).length || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error in GET /api/nutrition/shopping-list:", error);
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const body = await request.json();

    // Validate required fields
    if (!body.ingredient || body.quantity === undefined || !body.unit) {
      return NextResponse.json(
        { error: "Missing required fields: ingredient, quantity, unit" },
        { status: 400 },
      );
    }

    const week = body.week || 1;

    // Validate week parameter
    if (week < 1 || week > 4) {
      return NextResponse.json(
        { error: "Invalid week parameter. Must be between 1 and 4." },
        { status: 400 },
      );
    }

    // Create new shopping list item
    const newItem: Omit<ShoppingListItem, "id" | "created_at"> = {
      user_id: userWithOrg.id,
      organization_id: userWithOrg.organizationId,
      ingredient: body.ingredient,
      quantity: body.quantity,
      unit: body.unit,
      category: body.category || categorizeIngredient(body.ingredient),
      week: week,
      purchased: false,
    };

    const { data: createdItem, error } = await supabase
      .from("nutrition_shopping_list")
      .insert(newItem)
      .select()
      .single();

    if (error) {
      console.error("Error creating shopping list item:", error);
      return createErrorResponse(error, 500);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item added to shopping list",
        data: createdItem,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/nutrition/shopping-list:", error);
    return createErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();

    // Create Supabase client
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get("week") || "1");
    const clearPurchased = searchParams.get("clear_purchased") === "true";

    // Validate week parameter
    if (week < 1 || week > 4) {
      return NextResponse.json(
        { error: "Invalid week parameter. Must be between 1 and 4." },
        { status: 400 },
      );
    }

    if (clearPurchased) {
      // Clear all purchased items for the week
      const { error, count } = await supabase
        .from("nutrition_shopping_list")
        .delete()
        .eq("user_id", userWithOrg.id)
        .eq("organization_id", userWithOrg.organizationId)
        .eq("week", week)
        .eq("purchased", true);

      if (error) {
        console.error("Error clearing purchased items:", error);
        return createErrorResponse(error, 500);
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${count || 0} purchased items from week ${week}`,
        data: {
          deletedCount: count || 0,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Specify clear_purchased=true to delete items" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in DELETE /api/nutrition/shopping-list:", error);
    return createErrorResponse(error);
  }
}

function categorizeIngredient(ingredient: string): string {
  const categories: { [key: string]: string[] } = {
    Produce: [
      "apple",
      "banana",
      "berry",
      "tomato",
      "lettuce",
      "spinach",
      "carrot",
      "onion",
      "garlic",
      "pepper",
      "broccoli",
      "cucumber",
      "avocado",
      "fruit",
      "vegetable",
    ],
    Protein: [
      "chicken",
      "beef",
      "pork",
      "fish",
      "salmon",
      "tuna",
      "egg",
      "tofu",
      "beans",
      "lentils",
      "nuts",
      "meat",
      "turkey",
      "shrimp",
    ],
    Dairy: ["milk", "cheese", "yogurt", "butter", "cream", "cottage"],
    Grains: [
      "rice",
      "bread",
      "pasta",
      "oats",
      "quinoa",
      "flour",
      "cereal",
      "wheat",
    ],
    Pantry: [
      "oil",
      "salt",
      "pepper",
      "spice",
      "sauce",
      "vinegar",
      "honey",
      "sugar",
      "seasoning",
    ],
  };

  const lower = ingredient.toLowerCase();

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}
