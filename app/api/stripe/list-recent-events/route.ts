import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Stripe secret key not configured'
      })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia'
    })

    // List recent events
    const events = await stripe.events.list({
      limit: 10
    })

    return NextResponse.json({
      success: true,
      eventsCount: events.data.length,
      events: events.data.map(event => ({
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode,
        pending_webhooks: event.pending_webhooks
      }))
    })
  } catch (error: any) {
    console.error('List events error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to list events'
    })
  }
}