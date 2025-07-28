import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/app/lib/google/calendar'

export async function GET() {
  try {
    const authUrl = getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=auth_url_failed`
    )
  }
}