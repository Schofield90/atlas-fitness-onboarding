import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { headers } from 'next/headers'

// Configure CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Form-ID',
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const formId = headersList.get('x-form-id') || 'default'
    const origin = headersList.get('origin') || headersList.get('referer') || ''
    
    const data = await request.json()
    
    // Extract UTM parameters if provided
    const { 
      first_name,
      last_name,
      email,
      phone,
      fitness_goals,
      preferred_location,
      preferred_time,
      current_fitness_level,
      interested_in,
      utm_source,
      utm_medium,
      utm_campaign,
      ...customFields
    } = data
    
    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    const supabase = await createClient()
    
    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, email')
      .eq('email', email)
      .single()
    
    if (existingLead) {
      // Update existing lead with new information
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          phone: phone || existingLead.phone,
          fitness_goals: fitness_goals || [],
          preferred_location,
          preferred_time,
          current_fitness_level,
          interested_in: interested_in || [],
          custom_fields: customFields,
          page_url: origin,
          utm_source,
          utm_medium,
          utm_campaign,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
      
      if (updateError) throw updateError
      
      // Still trigger webhook for duplicate submission
      await triggerWebhook('lead_updated', { ...existingLead, ...data })
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Thank you! We already have your information and will be in touch soon.',
          leadId: existingLead.id 
        },
        { headers: corsHeaders }
      )
    }
    
    // Insert new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        first_name,
        last_name,
        email,
        phone,
        form_id: formId,
        page_url: origin,
        fitness_goals: fitness_goals || [],
        preferred_location,
        preferred_time,
        current_fitness_level,
        interested_in: interested_in || [],
        custom_fields: customFields,
        utm_source,
        utm_medium,
        utm_campaign
      })
      .select()
      .single()
    
    if (insertError) throw insertError
    
    // Trigger webhook for new lead
    await triggerWebhook('new_lead', newLead)
    
    // Send WhatsApp notification if configured
    if (phone) {
      await sendWhatsAppNotification(phone, first_name)
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Thank you! We\'ll be in touch within 24 hours.',
        leadId: newLead.id 
      },
      { headers: corsHeaders }
    )
    
  } catch (error) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Trigger webhook for integrations
async function triggerWebhook(event: string, data: any) {
  // This can be expanded to trigger Zapier, Make, etc.
  console.log(`Webhook triggered: ${event}`, data)
  
  // If webhook URL is configured in env
  if (process.env.LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data, timestamp: new Date().toISOString() })
      })
    } catch (error) {
      console.error('Webhook error:', error)
    }
  }
}

// Send WhatsApp welcome message
async function sendWhatsAppNotification(phone: string, firstName: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        message: `Hi ${firstName}! 👋 Thanks for your interest in Atlas Fitness. I'm here to help you start your fitness journey. When would be a good time for a quick chat about your goals?`
      })
    })
    
    if (!res.ok) {
      console.error('WhatsApp notification failed')
    }
  } catch (error) {
    console.error('WhatsApp error:', error)
  }
}