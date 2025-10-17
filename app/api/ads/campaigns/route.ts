import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user and organization
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("account_id");
    const days = parseInt(searchParams.get("days") || "7");

    if (!accountId) {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 },
      );
    }

    // Get campaigns for the specified ad account
    let query = supabase
      .from("facebook_campaigns")
      .select(
        `
        id,
        facebook_campaign_id,
        campaign_name,
        objective,
        status,
        spend,
        impressions,
        clicks,
        leads_count,
        start_time,
        stop_time,
        last_insights_sync_at,
        insights,
        created_at
      `,
      )
      .eq("organization_id", user.organization_id);

    // If account_id is provided, join with ad_accounts to filter
    if (accountId !== "all") {
      query = query.eq("ad_account_id", accountId);
    }

    const { data: campaigns, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 },
      );
    }

    // Calculate additional metrics for each campaign
    const campaignsWithMetrics =
      campaigns?.map((campaign) => ({
        ...campaign,
        ctr:
          campaign.impressions > 0
            ? (campaign.clicks / campaign.impressions) * 100
            : 0,
        cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0,
        cost_per_lead:
          campaign.leads_count > 0 ? campaign.spend / campaign.leads_count : 0,
        conversion_rate:
          campaign.clicks > 0
            ? (campaign.leads_count / campaign.clicks) * 100
            : 0,
      })) || [];

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithMetrics,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user and organization
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { campaign, adset, creative } = body;

    if (!campaign || !adset || !creative) {
      return NextResponse.json(
        {
          error: "Missing required fields: campaign, adset, creative",
        },
        { status: 400 },
      );
    }

    // Get the ad account and access token
    const { data: adAccount } = await supabase
      .from("facebook_ad_accounts")
      .select(
        `
        facebook_ad_account_id,
        facebook_integrations (
          access_token
        )
      `,
      )
      .eq("id", campaign.account_id)
      .eq("organization_id", user.organization_id)
      .single();

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 },
      );
    }

    const accessToken = (adAccount as any).facebook_integrations.access_token;
    const adAccountId = `act_${adAccount.facebook_ad_account_id}`;

    // Step 1: Create campaign on Facebook
    const campaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: campaign.name,
          objective: campaign.objective,
          status: "PAUSED", // Start paused for review
          buying_type: campaign.buying_type || "AUCTION",
          access_token: accessToken,
        }),
      },
    );

    if (!campaignResponse.ok) {
      const fbError = await campaignResponse.json();
      return NextResponse.json(
        {
          error: "Failed to create campaign on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    const fbCampaign = await campaignResponse.json();

    // Step 2: Create ad set on Facebook
    const adSetResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: adset.name,
          campaign_id: fbCampaign.id,
          optimization_goal: adset.optimization_goal,
          billing_event: adset.billing_event,
          bid_amount: adset.bid_amount,
          daily_budget: adset.daily_budget,
          lifetime_budget: adset.lifetime_budget,
          targeting: adset.targeting,
          status: "PAUSED",
          access_token: accessToken,
        }),
      },
    );

    if (!adSetResponse.ok) {
      const fbError = await adSetResponse.json();
      return NextResponse.json(
        {
          error: "Failed to create ad set on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    const fbAdSet = await adSetResponse.json();

    // Step 3: Create creative on Facebook
    const creativeResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/adcreatives`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: creative.name,
          object_story_spec: {
            page_id: "123456789", // This should come from connected Facebook page
            link_data: {
              link: creative.link_url,
              message: creative.body,
              name: creative.title,
              call_to_action: {
                type: creative.call_to_action_type,
              },
              image_hash: creative.image_hash || undefined,
              video_id: creative.video_id || undefined,
            },
          },
          access_token: accessToken,
        }),
      },
    );

    if (!creativeResponse.ok) {
      const fbError = await creativeResponse.json();
      return NextResponse.json(
        {
          error: "Failed to create creative on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    const fbCreative = await creativeResponse.json();

    // Step 4: Create ad on Facebook
    const adResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/ads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${campaign.name} - ${creative.name}`,
          adset_id: fbAdSet.id,
          creative: { creative_id: fbCreative.id },
          status: "PAUSED",
          access_token: accessToken,
        }),
      },
    );

    if (!adResponse.ok) {
      const fbError = await adResponse.json();
      return NextResponse.json(
        {
          error: "Failed to create ad on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    const fbAd = await adResponse.json();

    // Step 5: Save to database

    // Save campaign
    const { data: savedCampaign, error: campaignError } = await supabase
      .from("facebook_campaigns")
      .insert({
        ad_account_id: campaign.account_id,
        organization_id: user.organization_id,
        facebook_campaign_id: fbCampaign.id,
        campaign_name: campaign.name,
        objective: campaign.objective,
        status: "PAUSED",
      })
      .select()
      .single();

    if (campaignError) {
      console.error("Error saving campaign:", campaignError);
      return NextResponse.json(
        { error: "Failed to save campaign" },
        { status: 500 },
      );
    }

    // Save creative
    const { data: savedCreative, error: creativeError } = await supabase
      .from("facebook_ad_creatives")
      .insert({
        organization_id: user.organization_id,
        facebook_creative_id: fbCreative.id,
        creative_name: creative.name,
        title: creative.title,
        body: creative.body,
        call_to_action_type: creative.call_to_action_type,
        link_url: creative.link_url,
        display_url: creative.display_url,
        image_url: creative.image_url,
        video_url: creative.video_url,
        creative_type: creative.creative_type,
      })
      .select()
      .single();

    if (creativeError) {
      console.error("Error saving creative:", creativeError);
      return NextResponse.json(
        { error: "Failed to save creative" },
        { status: 500 },
      );
    }

    // Save ad set
    const { data: savedAdSet, error: adSetError } = await supabase
      .from("facebook_adsets")
      .insert({
        campaign_id: savedCampaign.id,
        organization_id: user.organization_id,
        facebook_adset_id: fbAdSet.id,
        adset_name: adset.name,
        optimization_goal: adset.optimization_goal,
        billing_event: adset.billing_event,
        daily_budget: adset.daily_budget,
        lifetime_budget: adset.lifetime_budget,
        targeting: adset.targeting,
        status: "PAUSED",
      })
      .select()
      .single();

    if (adSetError) {
      console.error("Error saving ad set:", adSetError);
      return NextResponse.json(
        { error: "Failed to save ad set" },
        { status: 500 },
      );
    }

    // Save ad
    const { data: savedAd, error: adError } = await supabase
      .from("facebook_ads")
      .insert({
        adset_id: savedAdSet.id,
        organization_id: user.organization_id,
        facebook_ad_id: fbAd.id,
        ad_name: `${campaign.name} - ${creative.name}`,
        creative_id: savedCreative.id,
        status: "PAUSED",
      })
      .select()
      .single();

    if (adError) {
      console.error("Error saving ad:", adError);
      return NextResponse.json({ error: "Failed to save ad" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      campaign_id: savedCampaign.id,
      facebook_campaign_id: fbCampaign.id,
      message: "Campaign created successfully and is paused for review",
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
