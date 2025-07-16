import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { twilioService } from '@/lib/sms/twilio-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json({ 
        error: 'Phone number and message are required' 
      }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Test Twilio configuration
    const configTest = await twilioService.testConfiguration();
    if (!configTest.configured) {
      return NextResponse.json({ 
        success: false,
        error: configTest.error || 'Twilio not configured'
      });
    }

    // Send test SMS
    const result = await twilioService.sendSMS({
      to: phone,
      message: `[TEST] ${message}`,
      organization_id: profile.organization_id,
      template_key: 'test_sms'
    });

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test SMS sent successfully',
        message_sid: result.message_sid,
        cost_pence: result.cost_pence
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to send SMS'
      });
    }

  } catch (error) {
    console.error('Error sending test SMS:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to send test SMS' 
    }, { status: 500 });
  }
}