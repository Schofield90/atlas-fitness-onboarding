import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { FacebookFieldMappingService } from "@/app/lib/services/facebook-field-mapping";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, formStructure } = body;

    if (!formId) {
      return NextResponse.json({ error: "Form ID required" }, { status: 400 });
    }

    // Get authenticated user and organization
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { organizationId, error: orgError } =
      await getCurrentUserOrganization();

    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get form structure from database if not provided
    let questions = formStructure;

    if (!questions) {
      // Try to get from Facebook API
      const { data: integration } = await supabase
        .from("facebook_integrations")
        .select("access_token")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .single();

      if (integration?.access_token) {
        // Fetch form structure from Facebook
        const formResponse = await fetch(
          `https://graph.facebook.com/v18.0/${formId}?fields=questions&access_token=${integration.access_token}`,
        );
        const formData = await formResponse.json();

        if (formData.questions) {
          questions = formData.questions;

          // Save questions to database for future use
          await supabase
            .from("facebook_lead_forms")
            .update({
              questions: formData.questions,
              updated_at: new Date().toISOString(),
            })
            .eq("facebook_form_id", formId)
            .eq("organization_id", organizationId);
        }
      }
    }

    if (!questions) {
      // Try to get from database
      const { data: formRecord } = await supabase
        .from("facebook_lead_forms")
        .select("questions")
        .eq("facebook_form_id", formId)
        .eq("organization_id", organizationId)
        .single();

      questions = formRecord?.questions;
    }

    if (!questions) {
      return NextResponse.json(
        { error: "Form structure not available. Please sync the form first." },
        { status: 400 },
      );
    }

    // Auto-detect field mappings
    const mappingService = new FacebookFieldMappingService();
    const detectedMappings =
      await mappingService.autoDetectFieldMappings(questions);

    // Get any existing saved mappings
    const savedMappings = await mappingService.getFieldMappings(
      formId,
      organizationId,
    );

    // Merge saved and auto-detected mappings
    let finalMappings = detectedMappings;

    if (savedMappings) {
      // Preserve user-modified mappings
      finalMappings = mappingService.mergeMappings(
        savedMappings.mappings,
        detectedMappings,
      );
    }

    // Create suggested mapping configuration
    const suggestedConfig = {
      version: "1.0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      mappings: finalMappings,
      custom_mappings: savedMappings?.custom_mappings || [],
      auto_create_contact: savedMappings?.auto_create_contact ?? true,
      default_lead_source:
        savedMappings?.default_lead_source || "Facebook Lead Form",
    };

    // Validate the suggested configuration
    const validation = mappingService.validateMappings(suggestedConfig);

    console.log(
      `🔍 Auto-detected ${finalMappings.length} field mappings for form ${formId}`,
    );

    return NextResponse.json({
      success: true,
      suggested_mappings: suggestedConfig,
      total_fields: questions.length,
      mapped_fields: finalMappings.length,
      unmapped_fields: questions.length - finalMappings.length,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      confidence_levels: finalMappings.map((m) => ({
        field: m.facebook_field_name,
        mapped_to: m.crm_field,
        auto_detected: m.auto_detected,
        confidence: m.auto_detected ? "high" : "user-defined",
      })),
    });
  } catch (error) {
    console.error("Error auto-detecting field mappings:", error);
    return NextResponse.json(
      { error: "Failed to auto-detect field mappings" },
      { status: 500 },
    );
  }
}
