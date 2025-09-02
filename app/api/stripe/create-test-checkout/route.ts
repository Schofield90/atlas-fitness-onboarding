import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Stripe secret key not configured'
      }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia'
    })

    const { priceAmount = 1000, productName = 'Test Product' } = await request.json()

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: productName,
              description: 'This is a test payment for debugging Stripe integration',
            },
            unit_amount: priceAmount, // Amount in pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/stripe-debug?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/stripe-debug?canceled=true`,
      metadata: {
        test: 'true',
        debug: 'true',
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Create test checkout error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create checkout session',
      type: error.type || 'unknown_error'
    }, { status: 400 })
  }
}