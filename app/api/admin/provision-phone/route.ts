import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { provisionPhoneForOrganization } from '@/app/lib/twilio/phone-provisioning'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const body = await request.json()
    
    // Check if user is admin (you'd implement proper admin check)
    // For now, only allow your test organization
    if (userWithOrg.organizationId !== '63589490-8f55-4157-bd3a-e141594b740e') {
      return NextResponse.json({
        error: 'Unauthorized. Phone provisioning is currently in beta.'
      }, { status: 403 })
    }
    
    const { organizationId, areaCode } = body
    
    if (!organizationId) {
      return NextResponse.json({
        error: 'organizationId is required'
      }, { status: 400 })
    }
    
    try {
      const result = await provisionPhoneForOrganization({
        organizationId,
        areaCode,
        countryCode: 'GB'
      })
      
      return NextResponse.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      console.error('Provisioning error:', error)
      
      // Check for specific Twilio errors
      if (error.code === 20003) {
        return NextResponse.json({
          error: 'Authentication failed. Check Twilio credentials.'
        }, { status: 500 })
      }
      
      if (error.code === 21421) {
        return NextResponse.json({
          error: 'No phone numbers available in the specified area.'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        error: error.message || 'Failed to provision phone number'
      }, { status: 500 })
    }
    
  } catch (error) {
    return createErrorResponse(error)
  }
}