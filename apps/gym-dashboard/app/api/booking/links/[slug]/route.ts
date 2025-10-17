import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/booking/links/[slug] - Get public booking link details
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const adminSupabase = createAdminClient()
    
    // Fetch booking link with organization and user details
    const { data: bookingLink, error } = await adminSupabase
      .from('booking_links')
      .select(`
        *,
        organization:organizations(name, slug),
        user:users!booking_links_user_id_fkey(full_name)
      `)
      .eq('slug', params.slug)
      .eq('is_public', true)
      .single()

    if (error || !bookingLink) {
      return NextResponse.json(
        { error: 'Booking link not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking_link: bookingLink
    })
  } catch (error) {
    console.error('Error fetching booking link:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking link' },
      { status: 500 }
    )
  }
}