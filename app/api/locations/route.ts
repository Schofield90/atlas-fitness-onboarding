import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

// Validation schema for locations
const locationSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  address_line_1: z.string().min(1).max(255).trim(),
  address_line_2: z.string().max(255).optional(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().max(100).optional(),
  postal_code: z.string().min(1).max(20).trim(),
  country: z.string().min(1).max(100).trim().default("United Kingdom"),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().default(true),
  is_primary: z.boolean().default(false),
  business_hours: z
    .record(
      z.object({
        open: z.string().regex(/^\d{2}:\d{2}$/),
        close: z.string().regex(/^\d{2}:\d{2}$/),
        closed: z.boolean(),
      }),
    )
    .optional(),
  capacity: z.number().int().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

/**
 * GET /api/locations - List all locations for organization
 */
export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("include_inactive") === "true";

    let query = supabase
      .from("locations")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true });

    // Filter active locations unless explicitly requested
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error("Error fetching locations:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch locations",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      locations: locations || [],
      total: locations?.length || 0,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/locations - Create new location
 */
export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();

    const body = await request.json();
    const validated = locationSchema.parse(body);

    // If this is set as primary, unset all other primary locations
    if (validated.is_primary) {
      await supabase
        .from("locations")
        .update({ is_primary: false })
        .eq("organization_id", userWithOrg.organizationId);
    }

    // Create the location
    const { data: location, error } = await supabase
      .from("locations")
      .insert({
        organization_id: userWithOrg.organizationId,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating location:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create location",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        location,
        message: "Location created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid location data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * PUT /api/locations - Update existing location
 */
export async function PUT(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Location ID is required",
        },
        { status: 400 },
      );
    }

    // Validate update data
    const validated = locationSchema.partial().parse(updateData);

    // If this is being set as primary, unset all other primary locations
    if (validated.is_primary) {
      await supabase
        .from("locations")
        .update({ is_primary: false })
        .eq("organization_id", userWithOrg.organizationId)
        .neq("id", id);
    }

    // Update the location
    const { data: location, error } = await supabase
      .from("locations")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", userWithOrg.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating location:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update location",
        },
        { status: 500 },
      );
    }

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          error: "Location not found or unauthorized",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      location,
      message: "Location updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid location data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/locations - Delete location
 */
export async function DELETE(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("id");

    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Location ID is required",
        },
        { status: 400 },
      );
    }

    // Check if location is in use by any bookings or classes
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", userWithOrg.organizationId)
      .eq("location_id", locationId);

    const { count: classCount } = await supabase
      .from("class_sessions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", userWithOrg.organizationId)
      .eq("location_id", locationId);

    if ((bookingCount && bookingCount > 0) || (classCount && classCount > 0)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete location that has associated bookings or classes",
          usage: {
            bookings: bookingCount || 0,
            classes: classCount || 0,
          },
        },
        { status: 400 },
      );
    }

    // Delete the location
    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId)
      .eq("organization_id", userWithOrg.organizationId);

    if (error) {
      console.error("Error deleting location:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete location",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
