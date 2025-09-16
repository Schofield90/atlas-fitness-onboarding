import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");
    const pageIds = searchParams.get("pageIds");

    // Support both single pageId and multiple pageIds
    const pagesToFetch = pageIds
      ? pageIds.split(",").filter(Boolean)
      : pageId
        ? [pageId]
        : [];

    if (pagesToFetch.length === 0) {
      return NextResponse.json({ error: "No pages selected" }, { status: 400 });
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

    let storedAccessToken = integration.access_token;
    let facebookUserId = integration.facebook_user_id;
    console.log("🔑 Retrieved Facebook token from database for lead forms");

    console.log(
      `📋 Fetching REAL Lead Forms for Facebook Pages: ${pagesToFetch.join(", ")}`,
    );

    // Get page access tokens from database
    const { data: dbPages } = await supabase
      .from("facebook_pages")
      .select("facebook_page_id, page_name, access_token")
      .eq("organization_id", organizationId)
      .in("facebook_page_id", pagesToFetch);

    const pageTokenMap = new Map();
    if (dbPages) {
      dbPages.forEach((page) => {
        pageTokenMap.set(page.facebook_page_id, page.access_token);
      });
    }

    const allForms = [];
    const errors = [];

    // Fetch REAL lead forms for each selected page
    for (const pageId of pagesToFetch) {
      try {
        console.log(`\n--- Fetching forms for page: ${pageId} ---`);

        // Get page name from database
        const dbPage = dbPages?.find((p) => p.facebook_page_id === pageId);
        const pageName = dbPage?.page_name || "Unknown Page";

        // Use page access token from database, fallback to user token
        const pageAccessToken = pageTokenMap.get(pageId) || storedAccessToken;
        console.log(
          "🔐 Using token type:",
          pageTokenMap.has(pageId)
            ? "Page Access Token (from DB)"
            : "User Access Token",
        );

        // First get the forms list - simplified without deprecated fields
        const formsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status&access_token=${pageAccessToken}`,
        );

        const formsData = await formsResponse.json();

        if (formsData.error) {
          console.error(`❌ Forms API Error:`, formsData.error);
          errors.push({
            pageId,
            pageName,
            error: formsData.error.message,
          });
          continue;
        }

        if (formsData.data && formsData.data.length > 0) {
          console.log(
            `✅ Found ${formsData.data.length} forms for page ${pageName}`,
          );

          // Fetch all form details in parallel for speed
          const formDetailsPromises = formsData.data.map(async (form) => {
            try {
              // Get form details including questions
              const formDetailResponse = await fetch(
                `https://graph.facebook.com/v18.0/${form.id}?fields=id,name,status,created_time,questions,privacy_policy_url,context_card,thank_you_page,follow_up_action_url&access_token=${pageAccessToken}`,
              );

              const formDetails = await formDetailResponse.json();

              if (formDetails.error) {
                console.error(
                  `Error fetching details for form ${form.id}:`,
                  formDetails.error,
                );
                return {
                  ...form,
                  pageId,
                  pageName,
                  error: "Could not fetch full details",
                  questions_count: 0,
                  leads_count: 0,
                  created_time_formatted: "Unknown",
                  is_active: form.status === "ACTIVE",
                };
              }

              // Get the actual lead count with better error handling
              let leadCount: number | string = 0;
              let canAccessLeads = false;
              let sampleLeadId = null;
              let leadAccessError = null;

              try {
                // Method 1: Try to get lead count with summary (doesn't always work)
                const leadsCountResponse = await fetch(
                  `https://graph.facebook.com/v18.0/${form.id}/leads?limit=25&summary=true&access_token=${pageAccessToken}`,
                );

                const leadsCountData = await leadsCountResponse.json();

                if (leadsCountData.error) {
                  leadAccessError = leadsCountData.error.message;
                  console.error(
                    `Lead access error for form ${form.id}:`,
                    leadsCountData.error,
                  );
                } else {
                  // Check if we can actually access the leads
                  if (leadsCountData.data && leadsCountData.data.length > 0) {
                    canAccessLeads = true;
                    sampleLeadId = leadsCountData.data[0].id;

                    // Method 1: Try summary.total_count first
                    if (leadsCountData.summary?.total_count !== undefined) {
                      leadCount = leadsCountData.summary.total_count;
                    }
                    // Method 2: If no summary, count pages
                    else if (leadsCountData.data) {
                      // Count current page
                      leadCount = leadsCountData.data.length;

                      // If there's pagination, we need to count all pages
                      if (leadsCountData.paging?.next) {
                        // For now, indicate there are more than current page
                        leadCount = leadsCountData.data.length + "+";

                        // Alternative: fetch all pages to get exact count (expensive)
                        // Uncomment if exact count is needed:
                        /*
                        let nextUrl = leadsCountData.paging.next
                        while (nextUrl && leadCount < 1000) { // Limit to prevent infinite loops
                          const nextResponse = await fetch(nextUrl)
                          const nextData = await nextResponse.json()
                          if (nextData.data) {
                            leadCount += nextData.data.length
                          }
                          nextUrl = nextData.paging?.next
                        }
                        */
                      }
                    }
                  } else if (
                    leadsCountData.data &&
                    leadsCountData.data.length === 0
                  ) {
                    // No leads but we can access the endpoint
                    canAccessLeads = true;
                    leadCount = 0;
                  }
                }
              } catch (error) {
                console.error(
                  `Error getting lead count for form ${form.id}:`,
                  error,
                );
                leadAccessError = error.message;
              }

              // Process the form data
              const processedForm = {
                id: formDetails.id,
                name: formDetails.name || "Untitled Form",
                status: formDetails.status || "UNKNOWN",
                created_time: formDetails.created_time,
                created_time_formatted: formDetails.created_time
                  ? new Date(formDetails.created_time).toLocaleDateString(
                      "en-GB",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      },
                    )
                  : "Unknown",
                leads_count: leadCount,
                questions: formDetails.questions || [],
                questions_count: formDetails.questions?.length || 0,
                pageId,
                pageName,
                context_card: formDetails.context_card || {
                  title: formDetails.name || "Lead Form",
                  description: "Fill out this form to get started",
                  button_text: "Submit",
                },
                thank_you_page: formDetails.thank_you_page || {
                  title: "Thank You!",
                  body: "We will contact you soon.",
                },
                privacy_policy_url: formDetails.privacy_policy_url,
                follow_up_action_url: formDetails.follow_up_action_url,
                is_active: formDetails.status === "ACTIVE",
                can_access_leads: canAccessLeads,
                has_lead_data:
                  typeof leadCount === "number"
                    ? leadCount > 0
                    : leadCount !== "0" && leadCount !== "",
                lead_access_error: leadAccessError,
                debug: {
                  lead_count: leadCount,
                  can_access: canAccessLeads,
                  sample_lead_id: sampleLeadId,
                  error: leadAccessError,
                },
              };

              return processedForm;
            } catch (detailError) {
              console.error(
                `Error fetching details for form ${form.id}:`,
                detailError,
              );
              // Still include the form with basic info
              return {
                ...form,
                pageId,
                pageName,
                error: "Could not fetch full details",
                questions_count: 0,
                leads_count: 0,
                created_time_formatted: "Unknown",
                is_active: form.status === "ACTIVE",
              };
            }
          });

          // Wait for all promises and add results to allForms
          const formResults = await Promise.all(formDetailsPromises);
          allForms.push(...formResults);
        } else {
          console.log("⚠️ No forms found for page", pageName);
          errors.push({
            pageId,
            pageName,
            error:
              "No lead forms found. Create forms in Facebook Ads Manager first.",
          });
        }
      } catch (error) {
        console.error(`❌ Error fetching forms for page ${pageId}:`, error);
        errors.push({
          pageId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `📊 Total forms found: ${allForms.length} across ${pagesToFetch.length} pages`,
    );

    return NextResponse.json({
      success: true,
      forms: allForms,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total_forms: allForms.length,
        active_forms: allForms.filter((form) => form.is_active).length,
        total_leads: allForms.reduce((sum, form) => {
          const count = form.leads_count;
          if (typeof count === "number") return sum + count;
          if (typeof count === "string" && count.endsWith("+")) {
            return sum + parseInt(count.replace("+", ""));
          }
          return sum + (parseInt(count as string) || 0);
        }, 0),
        pages_checked: pagesToFetch.length,
        pages_with_errors: errors.length,
      },
      debug: {
        totalForms: allForms.length,
        pagesChecked: pagesToFetch.length,
        hasErrors: errors.length > 0,
        api_call: "GET /{page-id}/leadgen_forms",
        permissions_required: ["leads_retrieval", "pages_show_list"],
        data_source: "facebook_api",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching Facebook lead forms:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Facebook lead forms",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          endpoint: "/api/integrations/facebook/lead-forms",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
