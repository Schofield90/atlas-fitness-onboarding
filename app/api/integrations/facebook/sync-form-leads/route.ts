import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";
import { FacebookFieldMappingService } from "@/app/lib/services/facebook-field-mapping";
import { leadsDB } from "@/app/lib/leads-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, formName, pageId } = body;

    if (!formId) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 },
      );
    }

    // Get access token from database instead of cookies
    const supabase = createClient();
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

    // Get Facebook integration from database
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("access_token, facebook_user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration || !integration.access_token) {
      console.log("⚠️ No active Facebook integration found");
      return NextResponse.json(
        { error: "Facebook not connected" },
        { status: 401 },
      );
    }

    const storedAccessToken = integration.access_token;

    console.log(`🔄 Syncing leads from form: ${formId} (${formName})`);

    try {
      // Get page token from database if we have pageId
      let accessToken = storedAccessToken;

      if (pageId) {
        const { data: dbPage } = await supabase
          .from("facebook_pages")
          .select("access_token")
          .eq("organization_id", organizationId)
          .eq("facebook_page_id", pageId)
          .single();

        if (dbPage?.access_token) {
          accessToken = dbPage.access_token;
          console.log("🔐 Using page access token from database");
        }
      }

      // Get all leads from this form
      const allLeads = [];
      let nextUrl = `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${accessToken}`;

      // Handle pagination
      while (nextUrl) {
        const response = await fetch(nextUrl);
        const data = await response.json();

        if (data.error) {
          console.error("Error fetching leads:", data.error);
          return NextResponse.json(
            {
              success: false,
              error: data.error.message,
              error_code: data.error.code,
            },
            { status: 400 },
          );
        }

        if (data.data) {
          // For each lead, get full details
          for (const lead of data.data) {
            try {
              const leadDetailResponse = await fetch(
                `https://graph.facebook.com/v18.0/${lead.id}?access_token=${accessToken}`,
              );
              const leadDetails = await leadDetailResponse.json();

              // Get field mappings for this form
              const mappingService = new FacebookFieldMappingService();
              const fieldMappings = await mappingService.getFieldMappings(
                formId,
                organizationId,
              );

              let processedLeadData: any = {};
              const rawFields: Record<string, string> = {};

              // Collect raw field data
              leadDetails.field_data?.forEach((field: any) => {
                const value = field.values?.[0] || "";
                rawFields[field.name] = value;
              });

              if (fieldMappings && fieldMappings.mappings.length > 0) {
                // Use saved field mappings
                processedLeadData = await mappingService.applyFieldMappings(
                  leadDetails.field_data || [],
                  fieldMappings,
                );
              } else {
                // Auto-detect field mappings
                const autoMappings =
                  await mappingService.autoDetectFieldMappings({
                    questions:
                      leadDetails.field_data?.map((f: any) => ({
                        key: f.name,
                        label: f.name,
                        type: f.type || "SHORT_ANSWER",
                        required: false,
                      })) || [],
                  });

                const autoConfig = {
                  version: "1.0",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  mappings: autoMappings,
                  custom_mappings: [],
                  auto_create_contact: true,
                  default_lead_source: "Facebook Lead Form",
                };

                processedLeadData = await mappingService.applyFieldMappings(
                  leadDetails.field_data || [],
                  autoConfig,
                );

                // Save auto-detected mappings for future use
                await mappingService.saveFieldMappings(
                  organizationId,
                  formId,
                  autoConfig,
                );
              }

              // Extract processed fields
              const fullName =
                `${processedLeadData.standard_fields?.first_name || ""} ${processedLeadData.standard_fields?.last_name || ""}`.trim() ||
                processedLeadData.standard_fields?.full_name ||
                "Unknown";
              const email =
                processedLeadData.standard_fields?.email || "Not provided";
              const phone =
                processedLeadData.standard_fields?.phone || "Not provided";

              allLeads.push({
                facebook_lead_id: lead.id,
                form_id: formId,
                form_name: formName,
                created_time: leadDetails.created_time,
                name: fullName,
                email: email,
                phone: phone,
                fields: rawFields,
                custom_fields: processedLeadData.custom_fields || {},
                field_mappings_applied: !!fieldMappings,
                campaign_id: leadDetails.campaign_id,
                campaign_name: leadDetails.campaign_name,
                ad_id: leadDetails.ad_id,
                ad_name: leadDetails.ad_name,
                adset_id: leadDetails.adset_id,
                adset_name: leadDetails.adset_name,
                is_organic: leadDetails.is_organic || false,
              });
            } catch (error) {
              console.error(`Error fetching lead ${lead.id}:`, error);
            }
          }
        }

        // Check for next page
        nextUrl = data.paging?.next || null;
      }

      // Save all leads to database
      let savedCount = 0;
      let skippedCount = 0;
      const saveErrors = [];

      for (const lead of allLeads) {
        try {
          // Check if lead already exists
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("organization_id", organizationId)
            .contains("metadata", { facebook_lead_id: lead.facebook_lead_id })
            .single();

          if (existingLead) {
            skippedCount++;
            continue;
          }

          // Create new lead
          const { error: insertError } = await supabase.from("leads").insert({
            organization_id: organizationId,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            source: "facebook",
            status: "new",
            metadata: {
              facebook_lead_id: lead.facebook_lead_id,
              facebook_form_id: lead.form_id,
              form_name: lead.form_name,
              page_id: pageId || null,
              campaign_id: lead.campaign_id,
              campaign_name: lead.campaign_name,
              ad_id: lead.ad_id,
              ad_name: lead.ad_name,
              adset_id: lead.adset_id,
              adset_name: lead.adset_name,
              is_organic: lead.is_organic,
              field_data: lead.fields,
              custom_fields: lead.custom_fields,
              field_mappings_applied: lead.field_mappings_applied,
              synced_at: new Date().toISOString(),
            },
            created_at: lead.created_time,
          });

          if (insertError) {
            console.error("Error saving lead:", insertError);
            saveErrors.push({
              lead_id: lead.facebook_lead_id,
              error: insertError.message,
            });
          } else {
            savedCount++;
          }
        } catch (error) {
          console.error("Error processing lead:", error);
          saveErrors.push({
            lead_id: lead.facebook_lead_id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(
        `✅ Synced ${savedCount} new leads from form ${formName} (${skippedCount} already existed)`,
      );

      return NextResponse.json({
        success: true,
        syncedCount: allLeads.length,
        savedCount: savedCount,
        skippedCount: skippedCount,
        formId,
        formName,
        leads: allLeads.slice(0, 10), // Return first 10 for preview
        saveErrors: saveErrors.length > 0 ? saveErrors : undefined,
        message: `Successfully synced ${savedCount} new leads from ${allLeads.length} total (${skippedCount} duplicates skipped)`,
      });
    } catch (error) {
      console.error("Sync error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Request error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
