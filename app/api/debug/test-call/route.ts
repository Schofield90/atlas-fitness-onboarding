import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    
    const body = await request.json()
    const { phoneNumber } = body
    
    if (!phoneNumber) {
      return NextResponse.json({
        error: 'Phone number is required',
        format: 'Include country code, e.g., +447777777777'
      }, { status: 400 })
    }
    
    // Check Twilio configuration
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_SMS_FROM,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'
    }
    
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      return NextResponse.json({
        error: 'Twilio not configured',
        missing: {
          accountSid: !config.accountSid,
          authToken: !config.authToken,
          fromNumber: !config.fromNumber
        }
      }, { status: 503 })
    }
    
    // Initialize Twilio client
    const twilioClient = twilio(config.accountSid, config.authToken)
    
    try {
      // First, let's validate the phone numbers
      const lookupFrom = await twilioClient.lookups.v2
        .phoneNumbers(config.fromNumber)
        .fetch()
        .catch(err => ({ error: err.message, code: err.code }))
        
      const lookupTo = await twilioClient.lookups.v2
        .phoneNumbers(phoneNumber)
        .fetch()
        .catch(err => ({ error: err.message, code: err.code }))
      
      const validation = {
        from: lookupFrom.error ? { valid: false, error: lookupFrom.error } : { valid: true, number: lookupFrom.phoneNumber },
        to: lookupTo.error ? { valid: false, error: lookupTo.error } : { valid: true, number: lookupTo.phoneNumber }
      }
      
      if (!validation.from.valid || !validation.to.valid) {
        return NextResponse.json({
          error: 'Phone number validation failed',
          validation,
          help: 'Ensure phone numbers include country code (e.g., +44 for UK)'
        }, { status: 400 })
      }
      
      // Try to make a test call
      const twimlUrl = `${config.appUrl}/api/calls/twiml?leadId=test`
      
      console.log('Attempting call with:', {
        to: phoneNumber,
        from: config.fromNumber,
        url: twimlUrl
      })
      
      const call = await twilioClient.calls.create({
        to: phoneNumber,
        from: config.fromNumber,
        url: twimlUrl,
        statusCallback: `${config.appUrl}/api/calls/status`,
        statusCallbackEvent: ['initiated', 'answered', 'completed'],
        record: false // Disable recording for test
      })
      
      return NextResponse.json({
        success: true,
        callSid: call.sid,
        status: call.status,
        details: {
          to: call.to,
          from: call.from,
          direction: call.direction,
          price: call.price,
          priceUnit: call.priceUnit
        }
      })
      
    } catch (twilioError: any) {
      console.error('Twilio error details:', twilioError)
      
      return NextResponse.json({
        error: 'Twilio call failed',
        twilioError: {
          message: twilioError.message,
          code: twilioError.code,
          moreInfo: twilioError.moreInfo,
          status: twilioError.status
        },
        debugInfo: {
          to: phoneNumber,
          from: config.fromNumber,
          twimlUrl: `${config.appUrl}/api/calls/twiml?leadId=test`
        },
        commonIssues: {
          21217: 'If using trial account, destination number must be verified',
          21215: 'Invalid phone number format - include country code',
          21614: 'To number is not a valid phone number',
          21608: 'The from phone number is not verified for your account',
          21219: 'From number is not a valid phone number'
        }
      }, { status: 400 })
    }
    
  } catch (error) {
    return createErrorResponse(error)
  }
}