import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { FacebookFieldMappingService } from "@/app/lib/services/facebook-field-mapping";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

// GET field mappings for a form
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");

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

    // Get field mappings
    const mappingService = new FacebookFieldMappingService();
    const mappings = await mappingService.getFieldMappings(
      formId,
      organizationId,
    );

    console.log(`[field-mappings] Retrieved mappings for form ${formId}:`, {
      hasMapping: !!mappings,
      mappingKeys: mappings ? Object.keys(mappings) : [],
      mappingsCount: mappings?.mappings?.length || 0,
      customMappingsCount: mappings?.custom_mappings?.length || 0,
    });

    // Also get form structure from database
    const { data: formRecord } = await supabase
      .from("facebook_lead_forms")
      .select(
        "questions, form_name, facebook_form_id, facebook_page_id, page_id",
      )
      .eq("facebook_form_id", formId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    // If no questions present, attempt to refresh from Facebook automatically
    if (
      !formRecord ||
      !formRecord?.questions ||
      (Array.isArray(formRecord?.questions) &&
        formRecord?.questions.length === 0)
    ) {
      try {
        console.log(`Attempting to refresh questions for form ${formId}`);

        // Get Facebook integration and access token
        const { data: integration } = await supabase
          .from("facebook_integrations")
          .select("access_token")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .single();

        if (integration?.access_token) {
          // Get page access token if available
          let pageAccessToken: string | null = null;
          if (formRecord?.page_id) {
            const { data: pageByInternal } = await supabase
              .from("facebook_pages")
              .select("access_token")
              .eq("id", formRecord.page_id)
              .eq("organization_id", organizationId)
              .single();
            pageAccessToken = pageByInternal?.access_token || null;
          }
          if (!pageAccessToken && formRecord?.facebook_page_id) {
            const { data: pageByFbId } = await supabase
              .from("facebook_pages")
              .select("access_token")
              .eq("facebook_page_id", formRecord.facebook_page_id)
              .eq("organization_id", organizationId)
              .single();
            pageAccessToken = pageByFbId?.access_token || null;
          }

          const accessToken = pageAccessToken || integration.access_token;

          // Fetch form details directly from Facebook
          const formResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formId}?fields=id,name,status,questions&access_token=${accessToken}`,
          );

          const formData = await formResponse.json();

          if (!formData.error && formData.questions) {
            // Update the form with questions
            await supabase
              .from("facebook_lead_forms")
              .update({
                questions: formData.questions || [],
                form_name: formData.name || formRecord?.form_name,
                updated_at: new Date().toISOString(),
              })
              .eq("facebook_form_id", formId)
              .eq("organization_id", organizationId);

            console.log(`✅ Refreshed questions for form ${formId}`);

            return NextResponse.json({
              success: true,
              mappings,
              form_structure: formData.questions || null,
              form_name: formData.name || null,
              has_saved_mappings: !!mappings,
            });
          }
        }
      } catch (e) {
        console.error("Auto-refresh of form questions failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      mappings,
      form_structure: formRecord?.questions || null,
      form_name: formRecord?.form_name || null,
      has_saved_mappings: !!mappings,
    });
  } catch (error) {
    console.error("Error fetching field mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch field mappings" },
      { status: 500 },
    );
  }
}

// POST/PUT save field mappings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, mappings } = body;

    if (!formId || !mappings) {
      return NextResponse.json(
        { error: "Form ID and mappings required" },
        { status: 400 },
      );
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

    // Validate mappings
    const mappingService = new FacebookFieldMappingService();
    const validation = mappingService.validateMappings(mappings);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Invalid mappings",
          validation_errors: validation.errors,
          validation_warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    // Save mappings
    const saveResult = await mappingService.saveFieldMappings(
      organizationId,
      formId,
      mappings,
    );

    if (!saveResult.success) {
      console.error(
        `❌ Failed to save field mappings for form ${formId}:`,
        saveResult.error,
      );
      return NextResponse.json(
        {
          error: "Failed to save field mappings",
          details: saveResult.error,
        },
        { status: 500 },
      );
    }

    console.log(`✅ Saved field mappings for form ${formId}:`, {
      mappingsCount: mappings.mappings?.length || 0,
      customMappingsCount: mappings.custom_mappings?.length || 0,
    });

    return NextResponse.json({
      success: true,
      message: "Field mappings saved successfully",
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error("Error saving field mappings:", error);
    return NextResponse.json(
      { error: "Failed to save field mappings" },
      { status: 500 },
    );
  }
}

// DELETE field mappings (reset to auto-detect)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");

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

    // Clear field mappings
    const { error: updateError } = await supabase
      .from("facebook_lead_forms")
      .update({
        field_mappings: null,
        custom_field_mappings: null,
        updated_at: new Date().toISOString(),
      })
      .eq("facebook_form_id", formId)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log(`🗑️ Cleared field mappings for form ${formId}`);

    return NextResponse.json({
      success: true,
      message:
        "Field mappings cleared. Auto-detection will be used for new leads.",
    });
  } catch (error) {
    console.error("Error clearing field mappings:", error);
    return NextResponse.json(
      { error: "Failed to clear field mappings" },
      { status: 500 },
    );
  }
}
