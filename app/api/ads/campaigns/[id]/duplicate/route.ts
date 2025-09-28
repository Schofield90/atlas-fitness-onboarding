import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const campaignId = params.id;

    // Get the original campaign with all its data
    const { data: originalCampaign, error: campaignError } = await supabase
      .from("facebook_campaigns")
      .select(
        `
        *,
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

    if (campaignError || !originalCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const integration = (originalCampaign as any).facebook_ad_accounts
      .facebook_integrations;
    const accessToken = integration.access_token;
    const adAccountId = `act_${(originalCampaign as any).facebook_ad_accounts.facebook_ad_account_id}`;

    // Get original campaign details from Facebook
    const fbCampaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/${originalCampaign.facebook_campaign_id}?fields=name,objective,buying_type,special_ad_categories&access_token=${accessToken}`,
    );

    if (!fbCampaignResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch original campaign from Facebook",
        },
        { status: 400 },
      );
    }

    const fbCampaignData = await fbCampaignResponse.json();

    // Create duplicate campaign on Facebook
    const duplicateName = `${fbCampaignData.name} - Copy`;
    const newCampaignResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: duplicateName,
          objective: fbCampaignData.objective,
          buying_type: fbCampaignData.buying_type || "AUCTION",
          special_ad_categories: fbCampaignData.special_ad_categories || [],
          status: "PAUSED", // Start paused
          access_token: accessToken,
        }),
      },
    );

    if (!newCampaignResponse.ok) {
      const fbError = await newCampaignResponse.json();
      return NextResponse.json(
        {
          error: "Failed to create duplicate campaign on Facebook",
          details: fbError,
        },
        { status: 400 },
      );
    }

    const newFbCampaign = await newCampaignResponse.json();

    // Save the new campaign to database
    const { data: newCampaign, error: insertError } = await supabase
      .from("facebook_campaigns")
      .insert({
        ad_account_id: originalCampaign.ad_account_id,
        organization_id: user.organization_id,
        facebook_campaign_id: newFbCampaign.id,
        campaign_name: duplicateName,
        objective: originalCampaign.objective,
        status: "PAUSED",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json(
        { error: "Failed to save duplicate campaign" },
        { status: 500 },
      );
    }

    // Get original ad sets
    const { data: originalAdSets, error: adSetsError } = await supabase
      .from("facebook_adsets")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("organization_id", user.organization_id);

    if (adSetsError) {
      console.error("Error fetching ad sets:", adSetsError);
    } else if (originalAdSets && originalAdSets.length > 0) {
      // Duplicate ad sets
      for (const originalAdSet of originalAdSets) {
        try {
          // Get original ad set details from Facebook
          const fbAdSetResponse = await fetch(
            `https://graph.facebook.com/v18.0/${originalAdSet.facebook_adset_id}?fields=name,optimization_goal,billing_event,daily_budget,lifetime_budget,targeting&access_token=${accessToken}`,
          );

          if (fbAdSetResponse.ok) {
            const fbAdSetData = await fbAdSetResponse.json();

            // Create duplicate ad set on Facebook
            const duplicateAdSetName = `${fbAdSetData.name} - Copy`;
            const newAdSetResponse = await fetch(
              `https://graph.facebook.com/v18.0/${adAccountId}/adsets`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: duplicateAdSetName,
                  campaign_id: newFbCampaign.id,
                  optimization_goal: fbAdSetData.optimization_goal,
                  billing_event: fbAdSetData.billing_event,
                  daily_budget: fbAdSetData.daily_budget,
                  lifetime_budget: fbAdSetData.lifetime_budget,
                  targeting: fbAdSetData.targeting,
                  status: "PAUSED",
                  access_token: accessToken,
                }),
              },
            );

            if (newAdSetResponse.ok) {
              const newFbAdSet = await newAdSetResponse.json();

              // Save the new ad set to database
              const { data: newAdSet, error: adSetInsertError } = await supabase
                .from("facebook_adsets")
                .insert({
                  campaign_id: newCampaign.id,
                  organization_id: user.organization_id,
                  facebook_adset_id: newFbAdSet.id,
                  adset_name: duplicateAdSetName,
                  optimization_goal: originalAdSet.optimization_goal,
                  billing_event: originalAdSet.billing_event,
                  daily_budget: originalAdSet.daily_budget,
                  lifetime_budget: originalAdSet.lifetime_budget,
                  targeting: originalAdSet.targeting,
                  status: "PAUSED",
                })
                .select()
                .single();

              if (!adSetInsertError) {
                // Get original ads for this ad set
                const { data: originalAds, error: adsError } = await supabase
                  .from("facebook_ads")
                  .select(
                    `
                    *,
                    facebook_ad_creatives (*)
                  `,
                  )
                  .eq("adset_id", originalAdSet.id)
                  .eq("organization_id", user.organization_id);

                if (!adsError && originalAds && originalAds.length > 0) {
                  // Duplicate ads and creatives
                  for (const originalAd of originalAds) {
                    try {
                      const creative = (originalAd as any)
                        .facebook_ad_creatives;

                      if (creative) {
                        // Create duplicate creative on Facebook
                        const newCreativeResponse = await fetch(
                          `https://graph.facebook.com/v18.0/${adAccountId}/adcreatives`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              name: `${creative.creative_name} - Copy`,
                              object_story_spec: {
                                page_id: "123456789", // This should come from connected Facebook page
                                link_data: {
                                  link: creative.link_url,
                                  message: creative.body,
                                  name: creative.title,
                                  call_to_action: {
                                    type: creative.call_to_action_type,
                                  },
                                },
                              },
                              access_token: accessToken,
                            }),
                          },
                        );

                        if (newCreativeResponse.ok) {
                          const newFbCreative =
                            await newCreativeResponse.json();

                          // Save the new creative to database
                          const { data: newCreative } = await supabase
                            .from("facebook_ad_creatives")
                            .insert({
                              organization_id: user.organization_id,
                              facebook_creative_id: newFbCreative.id,
                              creative_name: `${creative.creative_name} - Copy`,
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

                          if (newCreative) {
                            // Create duplicate ad on Facebook
                            const duplicateAdName = `${originalAd.ad_name} - Copy`;
                            const newAdResponse = await fetch(
                              `https://graph.facebook.com/v18.0/${adAccountId}/ads`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  name: duplicateAdName,
                                  adset_id: newFbAdSet.id,
                                  creative: { creative_id: newFbCreative.id },
                                  status: "PAUSED",
                                  access_token: accessToken,
                                }),
                              },
                            );

                            if (newAdResponse.ok) {
                              const newFbAd = await newAdResponse.json();

                              // Save the new ad to database
                              await supabase.from("facebook_ads").insert({
                                adset_id: newAdSet.id,
                                organization_id: user.organization_id,
                                facebook_ad_id: newFbAd.id,
                                ad_name: duplicateAdName,
                                creative_id: newCreative.id,
                                status: "PAUSED",
                              });
                            }
                          }
                        }
                      }
                    } catch (adError) {
                      console.error("Error duplicating ad:", adError);
                    }
                  }
                }
              }
            }
          }
        } catch (adSetError) {
          console.error("Error duplicating ad set:", adSetError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: newCampaign.id,
      facebook_campaign_id: newFbCampaign.id,
      message: "Campaign duplicated successfully",
      campaign: {
        id: newCampaign.id,
        name: duplicateName,
        status: "PAUSED",
      },
    });
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
