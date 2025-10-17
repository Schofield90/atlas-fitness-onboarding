import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { createClient } from "@/app/lib/supabase/server";
import { z } from "zod";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Validation schema for tags
const tagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
  description: z.string().max(200).optional(),
  type: z.enum(["lead", "customer", "general"]).default("general"),
});

/**
 * GET /api/tags - List all tags for organization
 */
export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let query = supabase
      .from("tags")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .order("name", { ascending: true });

    // Filter by type if specified
    if (type && ["lead", "customer", "general"].includes(type)) {
      query = query.eq("type", type);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error("Error fetching tags:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch tags",
        },
        { status: 500 },
      );
    }

    // Batch fetch usage counts for all tags in 2 queries instead of 2N
    const tagNames = (tags || []).map((tag) => tag.name);

    // Get all lead and contact tag usage in parallel
    const [leadData, contactData] = await Promise.all([
      // Get all leads with tags
      tagNames.length > 0
        ? supabase
            .from("leads")
            .select("tags")
            .eq("organization_id", userWithOrg.organizationId)
            .not("tags", "is", null)
        : Promise.resolve({ data: [] }),

      // Get all contacts with tags
      tagNames.length > 0
        ? supabase
            .from("contacts")
            .select("tags")
            .eq("organization_id", userWithOrg.organizationId)
            .not("tags", "is", null)
        : Promise.resolve({ data: [] }),
    ]);

    // Count tag occurrences
    const tagUsageMap = new Map<string, number>();

    // Count from leads
    for (const lead of leadData.data || []) {
      if (lead.tags && Array.isArray(lead.tags)) {
        for (const tag of lead.tags) {
          tagUsageMap.set(tag, (tagUsageMap.get(tag) || 0) + 1);
        }
      }
    }

    // Count from contacts
    for (const contact of contactData.data || []) {
      if (contact.tags && Array.isArray(contact.tags)) {
        for (const tag of contact.tags) {
          tagUsageMap.set(tag, (tagUsageMap.get(tag) || 0) + 1);
        }
      }
    }

    // Add usage count to each tag
    const tagsWithUsage = (tags || []).map((tag) => ({
      ...tag,
      usage_count: tagUsageMap.get(tag.name) || 0,
    }));

    return NextResponse.json({
      success: true,
      tags: tagsWithUsage,
      total: tagsWithUsage.length,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/tags - Create new tag
 */
export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validated = tagSchema.parse(body);

    // Check if tag name already exists for this organization
    const { data: existingTag } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", userWithOrg.organizationId)
      .ilike("name", validated.name)
      .single();

    if (existingTag) {
      return NextResponse.json(
        {
          success: false,
          error: "Tag with this name already exists",
        },
        { status: 409 },
      );
    }

    // Create the tag
    const { data: tag, error } = await supabase
      .from("tags")
      .insert({
        organization_id: userWithOrg.organizationId,
        name: validated.name,
        color: validated.color,
        description: validated.description || null,
        type: validated.type,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tag:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create tag",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        tag,
        message: "Tag created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tag data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * PUT /api/tags - Update existing tag
 */
export async function PUT(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Tag ID is required",
        },
        { status: 400 },
      );
    }

    // Validate update data
    const validated = tagSchema.partial().parse(updateData);

    // If name is being updated, check for duplicates
    if (validated.name) {
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .eq("organization_id", userWithOrg.organizationId)
        .ilike("name", validated.name)
        .neq("id", id)
        .single();

      if (existingTag) {
        return NextResponse.json(
          {
            success: false,
            error: "Tag with this name already exists",
          },
          { status: 409 },
        );
      }
    }

    // Update the tag
    const { data: tag, error } = await supabase
      .from("tags")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", userWithOrg.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating tag:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update tag",
        },
        { status: 500 },
      );
    }

    if (!tag) {
      return NextResponse.json(
        {
          success: false,
          error: "Tag not found or unauthorized",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      tag,
      message: "Tag updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tag data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/tags - Delete tag
 */
export async function DELETE(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("id");

    if (!tagId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tag ID is required",
        },
        { status: 400 },
      );
    }

    // Check if tag is in use
    const { count: leadUsage } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", userWithOrg.organizationId)
      .like("tags", `%"${tagId}"%`);

    if (leadUsage && leadUsage > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete tag that is currently in use",
          usage_count: leadUsage,
        },
        { status: 400 },
      );
    }

    // Delete the tag
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId)
      .eq("organization_id", userWithOrg.organizationId);

    if (error) {
      console.error("Error deleting tag:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete tag",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
