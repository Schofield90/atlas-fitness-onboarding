import twilio from 'twilio'
import { createAdminClient } from '@/app/lib/supabase/admin'

interface ProvisionPhoneOptions {
  organizationId: string
  areaCode?: string
  countryCode?: string
}

export async function provisionPhoneForOrganization({
  organizationId,
  areaCode,
  countryCode = 'GB'
}: ProvisionPhoneOptions) {
  const adminSupabase = createAdminClient()
  
  // Check if organization already has a phone number
  const { data: org, error: orgError } = await adminSupabase
    .from('organizations')
    .select('twilio_phone_number, twilio_phone_sid')
    .eq('id', organizationId)
    .single()
  
  if (orgError) {
    throw new Error(`Failed to fetch organization: ${orgError.message}`)
  }
  
  if (org?.twilio_phone_number) {
    return {
      success: false,
      message: 'Organization already has a phone number',
      phoneNumber: org.twilio_phone_number
    }
  }
  
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
  
  try {
    // Step 1: Create a sub-account for the organization (optional but recommended)
    const subAccount = await twilioClient.api.accounts.create({
      friendlyName: `Organization ${organizationId}`
    })
    
    console.log('Created Twilio sub-account:', subAccount.sid)
    
    // Use the sub-account client for further operations
    const subAccountClient = twilio(
      subAccount.sid,
      subAccount.authToken
    )
    
    // Step 2: Search for available phone numbers
    const listOptions: any = {
      smsEnabled: true,
      voiceEnabled: true,
      limit: 5
    }
    
    // Only add areaCode if provided
    if (areaCode) {
      listOptions.areaCode = areaCode
    }
    
    const availableNumbers = await twilioClient.availablePhoneNumbers(countryCode)
      .local
      .list(listOptions)
    
    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers found in the specified area')
    }
    
    // Step 3: Purchase the first available number
    const phoneNumber = availableNumbers[0]
    
    // Get the base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'
    
    const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber.phoneNumber,
      smsUrl: `${baseUrl}/api/webhooks/twilio`,
      smsMethod: 'POST',
      voiceUrl: `${baseUrl}/api/webhooks/twilio-voice`,
      voiceMethod: 'POST',
      statusCallback: `${baseUrl}/api/webhooks/twilio-voice/status`,
      statusCallbackMethod: 'POST'
    })
    
    console.log('Purchased phone number:', purchasedNumber.phoneNumber)
    
    // Step 4: Update organization record
    const { error: updateError } = await adminSupabase
      .from('organizations')
      .update({
        twilio_phone_number: purchasedNumber.phoneNumber,
        twilio_phone_sid: purchasedNumber.sid,
        twilio_subaccount_sid: subAccount.sid,
        twilio_subaccount_auth_token: subAccount.authToken
      })
      .eq('id', organizationId)
    
    if (updateError) {
      // If database update fails, release the number
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).remove()
      throw new Error(`Failed to update organization: ${updateError.message}`)
    }
    
    // Step 5: Log the provisioning
    await adminSupabase.from('phone_number_provisions').insert({
      organization_id: organizationId,
      phone_number: purchasedNumber.phoneNumber,
      phone_sid: purchasedNumber.sid,
      status: 'active',
      area_code: areaCode,
      country_code: countryCode
    })
    
    return {
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      phoneSid: purchasedNumber.sid,
      subAccountSid: subAccount.sid
    }
    
  } catch (error: any) {
    console.error('Phone provisioning error:', error)
    
    // Log failed attempt
    await adminSupabase.from('phone_number_provisions').insert({
      organization_id: organizationId,
      phone_number: 'provisioning_failed',
      status: 'failed',
      area_code: areaCode,
      country_code: countryCode
    })
    
    throw error
  }
}

export async function releasePhoneForOrganization(organizationId: string) {
  const adminSupabase = createAdminClient()
  
  // Get organization's phone details
  const { data: org, error: orgError } = await adminSupabase
    .from('organizations')
    .select('twilio_phone_sid, twilio_subaccount_sid, twilio_subaccount_auth_token')
    .eq('id', organizationId)
    .single()
  
  if (orgError || !org?.twilio_phone_sid) {
    throw new Error('Organization phone number not found')
  }
  
  try {
    // Use sub-account if available, otherwise use main account
    const twilioClient = org.twilio_subaccount_sid
      ? twilio(org.twilio_subaccount_sid, org.twilio_subaccount_auth_token)
      : twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
    
    // Release the phone number
    await twilioClient.incomingPhoneNumbers(org.twilio_phone_sid).remove()
    
    // Update organization record
    await adminSupabase
      .from('organizations')
      .update({
        twilio_phone_number: null,
        twilio_phone_sid: null,
        twilio_subaccount_sid: null,
        twilio_subaccount_auth_token: null
      })
      .eq('id', organizationId)
    
    // Update provision log
    await adminSupabase
      .from('phone_number_provisions')
      .update({ status: 'released' })
      .eq('organization_id', organizationId)
      .eq('status', 'active')
    
    return { success: true }
  } catch (error: any) {
    console.error('Phone release error:', error)
    throw error
  }
}