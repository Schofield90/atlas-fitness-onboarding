import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST() {
  try {
    // Check if secret key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Stripe secret key not configured'
      })
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia'
    })

    // Try to retrieve account details
    try {
      const account = await stripe.accounts.retrieve()
      
      return NextResponse.json({
        success: true,
        accountId: account.id,
        accountType: account.type,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        defaultCurrency: account.default_currency,
        country: account.country,
        created: new Date(account.created * 1000).toISOString()
      })
    } catch (accountError: any) {
      // If we can't get account details, try a simpler test
      // This happens when using restricted keys
      if (accountError.type === 'PermissionError') {
        // Try to list products as a connection test
        const products = await stripe.products.list({ limit: 1 })
        
        return NextResponse.json({
          success: true,
          message: 'Connected with restricted key',
          canListProducts: true,
          productsExist: products.data.length > 0
        })
      }
      
      throw accountError
    }
  } catch (error: any) {
    console.error('Stripe connection test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to connect to Stripe',
      type: error.type || 'unknown_error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}