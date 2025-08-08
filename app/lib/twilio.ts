// Twilio client wrapper for the send-magic-link route
import twilio from 'twilio';

export function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured. SMS features will be disabled.');
    // Return a mock client that won't send messages
    return {
      messages: {
        create: async () => {
          throw new Error('Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
        }
      }
    };
  }

  return twilio(accountSid, authToken);
}

// Re-export the existing Twilio service functions
export { sendWhatsAppMessage, sendSMS, verifyWhatsAppNumber, messageTemplates } from './services/twilio';