import { NextRequest, NextResponse } from 'next/server';
import { twilioService } from '@/lib/sms/twilio-service';

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio webhook
    const formData = await request.formData();
    const webhookData: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      webhookData[key] = value.toString();
    });

    console.log('Twilio status webhook received:', webhookData);

    // Handle the status update
    await twilioService.handleStatusWebhook(webhookData);

    // Respond with TwiML (Twilio expects XML response)
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({ 
    message: 'Twilio SMS status webhook endpoint',
    timestamp: new Date().toISOString()
  });
}