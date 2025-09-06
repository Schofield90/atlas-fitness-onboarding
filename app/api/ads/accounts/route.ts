import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get current user and organization
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get Facebook ad accounts for this organization
    const { data: accounts, error } = await supabase
      .from('facebook_ad_accounts')
      .select(`
        id,
        facebook_ad_account_id,
        account_name,
        account_status,
        currency,
        timezone_name,
        is_active,
        spend_cap,
        business_name,
        last_insights_sync_at,
        created_at
      `)
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch ad accounts' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      accounts: accounts || []
    });

  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get current user and organization
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!user?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const body = await request.json();
    const { facebook_ad_account_id, access_token } = body;

    if (!facebook_ad_account_id || !access_token) {
      return NextResponse.json({ 
        error: 'Missing required fields: facebook_ad_account_id, access_token' 
      }, { status: 400 });
    }

    // Get ad account details from Facebook Marketing API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${facebook_ad_account_id}?fields=name,account_status,currency,timezone_name,spend_cap,business&access_token=${access_token}`
    );

    if (!fbResponse.ok) {
      const fbError = await fbResponse.json();
      return NextResponse.json({ 
        error: 'Failed to fetch ad account from Facebook', 
        details: fbError 
      }, { status: 400 });
    }

    const adAccountData = await fbResponse.json();

    // Get integration ID (assuming there's an active Facebook integration)
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return NextResponse.json({ 
        error: 'No active Facebook integration found' 
      }, { status: 400 });
    }

    // Insert ad account into database
    const { data: newAccount, error: insertError } = await supabase
      .from('facebook_ad_accounts')
      .insert({
        integration_id: integration.id,
        organization_id: user.organization_id,
        facebook_ad_account_id,
        account_name: adAccountData.name,
        account_status: adAccountData.account_status,
        currency: adAccountData.currency,
        timezone_name: adAccountData.timezone_name,
        spend_cap: adAccountData.spend_cap,
        business_name: adAccountData.business?.name,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json({ error: 'Failed to save ad account' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      account: newAccount 
    });

  } catch (error) {
    console.error('Error adding ad account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}