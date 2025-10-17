import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function GET(request: NextRequest) {
  try {
    // Check all environment variables
    const config = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_SMS_FROM: process.env.TWILIO_SMS_FROM,
      USER_PHONE_NUMBER: process.env.USER_PHONE_NUMBER,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL?.trim()
    }
    
    // Check which are missing
    const missing = Object.entries(config)
      .filter(([key, value]) => !value)
      .map(([key]) => key)
    
    if (missing.length > 0) {
      return NextResponse.json({
        error: 'Missing environment variables',
        missing,
        config: {
          TWILIO_ACCOUNT_SID: config.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET',
          TWILIO_AUTH_TOKEN: config.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
          TWILIO_SMS_FROM: config.TWILIO_SMS_FROM || 'NOT SET',
          USER_PHONE_NUMBER: config.USER_PHONE_NUMBER || 'NOT SET',
          NEXT_PUBLIC_APP_URL: config.NEXT_PUBLIC_APP_URL || 'NOT SET'
        }
      })
    }
    
    // Test TwiML generation
    const twimlUrl = `${config.NEXT_PUBLIC_APP_URL}/api/calls/twiml?leadId=test&userPhone=${encodeURIComponent(config.USER_PHONE_NUMBER!)}`
    
    let twimlTest
    try {
      const response = await fetch(twimlUrl)
      const text = await response.text()
      
      // Parse XML to check if it's valid
      const hasDial = text.includes('<Dial')
      const hasNumber = text.includes('<Number')
      const hasError = text.includes('error') || text.includes('Error')
      
      twimlTest = {
        url: twimlUrl,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
        parsed: {
          hasDial,
          hasNumber,
          hasError,
          isValidXML: text.startsWith('<?xml')
        }
      }
    } catch (error: any) {
      twimlTest = {
        error: error.message,
        url: twimlUrl
      }
    }
    
    // Test Twilio connection
    let twilioTest
    try {
      const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
      const account = await client.api.accounts(config.TWILIO_ACCOUNT_SID).fetch()
      twilioTest = {
        connected: true,
        accountStatus: account.status,
        accountName: account.friendlyName
      }
    } catch (error: any) {
      twilioTest = {
        connected: false,
        error: error.message
      }
    }
    
    return NextResponse.json({
      environment: {
        allSet: true,
        userPhone: config.USER_PHONE_NUMBER,
        twilioFrom: config.TWILIO_SMS_FROM,
        appUrl: config.NEXT_PUBLIC_APP_URL
      },
      twimlTest,
      twilioTest,
      recommendations: [
        !config.USER_PHONE_NUMBER ? 'Set USER_PHONE_NUMBER in Vercel environment variables' : null,
        twimlTest?.parsed?.hasError ? 'TwiML generation has errors - check logs' : null,
        !twimlTest?.parsed?.hasDial ? 'TwiML is not generating Dial verb correctly' : null
      ].filter(Boolean)
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug endpoint error',
      message: error.message
    }, { status: 500 })
  }
}