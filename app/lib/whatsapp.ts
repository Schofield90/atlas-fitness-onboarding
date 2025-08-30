import twilio from 'twilio';
import { createAdminClient } from './supabase/admin';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface SendWhatsAppOptions {
  to: string;
  body: string;
  organizationId?: string;
  templateName?: string;
}

export async function sendWhatsApp(options: SendWhatsAppOptions) {
  try {
    const { to, body, organizationId } = options;
    
    if (!twilioClient) {
      throw new Error('Twilio not configured');
    }

    // Normalize phone number
    let phoneNumber = to;
    if (!phoneNumber.startsWith('+')) {
      // Assume UK number if no country code
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+44' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('7')) {
        phoneNumber = '+44' + phoneNumber;
      } else {
        phoneNumber = '+' + phoneNumber;
      }
    }

    // Add WhatsApp prefix if not present
    if (!phoneNumber.startsWith('whatsapp:')) {
      phoneNumber = `whatsapp:${phoneNumber}`;
    }

    // Send WhatsApp via Twilio
    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
      to: phoneNumber
    });

    // Log WhatsApp to database
    if (organizationId) {
      const supabase = await createAdminClient();
      await supabase.from('whatsapp_logs').insert({
        phone_number: phoneNumber.replace('whatsapp:', ''),
        message: body,
        direction: 'outbound',
        status: message.status,
        organization_id: organizationId,
        twilio_sid: message.sid
      });
    }

    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
}

// Alias for compatibility
export const sendWhatsAppMessage = sendWhatsApp;