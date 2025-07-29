import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const adminSupabase = createAdminClient()
    
    // Get organization details
    const { data: organization, error: orgError } = await adminSupabase
      .from('organizations')
      .select('*')
      .eq('id', userWithOrg.organizationId)
      .single()
    
    if (orgError) {
      return NextResponse.json({
        error: 'Failed to fetch organization',
        details: orgError
      }, { status: 500 })
    }
    
    // Check Twilio configuration
    const twilioConfig = {
      hasMainAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasMainAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasDefaultPhone: !!process.env.TWILIO_SMS_FROM,
      defaultPhone: process.env.TWILIO_SMS_FROM
    }
    
    // Check if messages table has organization_id column using a simpler query
    const { data: testMessage, error: testError } = await adminSupabase
      .from('messages')
      .select('organization_id')
      .limit(1)
    
    // If the query succeeds or fails with a specific error, we can determine if the column exists
    const hasOrgIdColumn = !testError || !testError.message.includes('column "organization_id" does not exist')
    
    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        twilioPhoneNumber: organization.twilio_phone_number,
        twilioPhoneSid: organization.twilio_phone_sid,
        hasSubAccount: !!organization.twilio_subaccount_sid,
        readyForCalls: !!organization.twilio_phone_number || userWithOrg.organizationId === '63589490-8f55-4157-bd3a-e141594b740e'
      },
      twilioConfig,
      databaseStatus: {
        hasOrganizationIdColumn: hasOrgIdColumn,
        migrationApplied: !!organization.twilio_phone_number || hasOrgIdColumn
      },
      recommendations: getRecommendations(organization, hasOrgIdColumn)
    })
  } catch (error) {
    return createErrorResponse(error)
  }
}

function getRecommendations(org: any, hasOrgIdColumn: boolean): string[] {
  const recommendations = []
  
  if (!org.twilio_phone_number && org.id === '63589490-8f55-4157-bd3a-e141594b740e') {
    recommendations.push('Run the multi-tenant migration to set your phone number: +447450308627')
  }
  
  if (!hasOrgIdColumn) {
    recommendations.push('The migration has not been applied. Run the SQL migration first.')
  }
  
  if (!org.twilio_phone_number && org.id !== '63589490-8f55-4157-bd3a-e141594b740e') {
    recommendations.push('This organization needs a phone number. Contact support for provisioning.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Organization is properly configured for calls.')
  }
  
  return recommendations
}