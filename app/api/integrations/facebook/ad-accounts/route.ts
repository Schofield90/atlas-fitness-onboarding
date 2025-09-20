import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export const runtime = "nodejs";

// Helper functions for account status
function getAccountStatus(status: number): string {
  switch (status) {
    case 1:
      return "Active";
    case 2:
      return "Disabled";
    case 3:
      return "Unsettled";
    case 7:
      return "Pending Review";
    case 9:
      return "In Grace Period";
    case 101:
      return "Pending Closure";
    case 201:
      return "Closed";
    default:
      return "Unknown";
  }
}

function getStatusColor(status: number): string {
  switch (status) {
    case 1:
      return "green";
    case 2:
      return "red";
    case 3:
      return "yellow";
    case 7:
      return "orange";
    default:
      return "gray";
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get time filter from query params
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get("time_filter") || "last_30_days";

    // Get access token from database instead of cookies
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

    // Get Facebook integration from database
    const { data: integration, error: intError } = await supabase
      .from("facebook_integrations")
      .select("access_token, facebook_user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .single();

    if (intError || !integration || !integration.access_token) {
      console.log("⚠️ No active Facebook integration found");
      return NextResponse.json({
        success: true,
        ad_accounts: [],
        message:
          "No Facebook integration found. Please connect your Facebook account first.",
      });
    }

    let storedAccessToken = integration.access_token;
    let facebookUserId = integration.facebook_user_id;

    console.log(
      "🔑 Retrieved Facebook token from database for user:",
      facebookUserId,
    );

    console.log(
      "💰 Fetching Facebook Ad Accounts with time filter:",
      timeFilter,
    );

    // If we have a real token, use Facebook API
    if (storedAccessToken) {
      console.log("📊 Making real Facebook API call for ad accounts");
      console.log(
        "🔑 Using token:",
        storedAccessToken.substring(0, 20) + "...",
      );

      // Build time_range parameter based on filter
      let timeRange = "";
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      switch (timeFilter) {
        case "today":
          timeRange = `&time_range={'since':'${today.toISOString().split("T")[0]}','until':'${today.toISOString().split("T")[0]}'}`;
          break;
        case "yesterday":
          timeRange = `&time_range={'since':'${yesterday.toISOString().split("T")[0]}','until':'${yesterday.toISOString().split("T")[0]}'}`;
          break;
        case "last_7_days":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          timeRange = `&time_range={'since':'${weekAgo.toISOString().split("T")[0]}','until':'${today.toISOString().split("T")[0]}'}`;
          break;
        case "last_30_days":
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          timeRange = `&time_range={'since':'${monthAgo.toISOString().split("T")[0]}','until':'${today.toISOString().split("T")[0]}'}`;
          break;
        case "last_90_days":
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
          timeRange = `&time_range={'since':'${threeMonthsAgo.toISOString().split("T")[0]}','until':'${today.toISOString().split("T")[0]}'}`;
          break;
        case "this_month":
          const firstDayMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          timeRange = `&time_range={'since':'${firstDayMonth.toISOString().split("T")[0]}','until':'${today.toISOString().split("T")[0]}'}`;
          break;
        case "last_month":
          const firstDayLastMonth = new Date(
            today.getFullYear(),
            today.getMonth() - 1,
            1,
          );
          const lastDayLastMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            0,
          );
          timeRange = `&time_range={'since':'${firstDayLastMonth.toISOString().split("T")[0]}','until':'${lastDayLastMonth.toISOString().split("T")[0]}'}`;
          break;
        case "lifetime":
          timeRange = ""; // No time filter for lifetime
          break;
      }

      // Updated fields to include business and proper field names
      const apiUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name,amount_spent,balance,spend_cap,created_time,funding_source,business${timeRange}&access_token=${storedAccessToken}`;
      console.log(
        "🌐 API URL:",
        apiUrl.replace(storedAccessToken, "TOKEN_HIDDEN"),
      );

      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log("📥 Facebook Ad Accounts Response:", {
        status: response.status,
        hasError: !!data.error,
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        rawData: data, // Log full response for debugging
      });

      if (data.error) {
        console.error("❌ Facebook API error:", data.error);
        // Don't fall through to demo data - return the error
        return NextResponse.json(
          {
            success: false,
            error: data.error.message,
            error_code: data.error.code,
            error_type: data.error.type,
            debug: {
              api_call: "GET /me/adaccounts",
              permissions_required: ["ads_management", "ads_read"],
              data_source: "facebook_api_error",
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 },
        );
      }

      // Handle successful response - even if empty
      const adAccounts = (data.data || []).map((account: any) => ({
        id: account.id,
        name: account.name,
        account_status: account.account_status,
        currency: account.currency,
        timezone: account.timezone_name,
        amount_spent: parseFloat(account.amount_spent || "0") / 100, // Facebook returns in cents
        balance: parseFloat(account.balance || "0") / 100,
        spend_cap: parseFloat(account.spend_cap || "0") / 100,
        created_time: account.created_time,
        funding_source: account.funding_source || "Unknown",
        business: account.business,
        status: getAccountStatus(account.account_status),
        status_code: account.account_status,
        status_color: getStatusColor(account.account_status),
        is_active: account.account_status === 1,
      }));

      console.log(`✅ Returning ${adAccounts.length} real ad accounts`);

      return NextResponse.json({
        success: true,
        ad_accounts: adAccounts,
        pagination: {
          total: adAccounts.length,
          has_next: !!data.paging?.next,
          next: data.paging?.next,
        },
        debug: {
          api_call: "GET /me/adaccounts",
          permissions_required: ["ads_management", "ads_read"],
          data_source: "facebook_api",
          time_filter: timeFilter,
          timestamp: new Date().toISOString(),
          raw_response_sample: data.data?.[0], // Include first account for debugging
        },
      });
    }

    // Return empty array when no token is available
    console.log("⚠️ No Facebook token available, returning empty ad accounts");

    return NextResponse.json({
      success: true,
      ad_accounts: [],
      summary: {
        total_accounts: 0,
        active_accounts: 0,
        total_spent: 0,
        total_balance: 0,
      },
      debug: {
        api_call: "GET /me/adaccounts",
        permissions_required: ["ads_management", "ads_read"],
        note: "No Facebook token available",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching Facebook ad accounts:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Facebook ad accounts",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          endpoint: "/api/integrations/facebook/ad-accounts",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
