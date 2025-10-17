import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    const pageId = searchParams.get("pageId");

    if (!formId && !pageId) {
      return NextResponse.json(
        { error: "Either formId or pageId is required" },
        { status: 400 },
      );
    }

    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("fb_token_data");

    let storedAccessToken = null;
    let facebookUserId = null;

    if (tokenCookie?.value) {
      try {
        const tokenData = JSON.parse(tokenCookie.value);
        storedAccessToken = tokenData.access_token;
        facebookUserId = tokenData.user_id;
        console.log(
          "🔑 Retrieved Facebook token from cookie for user:",
          facebookUserId,
        );
      } catch (e) {
        console.error("Failed to parse token cookie:", e);
      }
    }

    if (!storedAccessToken || !facebookUserId) {
      console.log(
        "⚠️ No real Facebook access token available, using demo data",
      );

      // Return demo leads data
      const demoLeads = [
        {
          id: "lead_001",
          created_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          ad_id: "23851234567890123",
          ad_name: "Atlas Fitness Free Trial - Gym Membership",
          adset_id: "23851234567890124",
          adset_name: "Fitness Enthusiasts 25-45",
          campaign_id: "23851234567890125",
          campaign_name: "Q4 Gym Membership Drive",
          form_id: formId || "form_demo_1",
          form_name: "Free Trial Membership Sign-up",
          is_organic: false,
          platform: "facebook",
          field_data: [
            { name: "full_name", values: ["Sarah Johnson"] },
            { name: "email", values: ["sarah.j@email.com"] },
            { name: "phone_number", values: ["+1234567890"] },
            { name: "fitness_goals", values: ["Weight Loss"] },
            { name: "preferred_contact_time", values: ["Evening"] },
          ],
        },
        {
          id: "lead_002",
          created_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          ad_id: "23851234567890126",
          ad_name: "Personal Training Consultation",
          adset_id: "23851234567890127",
          adset_name: "Fitness Beginners",
          campaign_id: "23851234567890128",
          campaign_name: "Personal Training Promotion",
          form_id: formId || "form_demo_2",
          form_name: "Personal Training Consultation",
          is_organic: false,
          platform: "facebook",
          field_data: [
            { name: "full_name", values: ["Mike Chen"] },
            { name: "email", values: ["mike.chen@email.com"] },
            { name: "phone_number", values: ["+1987654321"] },
            { name: "experience_level", values: ["Beginner"] },
            { name: "preferred_time", values: ["Morning (6AM-12PM)"] },
          ],
        },
        {
          id: "lead_003",
          created_time: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 day ago
          ad_id: "23851234567890129",
          ad_name: "Group Classes Special Offer",
          adset_id: "23851234567890130",
          adset_name: "Group Fitness Interest",
          campaign_id: "23851234567890131",
          campaign_name: "Group Fitness Q4",
          form_id: formId || "form_demo_3",
          form_name: "Group Fitness Class Interest",
          is_organic: false,
          platform: "facebook",
          field_data: [
            { name: "full_name", values: ["Amanda Rodriguez"] },
            { name: "email", values: ["amanda.r@email.com"] },
            { name: "phone_number", values: ["+1555123456"] },
            { name: "class_interest", values: ["Yoga", "HIIT"] },
            { name: "availability", values: ["Weekday Evenings"] },
          ],
        },
      ];

      return NextResponse.json({
        success: true,
        leads: demoLeads,
        pagination: {
          total: demoLeads.length,
          has_next: false,
        },
        meta: {
          form_id: formId,
          page_id: pageId,
          data_source: "demo",
          note: "Demo data - Connect real Facebook access token to see live leads",
        },
      });
    }

    console.log(
      `📋 Fetching real Facebook leads for form: ${formId || "all forms on page: " + pageId}`,
    );

    // Real Facebook Graph API call
    let apiUrl = "";
    if (formId) {
      // Get leads for specific form
      apiUrl = `https://graph.facebook.com/v18.0/${formId}/leads?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform,field_data&access_token=${storedAccessToken}`;
    } else if (pageId) {
      // Get all leadgen forms for page, then fetch leads for each
      apiUrl = `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,leads.limit(50){id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,is_organic,platform,field_data}&access_token=${storedAccessToken}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Facebook API error:", data.error);
      return NextResponse.json(
        {
          error: "Facebook API error",
          details: data.error.message,
          code: data.error.code,
          type: data.error.type,
        },
        { status: 400 },
      );
    }

    // Process the response based on the endpoint used
    let leads = [];
    if (formId) {
      leads = data.data || [];
    } else {
      // Flatten leads from multiple forms
      for (const form of data.data || []) {
        if (form.leads && form.leads.data) {
          leads = leads.concat(form.leads.data);
        }
      }
    }

    // Sort leads by creation time (newest first)
    leads.sort(
      (a, b) =>
        new Date(b.created_time).getTime() - new Date(a.created_time).getTime(),
    );

    console.log(`✅ Retrieved ${leads.length} real Facebook leads`);

    return NextResponse.json({
      success: true,
      leads: leads.map((lead) => ({
        id: lead.id,
        created_time: lead.created_time,
        ad_id: lead.ad_id,
        ad_name: lead.ad_name,
        adset_id: lead.adset_id,
        adset_name: lead.adset_name,
        campaign_id: lead.campaign_id,
        campaign_name: lead.campaign_name,
        form_id: lead.form_id,
        is_organic: lead.is_organic,
        platform: lead.platform,
        field_data: lead.field_data || [],
        // Add processed fields for easier access
        processed_data: processLeadFields(lead.field_data || []),
      })),
      pagination: {
        total: leads.length,
        has_next: data.paging?.next ? true : false,
        next_cursor: data.paging?.cursors?.after,
      },
      meta: {
        form_id: formId,
        page_id: pageId,
        data_source: "facebook_api",
        api_call: apiUrl.split("?")[0], // Remove access token from log
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching Facebook leads:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Facebook leads",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          endpoint: "/api/integrations/facebook/leads",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}

// Helper function to process lead field data into easier-to-use format
function processLeadFields(
  fieldData: Array<{ name: string; values: string[] }>,
) {
  const processed: Record<string, string> = {};

  for (const field of fieldData) {
    // Take the first value if multiple values exist
    processed[field.name] = field.values?.[0] || "";
  }

  return processed;
}
