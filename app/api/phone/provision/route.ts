import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, phoneNumber, country } = await request.json()

    // Verify user belongs to organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    if (!userOrg) {
      return NextResponse.json({ error: 'Invalid organization' }, { status: 403 })
    }

    // Check if organization already has a number
    const { data: existingConfig } = await supabase
      .from('phone_configurations')
      .select('phone_number')
      .eq('organization_id', organizationId)
      .single()

    if (existingConfig) {
      return NextResponse.json(
        { error: 'Organization already has a phone number configured' },
        { status: 400 }
      )
    }

    // Use platform's master Twilio account
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    // Get the base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'

    try {
      // Purchase the phone number
      const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        smsUrl: `${baseUrl}/api/webhooks/twilio?org=${organizationId}`,
        smsMethod: 'POST',
        voiceUrl: `${baseUrl}/api/webhooks/twilio-voice?org=${organizationId}`,
        voiceMethod: 'POST',
        statusCallback: `${baseUrl}/api/webhooks/twilio-voice/status?org=${organizationId}`,
        statusCallbackMethod: 'POST',
        friendlyName: `Gym ${organizationId}`
      })

      // Save to database using admin client for full access
      const adminSupabase = createAdminClient()
      
      // Update organization record
      const { error: updateError } = await adminSupabase
        .from('organizations')
        .update({
          twilio_phone_number: purchasedNumber.phoneNumber,
          twilio_phone_sid: purchasedNumber.sid,
          phone_configured: true
        })
        .eq('id', organizationId)

      if (updateError) {
        // Try to release the number if database update fails
        await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove()
        throw updateError
      }

      // Create phone configuration record
      await adminSupabase
        .from('phone_configurations')
        .insert({
          organization_id: organizationId,
          phone_number: purchasedNumber.phoneNumber,
          phone_sid: purchasedNumber.sid,
          is_external_account: false,
          monthly_charge: 10,
          capabilities: ['voice', 'sms'],
          status: 'active',
          created_by: user.id
        })

      // Create default phone settings
      await adminSupabase
        .from('phone_settings')
        .insert({
          organization_id: organizationId,
          primary_number: purchasedNumber.phoneNumber,
          display_name: 'Your Gym',
          voicemail_enabled: true,
          voicemail_greeting: "Thanks for calling! We're currently unavailable. Please leave a message and we'll get back to you soon.",
          text_enabled: true,
          auto_reply_enabled: true,
          auto_reply_message: "Thanks for your message! We'll respond shortly.",
          missed_call_text: true,
          missed_call_message: "Sorry we missed your call! How can we help you?",
          call_tracking: true
        })

      return NextResponse.json({
        success: true,
        phoneNumber: purchasedNumber.phoneNumber,
        sid: purchasedNumber.sid,
        message: 'Phone number provisioned successfully'
      })
    } catch (twilioError: any) {
      console.error('Twilio purchase error:', twilioError)
      
      // Check if it's a specific Twilio error
      if (twilioError.code === 21422) {
        return NextResponse.json(
          { error: 'This phone number is no longer available. Please search for another.' },
          { status: 400 }
        )
      }
      
      throw twilioError
    }
  } catch (error: any) {
    console.error('Error provisioning phone number:', error)
    return NextResponse.json(
      { error: 'Failed to provision phone number', details: error.message },
      { status: 500 }
    )
  }
}