import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    // Return current configuration (without sensitive data)
    const config = {
      account_sid: process.env.TWILIO_ACCOUNT_SID || '',
      auth_token: process.env.TWILIO_AUTH_TOKEN ? '••••••••••••••••' : '',
      from_number: process.env.TWILIO_FROM_NUMBER || '',
      status_callback_url: process.env.TWILIO_STATUS_CALLBACK_URL || ''
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error loading SMS config:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_sid, auth_token, from_number, status_callback_url } = body;

    const supabase = createSupabaseClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Store configuration in organization settings
    const { error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: profile.organization_id,
        setting_key: 'twilio_config',
        setting_value: {
          account_sid,
          auth_token: auth_token && auth_token !== '••••••••••••••••' ? auth_token : undefined,
          from_number,
          status_callback_url,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        }
      });

    if (error) {
      console.error('Error saving SMS config:', error);
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'SMS configuration saved successfully' 
    });

  } catch (error) {
    console.error('Error saving SMS config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}