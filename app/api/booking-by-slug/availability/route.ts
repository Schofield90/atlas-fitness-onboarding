import { NextRequest, NextResponse } from 'next/server'
import { bookingLinkService } from '@/app/lib/services/booking-link'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')
    const timezone = searchParams.get('timezone') || 'Europe/London'
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Default to next 30 days if no dates provided
    const startDate = startDateParam ? new Date(startDateParam) : startOfDay(new Date())
    const endDate = endDateParam ? new Date(endDateParam) : endOfDay(addDays(new Date(), 30))

    // Track page view for analytics
    await bookingLinkService.trackEvent(slug, 'page_view', {
      user_agent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
      ip: request.ip || request.headers.get('x-forwarded-for')
    })

    const availableSlots = await bookingLinkService.getAvailableSlots(
      slug,
      startDate,
      endDate,
      timezone
    )

    // Group slots by date
    const slotsByDate: Record<string, typeof availableSlots> = {}
    availableSlots.forEach(slot => {
      const date = slot.start_time.split('T')[0]
      if (!slotsByDate[date]) {
        slotsByDate[date] = []
      }
      slotsByDate[date].push(slot)
    })

    return NextResponse.json({
      availability: Object.entries(slotsByDate).map(([date, slots]) => ({
        date,
        slots
      })),
      timezone,
      total_slots: availableSlots.length
    })

  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}