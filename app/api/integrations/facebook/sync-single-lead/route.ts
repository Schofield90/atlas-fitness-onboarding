import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { leadsDB } from "@/app/lib/leads-store";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, formId, pageId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 },
      );
    }

    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("fb_token_data");

    if (!tokenCookie?.value) {
      return NextResponse.json(
        { error: "Facebook not connected" },
        { status: 401 },
      );
    }

    const tokenData = JSON.parse(tokenCookie.value);
    let accessToken = tokenData.access_token;

    console.log(`🔄 Syncing single lead: ${leadId} from form: ${formId}`);

    try {
      // If we have pageId, try to get page token for better permissions
      if (pageId) {
        try {
          const pageResponse = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${accessToken}`,
          );
          const pageData = await pageResponse.json();
          if (pageData.access_token) {
            accessToken = pageData.access_token;
            console.log("Using page access token");
          }
        } catch (e) {
          console.log("Could not get page token, using user token");
        }
      }

      // Fetch the lead details
      const leadResponse = await fetch(
        `https://graph.facebook.com/v18.0/${leadId}?access_token=${accessToken}`,
      );

      const leadDetails = await leadResponse.json();

      if (leadDetails.error) {
        console.error("Error fetching lead:", leadDetails.error);
        return NextResponse.json(
          {
            success: false,
            error: leadDetails.error.message,
            error_code: leadDetails.error.code,
          },
          { status: 400 },
        );
      }

      // Extract field data
      const fields: Record<string, string> = {};
      let fullName = "";
      let email = "";
      let phone = "";

      leadDetails.field_data?.forEach((field: any) => {
        const value = field.values?.[0] || "";
        fields[field.name] = value;

        // Common field mappings
        const fieldNameLower = field.name.toLowerCase();
        if (
          fieldNameLower.includes("name") &&
          !fieldNameLower.includes("last")
        ) {
          fullName = value;
        } else if (fieldNameLower === "full_name") {
          fullName = value;
        } else if (fieldNameLower.includes("email")) {
          email = value;
        } else if (
          fieldNameLower.includes("phone") ||
          fieldNameLower.includes("mobile")
        ) {
          phone = value;
        }
      });

      // If no full name, try to combine first and last
      if (!fullName && (fields.first_name || fields.last_name)) {
        fullName =
          `${fields.first_name || ""} ${fields.last_name || ""}`.trim();
      }

      // Get form name if we have formId
      let formName = "Facebook Lead Form";
      if (formId) {
        try {
          const formResponse = await fetch(
            `https://graph.facebook.com/v18.0/${formId}?fields=name&access_token=${accessToken}`,
          );
          const formData = await formResponse.json();
          if (formData.name) {
            formName = formData.name;
          }
        } catch (e) {
          console.log("Could not fetch form name");
        }
      }

      // Create the lead object
      const leadToSave = {
        name: fullName || "Unknown",
        email: email || fields.email || "Not provided",
        phone: phone || fields.phone_number || fields.phone || "Not provided",
        source: "facebook" as const,
        status: "new" as const,
        form_name: formName,
        campaign_name: leadDetails.campaign_name || null,
        facebook_lead_id: leadId,
        page_id: pageId || null,
        form_id: formId || null,
        custom_fields: fields,
      };

      // Save to database
      const newLead = leadsDB.create(leadToSave);

      console.log(
        `✅ Lead synced successfully: ${newLead.name} (${newLead.email})`,
      );

      return NextResponse.json({
        success: true,
        lead: newLead,
        message: `Lead ${newLead.name} synced successfully`,
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
