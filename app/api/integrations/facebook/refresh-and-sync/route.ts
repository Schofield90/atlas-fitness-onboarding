import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export const runtime = "nodejs";

// This endpoint refreshes tokens and syncs everything needed for Facebook lead forms
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Starting Facebook refresh and sync...");

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

    // Get Facebook integration
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return NextResponse.json(
        {
          error:
            "No active Facebook connection. Please connect Facebook first.",
        },
        { status: 404 },
      );
    }

    console.log("Found integration for:", integration.facebook_user_name);

    // Step 1: Exchange user token for long-lived token if needed
    const FB_APP_ID =
      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "715100284200848";
    const FB_APP_SECRET =
      process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;

    if (!FB_APP_SECRET) {
      console.error("Facebook App Secret not configured");
      return NextResponse.json(
        {
          error: "Facebook App Secret not configured in environment variables",
        },
        { status: 500 },
      );
    }

    let validToken = integration.access_token;

    // Try to exchange for long-lived token
    try {
      const tokenExchangeUrl =
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${FB_APP_ID}&` +
        `client_secret=${FB_APP_SECRET}&` +
        `fb_exchange_token=${integration.access_token}`;

      const tokenResponse = await fetch(tokenExchangeUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        validToken = tokenData.access_token;

        // Update the integration with new token
        await supabase
          .from("facebook_integrations")
          .update({
            access_token: validToken,
            updated_at: new Date().toISOString(),
          })
          .eq("id", integration.id);

        console.log("✅ Refreshed user access token");
      }
    } catch (error) {
      console.log("Could not refresh token, using existing:", error);
    }

    // Step 2: Get pages and their tokens
    console.log("Fetching Facebook pages...");
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${validToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error("Facebook API error:", pagesData.error);
      return NextResponse.json(
        {
          error: `Facebook API error: ${pagesData.error.message}`,
        },
        { status: 400 },
      );
    }

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json(
        {
          error:
            "No Facebook pages found. Please ensure you have admin access to at least one page.",
        },
        { status: 400 },
      );
    }

    console.log(`Found ${pagesData.data.length} pages`);

    // Step 3: Save/update pages with their access tokens
    for (const page of pagesData.data) {
      // Check if page exists
      const { data: existingPage } = await supabase
        .from("facebook_pages")
        .select("id")
        .eq("facebook_page_id", page.id)
        .eq("integration_id", integration.id)
        .single();

      if (existingPage) {
        // Update existing page
        await supabase
          .from("facebook_pages")
          .update({
            page_name: page.name,
            page_access_token: page.access_token,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPage.id);
      } else {
        // Insert new page
        await supabase.from("facebook_pages").insert({
          integration_id: integration.id,
          organization_id: organizationId,
          facebook_page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          access_token: page.access_token, // Also save in access_token field
          is_active: true,
          is_primary: pagesData.data.indexOf(page) === 0, // First page is primary
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log("✅ Updated page access tokens");

    // Step 4: Get the primary page
    const { data: primaryPage } = await supabase
      .from("facebook_pages")
      .select("*")
      .eq("integration_id", integration.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .single();

    if (!primaryPage) {
      return NextResponse.json(
        {
          error: "No primary page found",
        },
        { status: 400 },
      );
    }

    console.log("Using primary page:", primaryPage.page_name);

    // Step 5: Fetch lead forms for the primary page
    const pageAccessToken =
      primaryPage.page_access_token || primaryPage.access_token;
    if (!pageAccessToken) {
      return NextResponse.json(
        {
          error: "No page access token available",
        },
        { status: 400 },
      );
    }

    console.log("Fetching lead forms...");
    const formsUrl =
      `https://graph.facebook.com/v18.0/${primaryPage.facebook_page_id}/leadgen_forms?` +
      `access_token=${pageAccessToken}&limit=100`;

    const formsResponse = await fetch(formsUrl);
    const formsData = await formsResponse.json();

    if (formsData.error) {
      console.error("Error fetching forms:", formsData.error);
      return NextResponse.json(
        {
          error: `Failed to fetch lead forms: ${formsData.error.message}`,
        },
        { status: 400 },
      );
    }

    const forms = formsData.data || [];
    console.log(`Found ${forms.length} lead forms`);

    // Step 6: Fetch details for each form and save
    const savedForms = [];
    for (const form of forms) {
      console.log(`Processing form: ${form.name}`);

      // Get form details including questions
      const formDetailsUrl =
        `https://graph.facebook.com/v18.0/${form.id}?` +
        `fields=id,name,status,questions,leads_count&access_token=${pageAccessToken}`;

      const detailResponse = await fetch(formDetailsUrl);
      const formDetails = await detailResponse.json();

      if (formDetails.error) {
        console.error(`Error fetching form details:`, formDetails.error);
        continue;
      }

      // Prepare form data
      const formData = {
        organization_id: organizationId,
        facebook_page_id: primaryPage.facebook_page_id,
        page_id: primaryPage.id,
        facebook_form_id: form.id,
        form_name: formDetails.name || form.name,
        form_status: formDetails.status || "ACTIVE",
        questions: formDetails.questions || [],
        is_active: true,
        auto_sync_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save form to database (upsert)
      const { data: savedForm, error: saveError } = await supabase
        .from("facebook_lead_forms")
        .upsert(formData, {
          onConflict: "organization_id,facebook_form_id",
        })
        .select()
        .single();

      if (!saveError && savedForm) {
        savedForms.push(savedForm);

        // Auto-detect and save field mappings if not already configured
        if (!savedForm.field_mappings && formDetails.questions) {
          const mappings = autoDetectFieldMappings(formDetails.questions);

          if (mappings.length > 0) {
            await supabase
              .from("facebook_lead_forms")
              .update({
                field_mappings: {
                  version: "1.0",
                  mappings: mappings,
                  custom_mappings: [],
                  auto_create_contact: true,
                  default_lead_source: "Facebook Lead Form",
                },
              })
              .eq("id", savedForm.id);

            console.log(
              `  ✅ Auto-configured ${mappings.length} field mappings`,
            );
          }
        }
      }
    }

    // Step 7: Register webhook for real-time sync
    console.log("Setting up webhook for real-time sync...");
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://atlas-fitness-onboarding.vercel.app"}/api/webhooks/meta/leads`;

      // Subscribe to leadgen webhook
      const subscribeUrl = `https://graph.facebook.com/v18.0/${primaryPage.facebook_page_id}/subscribed_apps`;

      const subscribeResponse = await fetch(subscribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: pageAccessToken,
          subscribed_fields: "leadgen",
        }),
      });

      const subscribeData = await subscribeResponse.json();

      if (subscribeData.success) {
        console.log("✅ Webhook registered for real-time sync");
      } else {
        console.log("Could not register webhook:", subscribeData);
      }
    } catch (error) {
      console.error("Webhook registration error:", error);
    }

    // Return success with summary
    return NextResponse.json({
      success: true,
      summary: {
        pages_updated: pagesData.data.length,
        forms_synced: savedForms.length,
        primary_page: primaryPage.page_name,
        webhook_enabled: true,
      },
      forms: savedForms.map((f) => ({
        id: f.facebook_form_id,
        name: f.form_name,
        status: f.form_status,
        questions_count: f.questions?.length || 0,
        has_mappings: !!f.field_mappings,
      })),
    });
  } catch (error) {
    console.error("Unexpected error in refresh-and-sync:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}

// Helper function to auto-detect field mappings
function autoDetectFieldMappings(questions: any[]) {
  const mappings = [];

  const fieldPatterns = {
    email: /email|e-mail|correo|mail/i,
    first_name: /first.*name|nombre|prenom/i,
    last_name: /last.*name|apellido|nom/i,
    phone: /phone|mobile|telefono|cell/i,
    full_name: /full.*name|name|nombre.*completo/i,
    company: /company|business|empresa/i,
    address: /address|street|direccion/i,
    city: /city|ciudad|ville/i,
    postcode: /post.*code|zip|postal|codigo/i,
    notes: /message|comment|notes|mensaje/i,
  };

  questions.forEach((question) => {
    const fbField = question.key || question.id;
    const fbLabel = question.label || question.name || "";

    let matchedField = null;

    // Check field key and label against patterns
    for (const [crmField, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(fbField) || pattern.test(fbLabel)) {
        matchedField = crmField;
        break;
      }
    }

    if (matchedField) {
      mappings.push({
        facebook_field: fbField,
        crm_field: matchedField,
        auto_detected: true,
      });
    }
  });

  return mappings;
}
