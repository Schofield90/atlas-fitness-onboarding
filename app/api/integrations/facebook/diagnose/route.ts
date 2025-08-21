import { NextResponse } from 'next/server'

export async function GET() {
  // Check all Facebook-related environment variables
  const config = {
    environment: {
      NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'NOT_SET',
      FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET ? 'SET (hidden)' : 'NOT_SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT_SET',
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'NOT_SET',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    },
    computed: {
      redirect_uri_from_SITE_URL: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/facebook/callback`,
      redirect_uri_from_URL: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/facebook/callback`,
      redirect_uri_from_APP_URL: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/facebook/callback`,
    },
    required_scopes: [
      'email',
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'leads_retrieval',
      'ads_management',
      'ads_read',
      'business_management',
      'pages_manage_metadata',
      'pages_manage_ads'
    ],
    facebook_app_dashboard_checklist: {
      step1: 'Go to https://developers.facebook.com/apps/' + (process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'YOUR_APP_ID'),
      step2: 'Facebook Login > Settings',
      step3: 'Add Valid OAuth Redirect URIs:',
      redirect_uris_needed: [
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`,
        'http://localhost:3000/api/auth/facebook/callback'
      ],
      step4: 'Settings > Basic',
      app_domains_needed: [
        'atlas-fitness-onboarding.vercel.app',
        'localhost'
      ],
      step5: 'Check App Mode (Development/Live)',
      step6: 'For production, submit for App Review for these permissions:',
      permissions_needing_review: [
        'pages_show_list',
        'pages_read_engagement', 
        'leads_retrieval',
        'ads_management',
        'ads_read',
        'business_management'
      ]
    },
    oauth_url_preview: {
      url: `https://www.facebook.com/v18.0/dialog/oauth`,
      params: {
        client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848',
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`,
        scope: 'email,public_profile,pages_show_list,pages_read_engagement,leads_retrieval,ads_management,ads_read',
        response_type: 'code',
        state: 'atlas_fitness_oauth'
      }
    },
    status: {
      app_id_configured: !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
      app_secret_configured: !!process.env.FACEBOOK_APP_SECRET,
      site_url_configured: !!process.env.NEXT_PUBLIC_SITE_URL,
      ready_for_oauth: !!(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET && process.env.NEXT_PUBLIC_SITE_URL)
    }
  }

  return NextResponse.json(config, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}