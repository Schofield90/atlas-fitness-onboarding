import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Create the same date range the calendar uses
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 31)
    
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    })
    
    // Call the calendar events API
    const response = await fetch(
      `${request.nextUrl.origin}/api/calendar/events?${params}`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    )
    
    const data = await response.json()
    
    // Also test what happens when we don't pass date params
    const noParamsResponse = await fetch(
      `${request.nextUrl.origin}/api/calendar/events`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    )
    
    const noParamsData = await noParamsResponse.json()
    
    return NextResponse.json({
      withDateParams: {
        status: response.status,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        eventCount: data.events?.length || 0,
        events: data.events || [],
        error: data.error
      },
      withoutDateParams: {
        status: noParamsResponse.status,
        eventCount: noParamsData.events?.length || 0,
        events: noParamsData.events || [],
        error: noParamsData.error
      },
      todayEvents: data.events?.filter((e: any) => {
        const eventDate = new Date(e.startTime)
        return eventDate.toDateString() === today.toDateString()
      }) || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 })
  }
}