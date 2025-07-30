import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client, getAuthUrl } from '@/app/lib/google/calendar';

export async function GET(request: NextRequest) {
  try {
    const oauth2Client = getOAuth2Client();
    const authUrl = getAuthUrl();
    
    // Get the redirect URI being used
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/google/callback`;
    
    // Parse the auth URL to see what's being sent
    const url = new URL(authUrl);
    const params = Object.fromEntries(url.searchParams);
    
    return NextResponse.json({
      environment: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      oauth: {
        redirectUri: redirectUri,
        authUrl: authUrl,
        authUrlParams: params,
        actualRedirectUri: oauth2Client._opts.redirectUri || 'not set'
      },
      instructions: [
        "Check that redirectUri matches EXACTLY what's in Google Console",
        "Common issues:",
        "- Trailing slashes",
        "- HTTP vs HTTPS", 
        "- Different domains (localhost vs production)",
        "- Extra parameters like ?flowName=GeneralOAuthFlow"
      ]
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}