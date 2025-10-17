import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Validation schema for organization settings
const settingsSchema = z
  .object({
    business_name: z.string().min(1).max(200).optional(),
    business_description: z.string().max(1000).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().max(20).optional(),
    address_line_1: z.string().max(255).optional(),
    address_line_2: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postal_code: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    website_url: z.string().url().optional(),
    logo_url: z.string().url().optional(),
    primary_color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .optional(),
    secondary_color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .optional(),
    business_hours: z
      .record(
        z.object({
          open: z.string().regex(/^\d{2}:\d{2}$/),
          close: z.string().regex(/^\d{2}:\d{2}$/),
          closed: z.boolean(),
        }),
      )
      .optional(),
    timezone: z.string().optional(),
    currency: z.string().length(3).optional(),
    language: z.string().length(2).optional(),
  })
  .partial();

/**
 * GET /api/settings - Get organization settings
 */
export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    // Get organization settings
    const { data: settings, error } = await supabase
      .from("organization_settings")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching organization settings:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch settings",
        },
        { status: 500 },
      );
    }

    // If no settings exist, create default ones
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from("organization_settings")
        .insert({
          organization_id: userWithOrg.organizationId,
          business_name: "My Business",
          currency: "GBP",
          timezone: "Europe/London",
          language: "en",
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating default settings:", createError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create default settings",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        settings: newSettings,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/settings - Update organization settings
 */
export async function PUT(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validated = settingsSchema.parse(body);

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from("organization_settings")
      .select("id")
      .eq("organization_id", userWithOrg.organizationId)
      .single();

    let result;

    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from("organization_settings")
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", userWithOrg.organizationId)
        .select()
        .single();

      if (error) {
        console.error("Error updating organization settings:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update settings",
          },
          { status: 500 },
        );
      }

      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from("organization_settings")
        .insert({
          organization_id: userWithOrg.organizationId,
          ...validated,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating organization settings:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create settings",
          },
          { status: 500 },
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      settings: result,
      message: "Settings saved successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/settings - Partially update organization settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validated = settingsSchema.parse(body);

    // Update only provided fields
    const { data: settings, error } = await supabase
      .from("organization_settings")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", userWithOrg.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization settings:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update settings",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      settings,
      message: "Settings updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}
