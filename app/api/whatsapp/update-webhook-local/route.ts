import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const { ngrokUrl } = await request.json();
    
    if (!ngrokUrl) {
      return NextResponse.json({
        error: 'Please provide ngrokUrl in request body',
        example: { ngrokUrl: 'https://abc123.ngrok.io' }
      }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '');

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        error: 'Missing Twilio configuration'
      }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    // Construct webhook URL with ngrok
    const webhookUrl = `${ngrokUrl}/api/webhooks/twilio`;

    // Find and update the phone number
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const targetNumber = phoneNumbers.find(num => 
      num.phoneNumber.replace(/\s/g, '') === phoneNumber.replace(/\s/g, '')
    );

    if (!targetNumber) {
      return NextResponse.json({
        error: 'Phone number not found'
      }, { status: 404 });
    }

    const updatedNumber = await client.incomingPhoneNumbers(targetNumber.sid).update({
      smsUrl: webhookUrl,
      smsMethod: 'POST',
      statusCallback: webhookUrl,
      statusCallbackMethod: 'POST'
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook updated for local development',
      phoneNumber: targetNumber.phoneNumber,
      webhookUrl,
      note: 'Remember to change this back to production URL when done testing!'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to update webhook',
      details: error.message
    }, { status: 500 });
  }
}