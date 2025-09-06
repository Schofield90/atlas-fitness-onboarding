import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient()
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/facebook-leads`

    // Last received event
    const { data: lastEvent } = await admin
      .from('facebook_webhooks')
      .select('created_at, processing_status')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Recent status samples
    const { data: recent } = await admin
      .from('facebook_webhooks')
      .select('processing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      service: 'facebook-leads-webhook',
      callbackUrl,
      lastEventAt: lastEvent?.created_at || null,
      lastStatus: lastEvent?.processing_status || null,
      recent: recent || []
    })
  } catch (error) {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
