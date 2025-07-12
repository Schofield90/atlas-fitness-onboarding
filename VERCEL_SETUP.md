# Vercel Deployment Setup

## Step 1: Set Environment Variables in Vercel Dashboard

Go to https://vercel.com/schofield90s-projects/atlas-fitness-onboarding/settings/environment-variables

Add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_anon_key
SUPABASE_SERVICE_ROLE_KEY=dummy_service_role_key
RESEND_API_KEY=re_dummy_api_key
TELEGRAM_BOT_TOKEN=dummy_telegram_bot_token
TELEGRAM_CHAT_ID=7840453544
GOOGLE_CLIENT_EMAIL=dummy@dummy.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nDUMMY_KEY\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID=dummy_folder_id
NEXT_PUBLIC_APP_URL=https://atlas-fitness-onboarding-hn8huzqtv-schofield90s-projects.vercel.app
```

## Step 2: Push to GitHub

If you haven't already:

1. Create a GitHub repository
2. Push the code:
   ```bash
   git remote add origin https://github.com/yourusername/atlas-fitness-onboarding.git
   git push -u origin main
   ```

## Step 3: Deploy via Vercel Dashboard

1. Go to vercel.com
2. Click "New Project"
3. Import from GitHub
4. Select the atlas-fitness-onboarding repository
5. Deploy

## Current Status

The app is available at:
https://atlas-fitness-onboarding-hn8huzqtv-schofield90s-projects.vercel.app

But it needs proper environment variables to function correctly.