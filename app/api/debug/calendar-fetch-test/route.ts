import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Test what the calendar page is fetching
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1) // 1 month ago
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 31) // 3 months ahead
    
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    })
    
    // Fetch from local events API
    const localResponse = await fetch(
      `${request.nextUrl.origin}/api/calendar/events?${params}`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    )
    
    const localData = await localResponse.json()
    
    // Fetch from Google events API
    const googleResponse = await fetch(
      `${request.nextUrl.origin}/api/calendar/google-events?${params}`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    )
    
    const googleData = await googleResponse.json()
    
    return NextResponse.json({
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        startFormatted: startDate.toLocaleDateString(),
        endFormatted: endDate.toLocaleDateString()
      },
      localEvents: {
        status: localResponse.status,
        count: localData.events?.length || 0,
        events: localData.events?.slice(0, 5) || [],
        error: localData.error
      },
      googleEvents: {
        status: googleResponse.status,
        count: googleData.events?.length || 0,
        events: googleData.events?.slice(0, 5) || [],
        error: googleData.error
      },
      todayEvents: {
        local: localData.events?.filter((e: any) => {
          const eventDate = new Date(e.startTime)
          return eventDate.toDateString() === today.toDateString()
        }) || [],
        google: googleData.events?.filter((e: any) => {
          const eventDate = new Date(e.startTime)
          return eventDate.toDateString() === today.toDateString()
        }) || []
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}