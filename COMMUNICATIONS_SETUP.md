# Communications Setup Guide

## Overview
The calls, emails, SMS, and WhatsApp features require proper configuration of third-party services. Here's how to set up each one.

## 1. Twilio Setup (Required for Calls, SMS, and WhatsApp)

### Step 1: Create Twilio Account
1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free trial account (includes $15 credit)
3. Verify your phone number

### Step 2: Get Your Credentials
1. Go to Console Dashboard
2. Find your **Account SID** and **Auth Token**
3. Click "Get a phone number" to get a Twilio phone number

### Step 3: Configure Environment Variables
Add these to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+44xxxxxxxxxx  # Your Twilio phone number (UK format)
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio sandbox number

# App URL (needed for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For local development
# NEXT_PUBLIC_APP_URL=https://atlas-fitness-onboarding.vercel.app  # For production
```

### Step 4: WhatsApp Sandbox Setup (for testing)
1. In Twilio Console, go to Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join the sandbox (send "join [sandbox-word]" to +14155238886)
3. Configure webhook URL: `https://your-app-url/api/webhooks/twilio`

## 2. Email Setup (Resend)

### Step 1: Create Resend Account
1. Go to [https://resend.com](https://resend.com)
2. Sign up for free account
3. Verify your email domain

### Step 2: Get API Key
1. Go to API Keys section
2. Create new API key
3. Add to `.env.local`:

```env
# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Testing Each Feature

### Test Calls
1. Navigate to Leads page
2. Click on a lead
3. Click the phone icon to initiate a call
4. The call will connect your browser to the lead's phone

### Test SMS
1. Go to Communications page
2. Select a lead
3. Type a message and click "Send SMS"
4. Check Twilio logs for delivery status

### Test WhatsApp
1. Make sure recipient has joined your sandbox (test mode)
2. Go to Communications page
3. Select WhatsApp as message type
4. Send message
5. Check WhatsApp for delivery

### Test Email
1. Go to Communications page
2. Select Email as message type
3. Enter subject and message
4. Send email
5. Check recipient's inbox

## 4. Production Setup

### WhatsApp Business
1. Apply for WhatsApp Business API access
2. Get dedicated WhatsApp Business number
3. Update `TWILIO_WHATSAPP_FROM` with your business number

### Phone Numbers
1. Purchase UK phone numbers from Twilio
2. Configure voice capabilities
3. Set up call forwarding if needed

## 5. Troubleshooting

### "Failed to initiate call"
- Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set
- Verify your Twilio account has credit
- Check the phone number format includes country code

### "Invalid From and To pair"
- Ensure phone numbers include country code (+44 for UK)
- For WhatsApp, ensure recipient has joined sandbox
- Check TWILIO_WHATSAPP_FROM includes "whatsapp:" prefix

### Email not sending
- Verify RESEND_API_KEY is correct
- Check sender email is verified in Resend
- Look for errors in Vercel logs

## 6. Vercel Deployment

Add all environment variables to your Vercel project:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments
3. Redeploy your application

## Required Environment Variables Summary

```env
# Twilio (Calls, SMS, WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+44xxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App URL
NEXT_PUBLIC_APP_URL=https://atlas-fitness-onboarding.vercel.app

# Anthropic (for AI responses)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Calendar (optional)
GOOGLE_CLIENT_ID=xxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Next Steps

1. Sign up for Twilio and Resend accounts
2. Add credentials to `.env.local`
3. Restart your development server
4. Test each communication feature
5. Deploy to Vercel with environment variables