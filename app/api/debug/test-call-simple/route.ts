import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function GET(request: NextRequest) {
  try {
    // Simple test without auth to quickly diagnose
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_SMS_FROM,
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://atlas-fitness-onboarding.vercel.app'
    }
    
    // Test 1: Check if Twilio client can be created
    let twilioClient
    try {
      twilioClient = twilio(config.accountSid, config.authToken)
    } catch (err: any) {
      return NextResponse.json({
        error: 'Failed to create Twilio client',
        details: err.message
      })
    }
    
    // Test 2: Try to fetch account info
    let accountInfo
    try {
      const account = await twilioClient.api.accounts(config.accountSid).fetch()
      accountInfo = {
        status: account.status,
        friendlyName: account.friendlyName,
        type: account.type
      }
    } catch (err: any) {
      return NextResponse.json({
        error: 'Failed to fetch account info',
        details: err.message,
        code: err.code
      })
    }
    
    // Test 3: Check if from number is valid
    let fromNumberInfo
    try {
      const lookup = await twilioClient.lookups.v2
        .phoneNumbers(config.fromNumber)
        .fetch()
      fromNumberInfo = {
        valid: true,
        number: lookup.phoneNumber,
        nationalFormat: lookup.nationalFormat,
        countryCode: lookup.countryCode
      }
    } catch (err: any) {
      fromNumberInfo = {
        valid: false,
        error: err.message,
        code: err.code
      }
    }
    
    // Test 4: Try a simple TwiML generation
    const testTwimlUrl = `${config.appUrl}/api/calls/twiml?leadId=test`
    let twimlResponse
    try {
      const response = await fetch(testTwimlUrl)
      const text = await response.text()
      twimlResponse = {
        status: response.status,
        ok: response.ok,
        preview: text.substring(0, 200)
      }
    } catch (err: any) {
      twimlResponse = {
        error: 'Failed to fetch TwiML',
        details: err.message
      }
    }
    
    return NextResponse.json({
      tests: {
        twilioClient: 'OK',
        accountInfo,
        fromNumberInfo,
        twimlResponse
      },
      config: {
        accountSid: config.accountSid ? `${config.accountSid.substring(0, 6)}...` : 'NOT SET',
        authToken: config.authToken ? 'SET' : 'NOT SET',
        fromNumber: config.fromNumber || 'NOT SET',
        appUrl: config.appUrl
      },
      readyForCalls: accountInfo && fromNumberInfo?.valid && twimlResponse?.ok
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Unexpected error',
      message: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}