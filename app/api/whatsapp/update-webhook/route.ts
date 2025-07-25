import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '');

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json({
        error: 'Missing Twilio configuration'
      }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    // Get the correct webhook URL based on environment
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? 'https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio'
      : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/webhooks/twilio`;

    // Find the phone number
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const targetNumber = phoneNumbers.find(num => 
      num.phoneNumber.replace(/\s/g, '') === phoneNumber.replace(/\s/g, '')
    );

    if (!targetNumber) {
      return NextResponse.json({
        error: 'Phone number not found in Twilio account',
        searchedFor: phoneNumber
      }, { status: 404 });
    }

    // Update the webhook URLs
    const updatedNumber = await client.incomingPhoneNumbers(targetNumber.sid).update({
      smsUrl: webhookUrl,
      smsMethod: 'POST',
      // Also update status callback for delivery receipts
      statusCallback: webhookUrl,
      statusCallbackMethod: 'POST'
    });

    // If this is a WhatsApp-capable number, also update WhatsApp webhook
    if (targetNumber.capabilities?.whatsapp) {
      try {
        // Update WhatsApp webhook configuration
        await client.incomingPhoneNumbers(targetNumber.sid).update({
          voiceUrl: webhookUrl, // WhatsApp uses voice URL for messaging
          voiceMethod: 'POST'
        });
      } catch (whatsappError) {
        console.log('Could not update WhatsApp webhook:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook URLs updated successfully',
      phoneNumber: targetNumber.phoneNumber,
      updated: {
        smsUrl: updatedNumber.smsUrl,
        statusCallback: updatedNumber.statusCallback,
        method: 'POST'
      },
      previousWebhook: targetNumber.smsUrl,
      newWebhook: webhookUrl
    });

  } catch (error: any) {
    console.error('Error updating webhook:', error);
    return NextResponse.json({
      error: 'Failed to update webhook',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_WHATSAPP_FROM?.replace('whatsapp:', '');

    if (!accountSid || !authToken) {
      return NextResponse.json({
        error: 'Missing Twilio configuration'
      }, { status: 400 });
    }

    const client = twilio(accountSid, authToken);

    // Get current webhook configuration
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const targetNumber = phoneNumbers.find(num => 
      num.phoneNumber.replace(/\s/g, '') === phoneNumber?.replace(/\s/g, '')
    );

    if (!targetNumber) {
      return NextResponse.json({
        error: 'Phone number not found',
        numbers: phoneNumbers.map(n => n.phoneNumber)
      }, { status: 404 });
    }

    const expectedWebhook = process.env.NODE_ENV === 'production' 
      ? 'https://atlas-fitness-onboarding.vercel.app/api/webhooks/twilio'
      : `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/webhooks/twilio`;

    return NextResponse.json({
      phoneNumber: targetNumber.phoneNumber,
      currentWebhooks: {
        smsUrl: targetNumber.smsUrl,
        statusCallback: targetNumber.statusCallback,
        voiceUrl: targetNumber.voiceUrl
      },
      expectedWebhook,
      webhookCorrect: targetNumber.smsUrl === expectedWebhook,
      capabilities: targetNumber.capabilities,
      recommendation: targetNumber.smsUrl !== expectedWebhook 
        ? 'Webhook URL needs to be updated. Call POST /api/whatsapp/update-webhook to fix.'
        : 'Webhook URL is correctly configured.'
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check webhook',
      details: error.message
    }, { status: 500 });
  }
}