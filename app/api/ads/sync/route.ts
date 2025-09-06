import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json(
        { error: "account_id is required" },
        { status: 400 },
      );
    }

    // Get the ad account and access token
    const { data: adAccount } = await supabase
      .from("facebook_ad_accounts")
      .select(
        `
        id,
        facebook_ad_account_id,
        facebook_integrations!inner (
          access_token,
          is_active
        )
      `,
      )
      .eq("id", account_id)
      .eq("organization_id", user.organization_id)
      .single();

    if (!adAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 },
      );
    }

    const integration = (adAccount as any).facebook_integrations;
    if (!integration.is_active) {
      return NextResponse.json(
        { error: "Facebook integration is not active" },
        { status: 400 },
      );
    }

    const accessToken = integration.access_token;
    const fbAdAccountId = `act_${adAccount.facebook_ad_account_id}`;

    let syncedCampaigns = 0;
    let syncedAds = 0;

    // Sync campaigns
    try {
      const campaignResponse = await fetch(
        `https://graph.facebook.com/v18.0/${fbAdAccountId}/campaigns?fields=id,name,objective,status,created_time,updated_time&limit=100&access_token=${accessToken}`,
      );

      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();

        for (const fbCampaign of campaignData.data || []) {
          // Get campaign insights
          const insightsResponse = await fetch(
            `https://graph.facebook.com/v18.0/${fbCampaign.id}/insights?fields=spend,impressions,clicks,actions&access_token=${accessToken}`,
          );

          let insights = {};
          let spend = 0;
          let impressions = 0;
          let clicks = 0;
          let leads_count = 0;

          if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            if (insightsData.data && insightsData.data.length > 0) {
              const insight = insightsData.data[0];
              insights = insight;
              spend = parseFloat(insight.spend || 0);
              impressions = parseInt(insight.impressions || 0);
              clicks = parseInt(insight.clicks || 0);

              // Count lead generation actions
              if (insight.actions) {
                const leadActions = insight.actions.find(
                  (action: any) =>
                    action.action_type === "lead" ||
                    action.action_type === "offsite_conversion.fb_pixel_lead",
                );
                leads_count = leadActions
                  ? parseInt(leadActions.value || 0)
                  : 0;
              }
            }
          }

          // Upsert campaign
          const { error: campaignError } = await supabase
            .from("facebook_campaigns")
            .upsert(
              {
                ad_account_id: adAccount.id,
                organization_id: user.organization_id,
                facebook_campaign_id: fbCampaign.id,
                campaign_name: fbCampaign.name,
                objective: fbCampaign.objective,
                status: fbCampaign.status,
                spend,
                impressions,
                clicks,
                leads_count,
                insights,
                last_insights_sync_at: new Date().toISOString(),
                created_time: new Date(fbCampaign.created_time).toISOString(),
                updated_time: new Date(fbCampaign.updated_time).toISOString(),
              },
              {
                onConflict: "facebook_campaign_id,organization_id",
              },
            );

          if (!campaignError) {
            syncedCampaigns++;
          }
        }
      }
    } catch (error) {
      console.error("Error syncing campaigns:", error);
    }

    // Sync ad sets
    try {
      const adSetResponse = await fetch(
        `https://graph.facebook.com/v18.0/${fbAdAccountId}/adsets?fields=id,name,campaign_id,optimization_goal,billing_event,daily_budget,lifetime_budget,targeting,status,created_time,updated_time&limit=100&access_token=${accessToken}`,
      );

      if (adSetResponse.ok) {
        const adSetData = await adSetResponse.json();

        for (const fbAdSet of adSetData.data || []) {
          // Get campaign reference
          const { data: campaign } = await supabase
            .from("facebook_campaigns")
            .select("id")
            .eq("facebook_campaign_id", fbAdSet.campaign_id)
            .eq("organization_id", user.organization_id)
            .single();

          if (campaign) {
            // Get ad set insights
            const insightsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbAdSet.id}/insights?fields=spend,impressions,clicks,cpm,cpc,ctr,reach,frequency&access_token=${accessToken}`,
            );

            let insights = {};
            let spend = 0;
            let impressions = 0;
            let clicks = 0;
            let reach = 0;
            let frequency = 0;
            let cpm = 0;
            let cpc = 0;
            let ctr = 0;

            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              if (insightsData.data && insightsData.data.length > 0) {
                const insight = insightsData.data[0];
                insights = insight;
                spend = parseFloat(insight.spend || 0);
                impressions = parseInt(insight.impressions || 0);
                clicks = parseInt(insight.clicks || 0);
                reach = parseInt(insight.reach || 0);
                frequency = parseFloat(insight.frequency || 0);
                cpm = parseFloat(insight.cpm || 0);
                cpc = parseFloat(insight.cpc || 0);
                ctr = parseFloat(insight.ctr || 0);
              }
            }

            // Upsert ad set
            await supabase.from("facebook_adsets").upsert(
              {
                campaign_id: campaign.id,
                organization_id: user.organization_id,
                facebook_adset_id: fbAdSet.id,
                adset_name: fbAdSet.name,
                optimization_goal: fbAdSet.optimization_goal,
                billing_event: fbAdSet.billing_event,
                daily_budget: fbAdSet.daily_budget,
                lifetime_budget: fbAdSet.lifetime_budget,
                targeting: fbAdSet.targeting,
                status: fbAdSet.status,
                spend,
                impressions,
                clicks,
                reach,
                frequency,
                cpm,
                cpc,
                ctr,
                insights_data: insights,
                last_metrics_sync_at: new Date().toISOString(),
                created_time: new Date(fbAdSet.created_time).toISOString(),
                updated_time: new Date(fbAdSet.updated_time).toISOString(),
              },
              {
                onConflict: "facebook_adset_id,organization_id",
              },
            );
          }
        }
      }
    } catch (error) {
      console.error("Error syncing ad sets:", error);
    }

    // Sync ads
    try {
      const adResponse = await fetch(
        `https://graph.facebook.com/v18.0/${fbAdAccountId}/ads?fields=id,name,adset_id,creative{id,name,title,body,call_to_action_type,image_url,video_id},status,created_time,updated_time&limit=100&access_token=${accessToken}`,
      );

      if (adResponse.ok) {
        const adData = await adResponse.json();

        for (const fbAd of adData.data || []) {
          // Get ad set reference
          const { data: adSet } = await supabase
            .from("facebook_adsets")
            .select("id")
            .eq("facebook_adset_id", fbAd.adset_id)
            .eq("organization_id", user.organization_id)
            .single();

          if (adSet) {
            // Get ad insights
            const insightsResponse = await fetch(
              `https://graph.facebook.com/v18.0/${fbAd.id}/insights?fields=spend,impressions,clicks,cpm,cpc,ctr,actions&access_token=${accessToken}`,
            );

            let insights = {};
            let spend = 0;
            let impressions = 0;
            let clicks = 0;
            let cpm = 0;
            let cpc = 0;
            let ctr = 0;
            let leads_count = 0;

            if (insightsResponse.ok) {
              const insightsData = await insightsResponse.json();
              if (insightsData.data && insightsData.data.length > 0) {
                const insight = insightsData.data[0];
                insights = insight;
                spend = parseFloat(insight.spend || 0);
                impressions = parseInt(insight.impressions || 0);
                clicks = parseInt(insight.clicks || 0);
                cpm = parseFloat(insight.cpm || 0);
                cpc = parseFloat(insight.cpc || 0);
                ctr = parseFloat(insight.ctr || 0);

                // Count lead actions
                if (insight.actions) {
                  const leadActions = insight.actions.find(
                    (action: any) =>
                      action.action_type === "lead" ||
                      action.action_type === "offsite_conversion.fb_pixel_lead",
                  );
                  leads_count = leadActions
                    ? parseInt(leadActions.value || 0)
                    : 0;
                }
              }
            }

            // Handle creative data
            let creative_id = null;
            if (fbAd.creative) {
              const { data: creative } = await supabase
                .from("facebook_ad_creatives")
                .select("id")
                .eq("facebook_creative_id", fbAd.creative.id)
                .eq("organization_id", user.organization_id)
                .single();

              if (creative) {
                creative_id = creative.id;
              } else {
                // Create creative if it doesn't exist
                const { data: newCreative } = await supabase
                  .from("facebook_ad_creatives")
                  .insert({
                    organization_id: user.organization_id,
                    facebook_creative_id: fbAd.creative.id,
                    creative_name:
                      fbAd.creative.name || `Creative ${fbAd.creative.id}`,
                    title: fbAd.creative.title || "",
                    body: fbAd.creative.body || "",
                    call_to_action_type:
                      fbAd.creative.call_to_action_type || "LEARN_MORE",
                    image_url: fbAd.creative.image_url,
                    video_id: fbAd.creative.video_id,
                    creative_type: fbAd.creative.video_id
                      ? "video"
                      : "single_image",
                  })
                  .select("id")
                  .single();

                creative_id = newCreative?.id;
              }
            }

            // Upsert ad
            const { error: adError } = await supabase
              .from("facebook_ads")
              .upsert(
                {
                  adset_id: adSet.id,
                  organization_id: user.organization_id,
                  facebook_ad_id: fbAd.id,
                  ad_name: fbAd.name,
                  creative_id,
                  status: fbAd.status,
                  spend,
                  impressions,
                  clicks,
                  leads_count,
                  cpm,
                  cpc,
                  ctr,
                  cost_per_lead: leads_count > 0 ? spend / leads_count : 0,
                  conversion_rate:
                    clicks > 0 ? (leads_count / clicks) * 100 : 0,
                  insights_data: insights,
                  last_metrics_sync_at: new Date().toISOString(),
                  created_time: new Date(fbAd.created_time).toISOString(),
                  updated_time: new Date(fbAd.updated_time).toISOString(),
                },
                {
                  onConflict: "facebook_ad_id,organization_id",
                },
              );

            if (!adError) {
              syncedAds++;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing ads:", error);
    }

    // Update last sync timestamp for the ad account
    await supabase
      .from("facebook_ad_accounts")
      .update({ last_insights_sync_at: new Date().toISOString() })
      .eq("id", account_id);

    return NextResponse.json({
      success: true,
      synced: {
        campaigns: syncedCampaigns,
        ads: syncedAds,
      },
      message: `Successfully synced ${syncedCampaigns} campaigns and ${syncedAds} ads`,
    });
  } catch (error) {
    console.error("Error syncing Facebook data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
