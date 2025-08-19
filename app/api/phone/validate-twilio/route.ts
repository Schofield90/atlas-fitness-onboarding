import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountSid, authToken } = await request.json()

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      )
    }

    // Validate format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      return NextResponse.json(
        { error: 'Invalid Account SID format' },
        { status: 400 }
      )
    }

    if (authToken.length !== 32) {
      return NextResponse.json(
        { error: 'Invalid Auth Token format' },
        { status: 400 }
      )
    }

    try {
      // Try to create a Twilio client and fetch account info
      const twilioClient = twilio(accountSid, authToken)
      
      // This will throw an error if credentials are invalid
      const account = await twilioClient.api.accounts(accountSid).fetch()

      return NextResponse.json({
        valid: true,
        accountInfo: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type,
          dateCreated: account.dateCreated
        }
      })
    } catch (twilioError: any) {
      console.error('Twilio validation error:', twilioError)
      
      if (twilioError.status === 401) {
        return NextResponse.json(
          { 
            valid: false, 
            error: 'Invalid credentials. Please check your Account SID and Auth Token.' 
          },
          { status: 400 }
        )
      }

      throw twilioError
    }
  } catch (error: any) {
    console.error('Error validating Twilio credentials:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Failed to validate credentials', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}