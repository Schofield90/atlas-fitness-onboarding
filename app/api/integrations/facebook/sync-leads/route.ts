import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export const runtime = "nodejs";

interface SyncRequest {
  pageId?: string;
  formId?: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    const { pageId, formId, limit = 100 } = body;

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
    console.log("🔑 Retrieved Facebook token from database for lead sync");

    console.log("🔄 Starting Facebook leads sync", { pageId, formId, limit });

    const syncedLeads = [];
    const errors = [];

    // If specific form ID provided, sync from that form
    if (formId && pageId) {
      try {
        // Get page token from database first
        const { data: dbPage } = await supabase
          .from("facebook_pages")
          .select("facebook_page_id, page_name, access_token")
          .eq("organization_id", organizationId)
          .eq("facebook_page_id", pageId)
          .single();

        const pageAccessToken = dbPage?.access_token || storedAccessToken;
        const pageName = dbPage?.page_name || "Unknown Page";

        // Fetch leads from the specific form
        const leadsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${formId}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`,
        );
        const leadsData = await leadsResponse.json();

        if (leadsData.error) {
          console.error(
            `Error fetching leads for form ${formId}:`,
            leadsData.error,
          );
          throw new Error(leadsData.error.message);
        }

        if (leadsData.data) {
          for (const lead of leadsData.data) {
            const processedLead = processLeadData(
              lead,
              formId,
              pageId,
              pageName,
            );
            syncedLeads.push(processedLead);
          }
        }
      } catch (error) {
        errors.push({
          formId,
          pageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    // If page ID provided, sync all forms from that page
    else if (pageId) {
      try {
        // Get page token from database
        const { data: dbPage } = await supabase
          .from("facebook_pages")
          .select("facebook_page_id, page_name, access_token")
          .eq("organization_id", organizationId)
          .eq("facebook_page_id", pageId)
          .single();

        const pageAccessToken = dbPage?.access_token || storedAccessToken;
        const pageName = dbPage?.page_name || "Unknown Page";

        // Get all lead forms for this page
        const formsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name&limit=100&access_token=${pageAccessToken}`,
        );
        const formsData = await formsResponse.json();

        if (formsData.data) {
          // Sync leads from each form
          for (const form of formsData.data) {
            try {
              const leadsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${form.id}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`,
              );
              const leadsData = await leadsResponse.json();

              if (leadsData.data) {
                for (const lead of leadsData.data) {
                  const processedLead = processLeadData(
                    lead,
                    form.id,
                    pageId,
                    pageName,
                    form.name,
                  );
                  syncedLeads.push(processedLead);
                }
              }
            } catch (error) {
              errors.push({
                formId: form.id,
                formName: form.name,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          pageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    // Otherwise, sync from all pages
    else {
      try {
        // Get all pages from database
        const { data: dbPages } = await supabase
          .from("facebook_pages")
          .select("facebook_page_id, page_name, access_token")
          .eq("organization_id", organizationId)
          .eq("is_active", true);

        if (dbPages && dbPages.length > 0) {
          for (const page of dbPages) {
            const pageAccessToken = page.access_token || storedAccessToken;
            const pageId = page.facebook_page_id;
            const pageName = page.page_name;

            try {
              // Get all lead forms for this page
              const formsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name&limit=100&access_token=${pageAccessToken}`,
              );
              const formsData = await formsResponse.json();

              if (formsData.data) {
                // Sync leads from each form
                for (const form of formsData.data) {
                  try {
                    const leadsResponse = await fetch(
                      `https://graph.facebook.com/v18.0/${form.id}/leads?fields=id,created_time,field_data&limit=${limit}&access_token=${pageAccessToken}`,
                    );
                    const leadsData = await leadsResponse.json();

                    if (leadsData.data) {
                      for (const lead of leadsData.data) {
                        const processedLead = processLeadData(
                          lead,
                          form.id,
                          pageId,
                          pageName,
                          form.name,
                        );
                        syncedLeads.push(processedLead);
                      }
                    }
                  } catch (error) {
                    errors.push({
                      pageId: pageId,
                      pageName: pageName,
                      formId: form.id,
                      formName: form.name,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    });
                  }
                }
              }
            } catch (error) {
              errors.push({
                pageId: pageId,
                pageName: pageName,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        }
      } catch (error) {
        errors.push({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Save synced leads to database
    let savedCount = 0;
    let contactsCreated = 0;
    const saveErrors = [];

    for (const lead of syncedLeads) {
      try {
        // Check if lead already exists
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("organization_id", organizationId)
          .contains("metadata", { facebook_lead_id: lead.facebook_lead_id })
          .single();

        if (!existingLead) {
          // Create new lead
          const { data: newLead, error: insertError } = await supabase
            .from("leads")
            .insert({
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
                page_name: lead.page_name,
                page_id: lead.page_id,
                field_data: lead.field_data,
                synced_at: new Date().toISOString(),
              },
              created_at: lead.created_at,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Error saving lead:", insertError);
            saveErrors.push({
              lead_id: lead.facebook_lead_id,
              error: insertError.message,
            });
          } else {
            savedCount++;

            // Also create or update contact record (ensure organization scoping)
            // Extract first and last name
            const nameParts = lead.name ? lead.name.split(" ") : ["", ""];
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            // Check if contact exists by phone or email
            let existingContact = null;
            if (lead.phone && lead.phone !== "Not provided") {
              const { data } = await supabase
                .from("contacts")
                .select("id")
                .eq("phone", lead.phone)
                .single();
              existingContact = data;
            }

            if (
              !existingContact &&
              lead.email &&
              lead.email !== "Not provided"
            ) {
              const { data } = await supabase
                .from("contacts")
                .select("id")
                .eq("email", lead.email)
                .single();
              existingContact = data;
            }

            if (!existingContact) {
              // Create new contact
              const { error: contactError } = await supabase
                .from("contacts")
                .insert({
                  organization_id: organizationId as any,
                  phone: lead.phone !== "Not provided" ? lead.phone : null,
                  email: lead.email !== "Not provided" ? lead.email : null,
                  first_name: firstName,
                  last_name: lastName,
                  lead_id: newLead?.id,
                  sms_opt_in: true,
                  whatsapp_opt_in: true,
                  email_opt_in: true,
                  tags: [
                    "facebook-lead",
                    lead.page_name,
                    lead.form_name,
                  ].filter(Boolean),
                  metadata: {
                    source: "facebook",
                    facebook_lead_id: lead.facebook_lead_id,
                    form_name: lead.form_name,
                    page_name: lead.page_name,
                    imported_at: new Date().toISOString(),
                  },
                });

              if (!contactError) {
                contactsCreated++;
                console.log(`✅ Created contact for lead: ${lead.name}`);
              } else {
                console.error("Error creating contact:", contactError);
              }
            } else {
              // Update existing contact with lead_id if not already linked
              const { error: updateError } = await supabase
                .from("contacts")
                .update({
                  lead_id: newLead?.id,
                  first_name: firstName || undefined,
                  last_name: lastName || undefined,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingContact.id)
                .is("lead_id", null);

              if (!updateError) {
                console.log(
                  `🔄 Updated existing contact for lead: ${lead.name}`,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing lead:", error);
        saveErrors.push({
          lead_id: lead.facebook_lead_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(`✅ Synced ${savedCount} new leads to database`);

    return NextResponse.json({
      success: true,
      synced: syncedLeads.length,
      saved: savedCount,
      leads: syncedLeads,
      errors: errors.length > 0 ? errors : undefined,
      saveErrors: saveErrors.length > 0 ? saveErrors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function processLeadData(
  lead: any,
  formId: string,
  pageId: string,
  pageName?: string,
  formName?: string,
) {
  // Extract field data
  const fieldData = {};
  let name = "";
  let email = "";
  let phone = "";

  if (lead.field_data) {
    for (const field of lead.field_data) {
      fieldData[field.name] = field.values?.[0] || "";

      // Common field mappings
      const fieldNameLower = field.name.toLowerCase();
      if (fieldNameLower.includes("name") && !fieldNameLower.includes("last")) {
        name = field.values?.[0] || "";
      } else if (fieldNameLower.includes("email")) {
        email = field.values?.[0] || "";
      } else if (
        fieldNameLower.includes("phone") ||
        fieldNameLower.includes("mobile")
      ) {
        phone = field.values?.[0] || "";
      }
    }
  }

  return {
    facebook_lead_id: lead.id,
    created_at: lead.created_time,
    form_id: formId,
    form_name: formName,
    page_id: pageId,
    page_name: pageName,
    name: name || "Unknown",
    email: email || "Not provided",
    phone: phone || "Not provided",
    source: "facebook",
    status: "new",
    field_data: fieldData,
    raw_data: lead,
  };
}
