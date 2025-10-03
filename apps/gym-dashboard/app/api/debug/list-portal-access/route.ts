import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const adminSupabase = createAdminClient()
    
    // Get all portal access records with client info
    const { data: records, error } = await adminSupabase
      .from('client_portal_access')
      .select(`
        *,
        clients (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch records',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      totalRecords: records?.length || 0,
      records: records?.map(r => ({
        clientName: r.clients ? `${r.clients.first_name} ${r.clients.last_name}` : 'Unknown',
        clientEmail: r.clients?.email,
        accessCode: r.access_code,
        isClaimed: r.is_claimed,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        magicLinkToken: r.magic_link_token
      })) || []
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}