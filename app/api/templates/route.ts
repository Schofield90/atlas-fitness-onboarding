import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getUserAndOrganization } from "@/app/lib/auth-utils";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

interface Template {
  id?: string;
  name: string;
  description?: string;
  type: "email" | "sms" | "whatsapp";
  subject?: string; // For email templates
  content: string;
  variables?: string[]; // Available variables like {{name}}, {{email}}
  is_active: boolean;
  category?: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

interface TemplateRequest {
  name: string;
  description?: string;
  type: "email" | "sms" | "whatsapp";
  subject?: string;
  content: string;
  variables?: string[];
  is_active?: boolean;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TemplateRequest = await request.json();
    const {
      name,
      description,
      type,
      subject,
      content,
      variables,
      is_active,
      category,
    } = body;

    // Validate required fields
    if (!name?.trim() || !type || !content?.trim()) {
      return NextResponse.json(
        {
          error: "Name, type, and content are required",
        },
        { status: 400 },
      );
    }

    if (type === "email" && !subject?.trim()) {
      return NextResponse.json(
        {
          error: "Subject is required for email templates",
        },
        { status: 400 },
      );
    }

    // Extract variables from content
    const extractedVariables = extractVariablesFromContent(content);
    if (subject && type === "email") {
      extractedVariables.push(...extractVariablesFromContent(subject));
    }

    // Remove duplicates
    const allVariables = Array.from(
      new Set([...extractedVariables, ...(variables || [])]),
    );

    // Check for duplicate names
    const { data: existingTemplate } = await supabase
      .from("message_templates")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("name", name.trim())
      .single();

    if (existingTemplate) {
      return NextResponse.json(
        {
          error: "A template with this name already exists",
        },
        { status: 400 },
      );
    }

    // Create template
    const { data: template, error } = await supabase
      .from("message_templates")
      .insert({
        organization_id: organization.id,
        name: name.trim(),
        description: description?.trim() || "",
        type,
        subject: type === "email" ? subject?.trim() : null,
        content: content.trim(),
        variables: allVariables,
        is_active: is_active !== undefined ? is_active : true,
        category: category?.trim() || "general",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
      message: "Template created successfully",
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const activeOnly = url.searchParams.get("active_only") === "true";
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("message_templates")
      .select("*")
      .eq("organization_id", organization.id);

    if (type) {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const {
      data: templates,
      error,
      count,
    } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 },
      );
    }

    // Get template categories
    const { data: categories } = await supabase
      .from("message_templates")
      .select("category")
      .eq("organization_id", organization.id)
      .not("category", "is", null);

    const uniqueCategories = Array.from(
      new Set((categories || []).map((c) => c.category).filter(Boolean)),
    );

    return NextResponse.json({
      templates: templates || [],
      categories: uniqueCategories,
      total: count,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    // Verify template belongs to organization
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("message_templates")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingTemplate.name) {
      const { data: duplicateTemplate } = await supabase
        .from("message_templates")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("name", updateData.name)
        .neq("id", id)
        .single();

      if (duplicateTemplate) {
        return NextResponse.json(
          {
            error: "A template with this name already exists",
          },
          { status: 400 },
        );
      }
    }

    // Extract variables if content is being updated
    if (updateData.content) {
      const extractedVariables = extractVariablesFromContent(
        updateData.content,
      );
      if (updateData.subject) {
        extractedVariables.push(
          ...extractVariablesFromContent(updateData.subject),
        );
      }
      updateData.variables = Array.from(
        new Set([...extractedVariables, ...(updateData.variables || [])]),
      );
    }

    // Update template
    const { data: updatedTemplate, error: updateError } = await supabase
      .from("message_templates")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", organization.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating template:", updateError);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: "Template updated successfully",
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const templateId = url.searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    // Check if template is being used in any workflows
    const { count: workflowUsage } = await supabase
      .from("workflow_steps")
      .select("*", { count: "exact", head: true })
      .contains("step_config", { template_id: templateId });

    if (workflowUsage && workflowUsage > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template - it is used in ${workflowUsage} workflow(s)`,
        },
        { status: 400 },
      );
    }

    // Delete template
    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", organization.id);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Preview template with sample data
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, sample_data } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { user, organization } = await getUserAndOrganization(supabase);

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get template
    const { data: template, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("id", template_id)
      .eq("organization_id", organization.id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Generate preview with sample data
    const defaultSampleData = {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+44 7123 456789",
      class_name: "HIIT Training",
      instructor_name: "Sarah Johnson",
      date: new Date().toLocaleDateString("en-GB"),
      time: "6:00 PM",
      gym_name: "Atlas Fitness",
      amount: "£25.00",
    };

    const mergedData = { ...defaultSampleData, ...sample_data };

    const previewContent = renderTemplate(template.content, mergedData);
    const previewSubject = template.subject
      ? renderTemplate(template.subject, mergedData)
      : undefined;

    return NextResponse.json({
      success: true,
      preview: {
        subject: previewSubject,
        content: previewContent,
        sample_data: mergedData,
        variables_used: template.variables || [],
      },
    });
  } catch (error) {
    console.error("Error generating template preview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper functions
function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }

  return variables;
}

function renderTemplate(template: string, data: any): string {
  let rendered = template;

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    rendered = rendered.replace(regex, String(value || ""));
  });

  // Remove any remaining unmatched variables
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, "");

  return rendered;
}
