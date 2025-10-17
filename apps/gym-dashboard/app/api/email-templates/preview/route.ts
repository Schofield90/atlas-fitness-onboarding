import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { requireAuth, createErrorResponse } from "@/app/lib/api/auth-check";
import { z } from "zod";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Validation schema for preview request
const previewSchema = z.object({
  templateId: z.string().uuid().optional(),
  content: z.string().optional(),
  subject: z.string().optional(),
  leadId: z.string().uuid().optional(),
  sampleData: z
    .object({
      name: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth();
    const supabase = await createClient();

    const body = await request.json();
    const validated = previewSchema.parse(body);

    let content = validated.content || "";
    let subject = validated.subject || "";
    let variables: Record<string, any> = {};

    // If templateId is provided, fetch the template
    if (validated.templateId) {
      const { data: template, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("id", validated.templateId)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (error || !template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      content = template.content;
      subject = template.subject || "";
    }

    // If leadId is provided, fetch lead data
    if (validated.leadId) {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", validated.leadId)
        .eq("organization_id", userWithOrg.organizationId)
        .single();

      if (!error && lead) {
        variables = {
          name:
            lead.name ||
            `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
          firstName: lead.first_name || lead.name?.split(" ")[0] || "there",
          lastName: lead.last_name || lead.name?.split(" ")[1] || "",
          email: lead.email || "",
          phone: lead.phone || "",
          leadScore: lead.lead_score || 0,
          source: lead.source || "",
          status: lead.status || "",
        };
      }
    }

    // Use sample data if provided
    if (validated.sampleData) {
      variables = {
        ...variables,
        ...validated.sampleData,
        name:
          validated.sampleData.name ||
          `${validated.sampleData.firstName || ""} ${validated.sampleData.lastName || ""}`.trim() ||
          "John Doe",
        firstName: validated.sampleData.firstName || "John",
        lastName: validated.sampleData.lastName || "Doe",
        email: validated.sampleData.email || "john.doe@example.com",
        phone: validated.sampleData.phone || "+447700900000",
      };
    }

    // Get organization data
    const { data: organization } = await supabase
      .from("organizations")
      .select("name, settings")
      .eq("id", userWithOrg.organizationId)
      .single();

    // Add organization variables
    variables.organizationName = organization?.name || "Atlas Fitness";
    variables.currentDate = new Date().toLocaleDateString("en-GB");
    variables.currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Replace all variables in content and subject
    const processedContent = replaceVariables(content, variables);
    const processedSubject = replaceVariables(subject, variables);

    // Generate HTML preview with styling
    const htmlPreview = generateHTMLPreview(
      processedContent,
      processedSubject,
      variables.organizationName,
    );

    return NextResponse.json({
      success: true,
      preview: {
        subject: processedSubject,
        content: processedContent,
        html: htmlPreview,
        variables: Object.keys(variables),
        variableValues: variables,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid preview data",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return createErrorResponse(error);
  }
}

// Helper function to replace variables in template
function replaceVariables(
  template: string,
  variables: Record<string, any>,
): string {
  let processed = template;

  // Replace all {{variable}} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    processed = processed.replace(regex, String(value || ""));
  });

  // Replace any remaining variables with empty string
  processed = processed.replace(/{{[^}]+}}/g, "");

  return processed;
}

// Generate styled HTML preview
function generateHTMLPreview(
  content: string,
  subject: string,
  organizationName: string,
): string {
  // Convert line breaks to HTML
  const htmlContent = content
    .split("\n")
    .map((line) => `<p style="margin: 0 0 1em 0;">${line}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 700;">${organizationName}</h1>
            </td>
          </tr>
          
          <!-- Subject -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <h2 style="margin: 0; color: #374151; font-size: 20px; font-weight: 600;">${subject}</h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px; color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${htmlContent}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">
                <a href="#" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a> | 
                <a href="#" style="color: #3b82f6; text-decoration: none;">Update Preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
