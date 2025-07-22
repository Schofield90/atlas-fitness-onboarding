import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Only allow this in development or with a secret key
  const secretKey = request.headers.get('x-test-key')
  if (process.env.NODE_ENV === 'production' && secretKey !== 'atlas-test-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  const fbAppSecret = process.env.FACEBOOK_APP_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasAppId: !!fbAppId,
    appId: fbAppId || 'NOT_SET',
    hasAppSecret: !!fbAppSecret,
    appSecretLength: fbAppSecret?.length || 0,
    appSecretPrefix: fbAppSecret ? fbAppSecret.substring(0, 8) + '...' : 'NOT_SET',
    siteUrl: siteUrl || 'NOT_SET',
    timestamp: new Date().toISOString()
  })
}