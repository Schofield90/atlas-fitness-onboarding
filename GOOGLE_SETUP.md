# Google Calendar Integration Setup

## Environment Variables Needed

Add these to your Vercel project settings:

```
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

## Steps to Get These Values:

1. **Go to Google Cloud Console**: https://console.cloud.google.com

2. **Create or Select a Project**

3. **Enable Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   
5. **Configure OAuth Consent Screen** (if not done):
   - Choose "External" user type
   - Fill in:
     - App name: "Atlas Fitness"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes: `calendar`, `calendar.events`, `userinfo.email`
   - Add your email as a test user

6. **Create Web Application Client**:
   - Application type: "Web application"
   - Name: "Atlas Fitness Calendar"
   - Authorized redirect URIs:
     - `https://atlas-fitness-onboarding.vercel.app/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (for local testing)

7. **Copy the Credentials**:
   - Client ID: Copy this value
   - Client Secret: Copy this value

## Add to Vercel:

1. Go to your Vercel project dashboard
2. Go to Settings → Environment Variables
3. Add:
   - `GOOGLE_CLIENT_ID` = (your client ID)
   - `GOOGLE_CLIENT_SECRET` = (your client secret)
4. Redeploy your application

## Testing:

1. Visit: https://atlas-fitness-onboarding.vercel.app/calendar-sync
2. Click "Connect Google Calendar"
3. You should be redirected to Google to authorize
4. After authorization, you'll be redirected back and can select your calendar

## Troubleshooting:

If you get "Access blocked" error:
- Make sure the redirect URI exactly matches what's in Google Cloud Console
- Ensure you've added your email as a test user
- Check that the OAuth consent screen is configured

If you get "invalid_request" error:
- Verify GOOGLE_CLIENT_ID is set in Vercel
- Check that there are no spaces or quotes in the environment variable values