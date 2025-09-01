# Google OAuth Setup Guide

## Error: "Unsupported provider: provider is not enabled"

This error occurs when the Google OAuth provider is not enabled in your Supabase project. Follow these steps to fix it:

## Step 1: Enable Google Provider in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lzlrojoaxrqvmhempnkn`
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list
5. Toggle it **ON** to enable

## Step 2: Configure Google OAuth Credentials

### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized redirect URIs:
     ```
     https://lzlrojoaxrqvmhempnkn.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     https://atlas-fitness-onboarding.vercel.app/auth/callback
     ```
   - Copy the **Client ID** and **Client Secret**

### In Supabase Dashboard:

1. Go back to **Authentication** → **Providers** → **Google**
2. Paste your credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
3. Click **Save**

## Step 3: Update Environment Variables

Make sure your `.env.local` file has these variables:

```env
# These are already in your code, just verify they exist
NEXT_PUBLIC_SUPABASE_URL=https://lzlrojoaxrqvmhempnkn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: If you want to use server-side OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 4: Verify Callback URL

Your callback URL is already configured correctly in the code:
- `/auth/callback` - This route handles the OAuth callback

## Step 5: Test the Integration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try logging in with Google again

## Troubleshooting

### If you still get the error:

1. **Check Provider Status**: Make sure Google provider shows as "Enabled" in Supabase
2. **Verify Redirect URLs**: Ensure the redirect URL matches exactly in both Google Console and your code
3. **Clear Browser Cache**: Sometimes old auth sessions cause issues
4. **Check Supabase Logs**: Go to Supabase Dashboard → **Logs** → **Auth** to see detailed error messages

### Common Issues:

- **Error 400**: Provider not enabled (this guide fixes this)
- **Error 401**: Invalid credentials (check Client ID/Secret)
- **Redirect URI mismatch**: URLs must match exactly (including trailing slashes)

## Production Deployment

For production on Vercel, add these redirect URIs to Google Console:
```
https://atlas-fitness-onboarding.vercel.app/auth/callback
https://your-custom-domain.com/auth/callback
```

## Security Notes

- Never commit Google Client Secret to git
- Use environment variables for all sensitive credentials
- Restrict OAuth to your domain in Google Console for production
- Enable only necessary Google API scopes

---

Last Updated: September 1, 2025