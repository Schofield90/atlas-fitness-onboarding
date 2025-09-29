import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's organization ID dynamically
    let organizationId: string;

    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!userOrg?.organization_id) {
      // Fallback to default organization if needed
      organizationId = "63589490-8f55-4157-bd3a-e141594b748e";

      // Create user_organizations entry
      await supabase
        .from("user_organizations")
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          role: "owner",
        })
        .select();
    } else {
      organizationId = userOrg.organization_id;
    }

    // Check if we have a Facebook integration record
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      console.error("No active Facebook integration found:", intError);

      // Check if there's any integration at all
      const { data: anyIntegration } = await supabase
        .from("facebook_integrations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (anyIntegration) {
        // Update it to use the correct organization ID
        await supabase
          .from("facebook_integrations")
          .update({
            organization_id: organizationId,
            is_active: true,
          })
          .eq("id", anyIntegration.id);

        return NextResponse.json(
          {
            error: "Integration was misconfigured. Please try syncing again.",
            fixed: true,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error:
            "No Facebook integration found. Please reconnect your Facebook account.",
        },
        { status: 400 },
      );
    }

    if (!integration.access_token) {
      return NextResponse.json(
        {
          error:
            "No access token found. Please reconnect your Facebook account.",
        },
        { status: 400 },
      );
    }

    // Fetch pages directly from Facebook Graph API
    console.log("🔄 Fetching pages from Facebook Graph API...");

    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,username,category,access_token,tasks&access_token=${integration.access_token}`,
    );

    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      console.error("❌ Facebook API error:", pagesData.error);

      // Token might be expired
      if (pagesData.error.code === 190) {
        await supabase
          .from("facebook_integrations")
          .update({
            is_active: false,
            connection_status: "expired",
            error_details: pagesData.error,
          })
          .eq("id", integration.id);

        return NextResponse.json(
          {
            error:
              "Facebook access token expired. Please reconnect your account.",
            details: pagesData.error,
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch pages from Facebook",
          details: pagesData.error,
        },
        { status: 500 },
      );
    }

    const pages = pagesData.data || [];
    console.log(`✅ Facebook API returned ${pages.length} pages`);

    if (pages.length === 0) {
      return NextResponse.json({
        message:
          "No pages found. Make sure you have admin access to at least one Facebook page.",
        pages: [],
      });
    }

    // Store pages in database
    const syncResults = [];

    for (const page of pages) {
      try {
        const { error: pageError } = await supabase
          .from("facebook_pages")
          .upsert(
            {
              integration_id: integration.id,
              organization_id: organizationId,
              facebook_page_id: page.id,
              page_name: page.name,
              page_username: page.username || null,
              page_category: page.category || null,
              access_token: page.access_token,
              is_active: true,
              page_info: {
                category: page.category,
                username: page.username,
                tasks: page.tasks || [],
              },
              permissions: page.tasks || [],
            },
            {
              onConflict: "organization_id,facebook_page_id",
            },
          );

        if (pageError) {
          console.error(`Failed to sync page ${page.id}:`, pageError);
          syncResults.push({
            pageId: page.id,
            pageName: page.name,
            status: "error",
            error: pageError.message,
          });
        } else {
          syncResults.push({
            pageId: page.id,
            pageName: page.name,
            status: "success",
          });
        }
      } catch (error: any) {
        console.error(`Error syncing page ${page.id}:`, error);
        syncResults.push({
          pageId: page.id,
          pageName: page.name,
          status: "error",
          error: error.message,
        });
      }
    }

    const successCount = syncResults.filter(
      (r) => r.status === "success",
    ).length;
    const errorCount = syncResults.filter((r) => r.status === "error").length;

    // Update integration last sync time
    await supabase
      .from("facebook_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        settings: {
          ...integration.settings,
          last_pages_sync: new Date().toISOString(),
        },
      })
      .eq("id", integration.id);

    // Also fetch and sync ad accounts
    console.log("🔄 Fetching ad accounts from Facebook...");

    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${integration.access_token}`,
    );

    const adAccountsData = await adAccountsResponse.json();

    if (adAccountsData.data && adAccountsData.data.length > 0) {
      console.log(`✅ Found ${adAccountsData.data.length} ad accounts`);

      // Store ad accounts - wrap in try-catch in case table doesn't exist
      for (const account of adAccountsData.data) {
        try {
          // Check if table exists first
          const { error: checkError } = await supabase
            .from("facebook_ad_accounts")
            .select("id")
            .limit(0);

          if (checkError && checkError.message?.includes("does not exist")) {
            console.log(
              "facebook_ad_accounts table does not exist yet - skipping ad account sync",
            );
            break;
          }

          const { error: adAccountError } = await supabase
            .from("facebook_ad_accounts")
            .upsert(
              {
                integration_id: integration.id,
                organization_id: organizationId,
                facebook_account_id: account.id,
                account_name: account.name,
                account_status: account.account_status,
                currency: account.currency,
                timezone: account.timezone_name,
                is_active: account.account_status === 1,
              },
              {
                onConflict: "organization_id,facebook_account_id",
              },
            );

          if (adAccountError) {
            console.log("Ad account sync error:", adAccountError.message);
          }
        } catch (err: any) {
          console.log("Ad account sync skipped:", err.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${successCount} pages${errorCount > 0 ? `, ${errorCount} errors` : ""}`,
      results: syncResults,
      summary: {
        totalPages: pages.length,
        successful: successCount,
        errors: errorCount,
      },
    });
  } catch (error: any) {
    console.error("Pages sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync pages",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
