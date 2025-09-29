import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { z } from "zod";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

// Validation schema for creating/updating email templates
const emailTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(200),
  type: z.enum(["email", "sms", "whatsapp"]).default("email"),
  category: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  is_active: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const isActive = searchParams.get("is_active");

    // Build query
    let query = supabase
      .from("message_templates")
      .select("*")
      .eq("organization_id", userWithOrg.organizationId)
      .order("created_at", { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error("Error fetching email templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 },
      );
    }

    // Get usage stats for each template
    const templatesWithStats = await Promise.all(
      (templates || []).map(async (template) => {
        // Count how many times this template has been used
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("template_id", template.id);

        return {
          ...template,
          usage_count: count || 0,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      templates: templatesWithStats,
      total: templatesWithStats.length,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validated = emailTemplateSchema.parse(body);

    // Extract variables from content
    const contentVariables = extractVariables(validated.content);
    const allVariables = Array.from(
      new Set([...contentVariables, ...(validated.variables || [])]),
    );

    // Create the template
    const { data: template, error } = await supabase
      .from("message_templates")
      .insert({
        organization_id: userWithOrg.organizationId,
        name: validated.name,
        subject: validated.subject,
        type: validated.type,
        category: validated.category,
        content: validated.content,
        variables: allVariables,
        is_active: validated.is_active,
        tags: validated.tags,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating email template:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid template data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    // Validate update data
    const validated = emailTemplateSchema.partial().parse(updateData);

    // If content is being updated, extract variables
    if (validated.content) {
      const contentVariables = extractVariables(validated.content);
      validated.variables = Array.from(
        new Set([...contentVariables, ...(validated.variables || [])]),
      );
    }

    // Update the template
    const { data: template, error } = await supabase
      .from("message_templates")
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", userWithOrg.organizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating email template:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid template data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    // Check if template is in use by any active workflows
    const { data: workflows } = await supabase
      .from("workflows")
      .select("id, name")
      .eq("organization_id", userWithOrg.organizationId)
      .eq("status", "active")
      .contains("nodes", [{ data: { templateId } }]);

    if (workflows && workflows.length > 0) {
      return NextResponse.json(
        {
          error: "Template is in use by active workflows",
          workflows: workflows.map((w) => ({ id: w.id, name: w.name })),
        },
        { status: 400 },
      );
    }

    // Delete the template
    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", userWithOrg.organizationId);

    if (error) {
      console.error("Error deleting email template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      deleted: templateId,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// Helper function to extract variables from template content
function extractVariables(content: string): string[] {
  const regex = /{{(\w+)}}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  // Common variables that should always be available
  const commonVariables = [
    "name",
    "firstName",
    "lastName",
    "email",
    "phone",
    "organizationName",
  ];

  return Array.from(new Set([...variables, ...commonVariables]));
}
