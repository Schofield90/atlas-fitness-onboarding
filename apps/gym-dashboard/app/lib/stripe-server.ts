import Stripe from 'stripe'

// Centralized Stripe initialization with proper error handling
export function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  
  return new Stripe(stripeKey, {
    apiVersion: '2025-07-30.basil',
  })
}

// Use this in API routes:
// try {
//   const stripe = getStripe()
//   // use stripe...
// } catch (error) {
//   return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
// }