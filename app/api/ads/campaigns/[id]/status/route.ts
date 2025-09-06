import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

    const campaignId = params.id;
    const body = await request.json();
    const { status } = body;

    if (!status || !["ACTIVE", "PAUSED"].includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status. Must be ACTIVE or PAUSED",
        },
        { status: 400 },
      );
    }

    // Get the campaign and its Facebook campaign ID
    const { data: campaign, error: campaignError } = await supabase
      .from("facebook_campaigns")
      .select(
        `
        facebook_campaign_id,
        campaign_name,
        facebook_ad_accounts!inner (
          facebook_ad_account_id,
          facebook_integrations!inner (
            access_token
          )
        )
      `,
      )
      .eq("id", campaignId)
      .eq("organization_id", user.organization_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const integration = (campaign as any).facebook_ad_accounts
      .facebook_integrations;
    const accessToken = integration.access_token;
    const fbCampaignId = campaign.facebook_campaign_id;

    // Update status on Facebook
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${fbCampaignId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: status,
          access_token: accessToken,
        }),
      },
    );

    if (!fbResponse.ok) {
      const fbError = await fbResponse.json();
      return NextResponse.json(
        {
          error: "Failed to update campaign status on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    // Update status in database
    const { error: updateError } = await supabase
      .from("facebook_campaigns")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .eq("organization_id", user.organization_id);

    if (updateError) {
      console.error("Database error:", updateError);
      return NextResponse.json(
        { error: "Failed to update campaign in database" },
        { status: 500 },
      );
    }

    // Also update all related ad sets and ads
    const { error: adsetError } = await supabase
      .from("facebook_adsets")
      .update({ status: status })
      .eq("campaign_id", campaignId)
      .eq("organization_id", user.organization_id);

    if (!adsetError) {
      const { data: adsets } = await supabase
        .from("facebook_adsets")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("organization_id", user.organization_id);

      if (adsets && adsets.length > 0) {
        await supabase
          .from("facebook_ads")
          .update({ status: status })
          .in(
            "adset_id",
            adsets.map((as) => as.id),
          )
          .eq("organization_id", user.organization_id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Campaign ${status.toLowerCase()} successfully`,
      campaign: {
        id: campaignId,
        name: campaign.campaign_name,
        status: status,
      },
    });
  } catch (error) {
    console.error("Error updating campaign status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
