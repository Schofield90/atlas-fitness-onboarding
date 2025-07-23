import twilio from 'twilio'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM
const twilioSmsFrom = process.env.TWILIO_SMS_FROM

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not configured. SMS and WhatsApp features will be disabled.')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export interface SendMessageOptions {
  to: string
  body: string
  mediaUrl?: string[]
}

export async function sendWhatsAppMessage(options: SendMessageOptions) {
  if (!client) {
    throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
  }

  if (!twilioWhatsAppFrom) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured.')
  }

  try {
    // Ensure both from and to have whatsapp: prefix
    const fromNumber = twilioWhatsAppFrom.startsWith('whatsapp:') 
      ? twilioWhatsAppFrom 
      : `whatsapp:${twilioWhatsAppFrom}`
    const toNumber = options.to.startsWith('whatsapp:') 
      ? options.to 
      : `whatsapp:${options.to}`
    
    console.log('Sending WhatsApp message:', {
      from: fromNumber,
      to: toNumber,
      bodyLength: options.body.length
    })
    
    const message = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: options.body,
      ...(options.mediaUrl && { mediaUrl: options.mediaUrl })
    })

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      to: message.to,
      from: message.from
    }
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error)
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message'
    }
  }
}

export async function sendSMS(options: SendMessageOptions) {
  if (!client) {
    throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
  }

  if (!twilioSmsFrom) {
    throw new Error('TWILIO_SMS_FROM not configured.')
  }

  try {
    const message = await client.messages.create({
      from: twilioSmsFrom,
      to: options.to,
      body: options.body,
      ...(options.mediaUrl && { mediaUrl: options.mediaUrl })
    })

    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      to: message.to,
      from: message.from
    }
  } catch (error: any) {
    console.error('Failed to send SMS:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    }
  }
}

// Verify a phone number can receive WhatsApp messages
export function verifyWhatsAppNumber(phoneNumber: string) {
  // Format the phone number for WhatsApp
  const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
  
  // In production, you might want to implement actual verification
  // For now, we'll just validate the format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  
  return {
    isValid: phoneRegex.test(formattedNumber),
    formattedNumber: formattedNumber
  }
}

// Template message builder for common gym scenarios
export const messageTemplates = {
  welcomeMessage: (name: string, gymName: string) => 
    `🎉 Welcome to ${gymName}, ${name}! We're excited to have you join our fitness community. 

Here's what happens next:
📅 Your trial/membership is now active
🏋️ You can book classes through our app
💪 Our trainers are here to help you reach your goals

Need help? Just reply to this message!`,

  classReminder: (name: string, className: string, time: string) =>
    `Hi ${name}! 🏃‍♀️ 

Just a reminder about your ${className} class today at ${time}.

📍 Don't forget to bring:
• Water bottle
• Towel
• Your energy!

See you there! 💪`,

  paymentReminder: (name: string, amount: string, dueDate: string) =>
    `Hi ${name}, 

This is a friendly reminder that your membership payment of ${amount} is due on ${dueDate}.

To keep your membership active, please ensure payment is made by the due date.

Questions? Reply to this message or call us.`,

  membershipExpiring: (name: string, expiryDate: string) =>
    `Hi ${name}, 

Your membership is expiring on ${expiryDate}. 

Don't let your fitness journey stop! Renew now to:
✅ Keep your current rate
✅ Maintain your class bookings
✅ Continue your progress

Reply 'RENEW' to get started or visit our desk.`
}

export default {
  sendWhatsAppMessage,
  sendSMS,
  verifyWhatsAppNumber,
  messageTemplates
}