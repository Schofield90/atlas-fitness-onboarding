# Google OAuth Setup Instructions

## Overview
This guide explains how to set up Google OAuth for login/signup in the Atlas Fitness Onboarding application.

## Prerequisites
- Access to Supabase Dashboard
- Access to Google Cloud Console
- Admin access to the project

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable Google+ API:
   - Go to APIs & Services > Library
   - Search for "Google+ API" 
   - Click Enable

4. Create OAuth 2.0 Credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Set the following:
     - Name: "Atlas Fitness Onboarding"
     - Authorized JavaScript origins:
       - `https://atlas-fitness-onboarding.vercel.app`
       - `http://localhost:3000` (for local development)
     - Authorized redirect URIs:
       - `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
       - `https://atlas-fitness-onboarding.vercel.app/auth/callback`
   - Click Create
   - Save your Client ID and Client Secret

## Step 2: Supabase Configuration

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Providers
3. Find Google in the list and enable it
4. Enter your Google OAuth credentials:
   - Client ID: (from step 1)
   - Client Secret: (from step 1)
5. Click Save

## Step 3: Update Application URLs

The application is already configured with Google OAuth buttons on:
- `/login` - Sign in with Google
- `/signup` - Sign up with Google (requires organization name first)

## Step 4: Test the Integration

1. Go to `https://atlas-fitness-onboarding.vercel.app/login`
2. Click "Sign in with Google"
3. Complete the Google authentication flow
4. You should be redirected to the dashboard

For signup:
1. Go to `https://atlas-fitness-onboarding.vercel.app/signup`
2. Enter your gym/organization name first
3. Click "Sign up with Google"
4. Complete the Google authentication flow
5. Your organization will be created automatically

## Important Notes

- The redirect URI in Google Console must match exactly with Supabase's callback URL
- For production, ensure you're using HTTPS URLs
- The organization name is stored in session storage during signup and processed after OAuth callback
- Users signing up with Google will have their organization created automatically

## Troubleshooting

### "Redirect URI mismatch" error
- Check that the redirect URI in Google Console matches Supabase exactly
- The format should be: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`

### User not redirected after login
- Ensure the `/auth/callback` route is properly configured
- Check browser console for JavaScript errors

### Organization not created for Google signup
- Verify that organization name is entered before clicking Google signup
- Check Supabase logs for any database errors

## Security Considerations

- Never expose your Client Secret in client-side code
- Use environment variables for sensitive configuration
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console