/**
 * Gym GoCardless Checkout API
 * Creates direct debit payments for gym clients
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getOrganizationAndUser } from '@/app/lib/auth-utils'
import { goCardlessService } from '@/app/lib/gocardless-server'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { organization, user, error } = await getOrganizationAndUser()
    if (error || !organization || !user) {
      return NextResponse.json(
        { error: error || 'Not authenticated' },
        { status: 401 }
      )
    }

    const { 
      productId, 
      clientEmail, 
      clientName,
      successUrl, 
      cancelUrl,
      mandateId // Optional - if client already has a mandate
    } = await request.json()
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get connected account
    const { data: connectedAccount } = await supabase
      .from('connected_accounts')
      .select('gc_organization_id, gc_creditor_id, gc_enabled')
      .eq('organization_id', organization.id)
      .single()
    
    if (!connectedAccount?.gc_organization_id) {
      return NextResponse.json(
        { error: 'GoCardless not connected. Please complete onboarding first.' },
        { status: 400 }
      )
    }
    
    if (!connectedAccount.gc_enabled) {
      return NextResponse.json(
        { error: 'GoCardless account not verified. Please complete verification.' },
        { status: 400 }
      )
    }
    
    // Get product details
    const { data: product } = await supabase
      .from('gym_products')
      .select('*')
      .eq('id', productId)
      .eq('organization_id', organization.id)
      .single()
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }
    
    if (product.processor !== 'gocardless') {
      return NextResponse.json(
        { error: 'Product not configured for GoCardless' },
        { status: 400 }
      )
    }
    
    // Calculate platform fee if configured
    const platformFeeBps = product.platform_fee_bps || 
      parseInt(process.env.PLATFORM_FEE_BPS || '250') // Default 2.5%
    const platformFeeAmount = Math.floor(product.amount_cents * platformFeeBps / 10000)
    
    // Check if client has existing mandate
    if (mandateId) {
      // Create payment directly
      const payment = await goCardlessService.createPayment({
        organizationId: organization.id,
        mandateId,
        amountPence: product.amount_cents,
        currency: product.currency.toUpperCase() as 'GBP' | 'EUR',
        description: product.name,
        metadata: {
          organization_id: organization.id,
          product_id: productId,
          platform_fee_cents: platformFeeAmount.toString()
        }
      })
      
      // Store payment record
      await supabase.from('gym_charges').insert({
        organization_id: organization.id,
        client_email: clientEmail,
        client_name: clientName,
        amount_cents: product.amount_cents,
        currency: product.currency,
        description: product.name,
        processor: 'gocardless',
        processor_payment_id: payment.id,
        platform_fee_cents: platformFeeAmount,
        status: 'processing',
        metadata: {
          product_id: productId,
          mandate_id: mandateId
        }
      })
      
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: 'processing',
        message: 'Payment initiated successfully'
      })
    } else {
      // Create redirect flow for new mandate
      const redirectFlow = await goCardlessService.createRedirectFlow({
        organizationId: organization.id,
        sessionToken: `${organization.id}_${productId}_${Date.now()}`,
        successRedirectUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payments/success`,
        description: `Payment for ${product.name}`,
        prefilled: {
          email: clientEmail,
          given_name: clientName?.split(' ')[0],
          family_name: clientName?.split(' ').slice(1).join(' ')
        }
      })
      
      // Store pending charge
      await supabase.from('gym_charges').insert({
        organization_id: organization.id,
        client_email: clientEmail,
        client_name: clientName,
        amount_cents: product.amount_cents,
        currency: product.currency,
        description: product.name,
        processor: 'gocardless',
        processor_payment_id: redirectFlow.id,
        platform_fee_cents: platformFeeAmount,
        status: 'requires_authorization',
        metadata: {
          product_id: productId,
          redirect_flow_id: redirectFlow.id,
          session_token: redirectFlow.session_token
        }
      })
      
      return NextResponse.json({
        success: true,
        url: redirectFlow.redirect_url,
        flowId: redirectFlow.id,
        message: 'Please complete mandate authorization'
      })
    }
    
  } catch (error) {
    console.error('Error creating GoCardless payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}