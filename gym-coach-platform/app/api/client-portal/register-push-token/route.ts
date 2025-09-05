import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { 
      clientId, 
      pushToken, 
      provider, 
      deviceId, 
      deviceType, 
      appVersion 
    } = await request.json();

    if (!clientId || !pushToken || !provider) {
      return NextResponse.json(
        { error: 'Client ID, push token, and provider are required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!['fcm', 'expo', 'apns'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be fcm, expo, or apns' },
        { status: 400 }
      );
    }

    // Get client's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Deactivate old tokens for this client and device
    if (deviceId) {
      await supabase
        .from('client_push_tokens')
        .update({ is_active: false })
        .eq('client_id', clientId)
        .eq('device_id', deviceId);
    }

    // Insert or update the push token
    const { data, error } = await supabase
      .from('client_push_tokens')
      .upsert({
        organization_id: client.organization_id,
        client_id: clientId,
        push_token: pushToken,
        provider,
        device_id: deviceId,
        device_type: deviceType,
        app_version: appVersion,
        is_active: true,
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'client_id,push_token',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering push token:', error);
      return NextResponse.json(
        { error: 'Failed to register push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
      tokenId: data.id
    });

  } catch (error) {
    console.error('Error in register-push-token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve client's active push tokens
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const { data: tokens, error } = await supabase
      .from('client_push_tokens')
      .select('id, push_token, provider, device_id, device_type, is_active, last_used_at')
      .eq('client_id', clientId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching push tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tokens: tokens || []
    });

  } catch (error) {
    console.error('Error in get push tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}