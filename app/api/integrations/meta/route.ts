import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getMetaAdsClient } from '@/lib/integrations/meta-ads';
import { z } from 'zod';

const connectMetaSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

const syncMetaSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  force_sync: z.boolean().default(false),
});

// GET /api/integrations/meta - Get Meta integration status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Get Meta integration settings
    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('platform', 'meta')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching Meta integration:', error);
      return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
    }

    if (!integration) {
      return NextResponse.json({ 
        connected: false,
        redirect_url: getMetaOAuthUrl(organizationId)
      });
    }

    // Validate access token
    try {
      const metaClient = getMetaAdsClient(integration.account_id);
      const isValid = await metaClient.validateAccessToken();
      
      if (!isValid) {
        // Try to refresh token
        if (integration.refresh_token) {
          try {
            const { accessToken, expiresIn } = await metaClient.refreshAccessToken(integration.refresh_token);
            
            // Update stored tokens
            await supabaseAdmin
              .from('integrations')
              .update({
                access_token: accessToken,
                token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', integration.id);

            return NextResponse.json({ 
              connected: true, 
              account_id: integration.account_id,
              account_name: integration.account_name,
              last_sync: integration.last_sync,
            });
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            return NextResponse.json({ 
              connected: false, 
              error: 'Token expired',
              redirect_url: getMetaOAuthUrl(organizationId)
            });
          }
        } else {
          return NextResponse.json({ 
            connected: false, 
            error: 'Token expired',
            redirect_url: getMetaOAuthUrl(organizationId)
          });
        }
      }

      return NextResponse.json({ 
        connected: true, 
        account_id: integration.account_id,
        account_name: integration.account_name,
        last_sync: integration.last_sync,
      });
    } catch (error) {
      console.error('Error validating Meta token:', error);
      return NextResponse.json({ 
        connected: false, 
        error: 'Invalid token',
        redirect_url: getMetaOAuthUrl(organizationId)
      });
    }
  } catch (error) {
    console.error('Error in GET /api/integrations/meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/integrations/meta - Connect Meta account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = connectMetaSchema.parse(body);

    // Verify state parameter matches expected format
    const stateData = JSON.parse(decodeURIComponent(validatedData.state));
    if (stateData.organization_id !== validatedData.organization_id) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        client_secret: process.env.META_APP_SECRET || '',
        code: validatedData.code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Meta OAuth error:', error);
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Get user's ad accounts
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_id,account_status,business_name,currency,timezone_name`
    );

    if (!accountsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch ad accounts' }, { status: 400 });
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.data;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No ad accounts found' }, { status: 400 });
    }

    // For now, use the first account (in production, you'd let user choose)
    const account = accounts[0];

    // Store integration
    const integrationData = {
      organization_id: validatedData.organization_id,
      platform: 'meta',
      account_id: account.account_id,
      account_name: account.name,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      settings: {
        business_name: account.business_name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        account_status: account.account_status,
      },
      is_active: true,
      created_by: validatedData.user_id,
    };

    const { data: integration, error } = await supabaseAdmin
      .from('integrations')
      .upsert(integrationData, { 
        onConflict: 'organization_id,platform',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing Meta integration:', error);
      return NextResponse.json({ error: 'Failed to store integration' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('integration_activities')
      .insert([{
        integration_id: integration.id,
        user_id: validatedData.user_id,
        type: 'connected',
        subject: 'Meta Account Connected',
        content: `Meta ad account "${account.name}" connected successfully`,
        metadata: {
          account_id: account.account_id,
          account_name: account.name,
          business_name: account.business_name,
        },
      }]);

    return NextResponse.json({ 
      success: true, 
      integration: {
        id: integration.id,
        account_id: integration.account_id,
        account_name: integration.account_name,
        connected_at: integration.created_at,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/integrations/meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/integrations/meta - Sync Meta data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = syncMetaSchema.parse(body);

    // Get Meta integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('organization_id', validatedData.organization_id)
      .eq('platform', 'meta')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Meta integration not found' }, { status: 404 });
    }

    // Check if sync is needed
    const lastSync = integration.last_sync ? new Date(integration.last_sync) : null;
    const now = new Date();
    const syncThreshold = 5 * 60 * 1000; // 5 minutes

    if (!validatedData.force_sync && lastSync && (now.getTime() - lastSync.getTime()) < syncThreshold) {
      return NextResponse.json({ 
        success: true, 
        message: 'Sync not needed - last sync was recent',
        last_sync: integration.last_sync 
      });
    }

    // Initialize Meta client
    const metaClient = getMetaAdsClient(integration.account_id);

    // Sync campaigns
    const metaCampaigns = await metaClient.getCampaigns();
    const syncResults = {
      campaigns_synced: 0,
      campaigns_created: 0,
      campaigns_updated: 0,
      errors: [] as string[],
    };

    for (const metaCampaign of metaCampaigns) {
      try {
        // Check if campaign exists in our DB
        const { data: existingCampaign } = await supabaseAdmin
          .from('campaigns')
          .select('id, meta_campaign_id')
          .eq('meta_campaign_id', metaCampaign.id)
          .eq('organization_id', validatedData.organization_id)
          .single();

        if (existingCampaign) {
          // Update existing campaign
          await supabaseAdmin
            .from('campaigns')
            .update({
              name: metaCampaign.name,
              status: metaCampaign.status.toLowerCase(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCampaign.id);
          
          syncResults.campaigns_updated++;
        } else {
          // Create new campaign
          const campaignData = {
            organization_id: validatedData.organization_id,
            name: metaCampaign.name,
            objective: metaCampaign.objective,
            status: metaCampaign.status.toLowerCase(),
            platform: 'facebook',
            budget_type: metaCampaign.daily_budget ? 'daily' : 'lifetime',
            budget_amount: parseFloat(metaCampaign.daily_budget || metaCampaign.lifetime_budget || '0'),
            start_date: metaCampaign.start_time || new Date().toISOString(),
            end_date: metaCampaign.stop_time || null,
            meta_campaign_id: metaCampaign.id,
            created_by: validatedData.user_id,
            metrics: {
              impressions: 0,
              clicks: 0,
              spend: 0,
              leads: 0,
              conversions: 0,
              ctr: 0,
              cpc: 0,
              cpm: 0,
              cost_per_lead: 0,
              cost_per_conversion: 0,
              roas: 0,
            },
          };

          await supabaseAdmin
            .from('campaigns')
            .insert([campaignData]);

          syncResults.campaigns_created++;
        }

        syncResults.campaigns_synced++;
      } catch (error) {
        console.error(`Error syncing campaign ${metaCampaign.id}:`, error);
        syncResults.errors.push(`Campaign ${metaCampaign.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync metrics for the last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      const insights = await metaClient.getAccountInsights({
        since: startDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0],
      });

      // Update account-level metrics
      await supabaseAdmin
        .from('integration_metrics')
        .upsert({
          integration_id: integration.id,
          date: endDate.toISOString().split('T')[0],
          metrics: {
            impressions: parseInt(insights.impressions),
            clicks: parseInt(insights.clicks),
            spend: parseFloat(insights.spend),
            reach: parseInt(insights.reach),
            ctr: parseFloat(insights.ctr),
            cpc: parseFloat(insights.cpc),
            cpm: parseFloat(insights.cpm),
          },
        }, { onConflict: 'integration_id,date' });
    } catch (error) {
      console.error('Error syncing account insights:', error);
      syncResults.errors.push(`Account insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update last sync time
    await supabaseAdmin
      .from('integrations')
      .update({
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    // Create activity record
    await supabaseAdmin
      .from('integration_activities')
      .insert([{
        integration_id: integration.id,
        user_id: validatedData.user_id,
        type: 'synced',
        subject: 'Meta Data Synced',
        content: `Synced ${syncResults.campaigns_synced} campaigns (${syncResults.campaigns_created} created, ${syncResults.campaigns_updated} updated)`,
        metadata: syncResults,
      }]);

    return NextResponse.json({ 
      success: true, 
      sync_results: syncResults,
      last_sync: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error in PUT /api/integrations/meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/integrations/meta - Disconnect Meta account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const userId = searchParams.get('user_id');

    if (!organizationId || !userId) {
      return NextResponse.json({ error: 'Organization ID and User ID are required' }, { status: 400 });
    }

    // Get Meta integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('platform', 'meta')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Meta integration not found' }, { status: 404 });
    }

    // Deactivate integration
    const { error } = await supabaseAdmin
      .from('integrations')
      .update({
        is_active: false,
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (error) {
      console.error('Error disconnecting Meta integration:', error);
      return NextResponse.json({ error: 'Failed to disconnect integration' }, { status: 500 });
    }

    // Create activity record
    await supabaseAdmin
      .from('integration_activities')
      .insert([{
        integration_id: integration.id,
        user_id: userId,
        type: 'disconnected',
        subject: 'Meta Account Disconnected',
        content: `Meta ad account "${integration.account_name}" disconnected`,
        metadata: {
          account_id: integration.account_id,
          account_name: integration.account_name,
        },
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/integrations/meta:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate Meta OAuth URL
function getMetaOAuthUrl(organizationId: string): string {
  const baseUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`,
    scope: 'ads_management,ads_read,pages_read_engagement,pages_manage_ads,leads_retrieval',
    response_type: 'code',
    state: encodeURIComponent(JSON.stringify({ organization_id: organizationId })),
  });

  return `${baseUrl}?${params}`;
}