import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formId } = body
    
    if (!formId) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 })
    }
    
    // Get user and organization
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get Facebook integration with access token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()
    
    if (integrationError || !integration) {
      console.error('No active Facebook integration found:', integrationError)
      return NextResponse.json({ error: 'Facebook not connected. Please reconnect your account.' }, { status: 401 })
    }
    
    // Get the page that owns this form to get page access token
    const { data: leadForm } = await supabase
      .from('facebook_lead_forms')
      .select('facebook_page_id, form_name')
      .eq('facebook_form_id', formId)
      .eq('organization_id', organizationId)
      .single()
    
    if (!leadForm) {
      console.error(`Lead form ${formId} not found in database`)
      return NextResponse.json({ error: 'Lead form not found' }, { status: 404 })
    }
    
    // Get page access token
    const { data: page } = await supabase
      .from('facebook_pages')
      .select('access_token, page_name')
      .eq('facebook_page_id', leadForm.facebook_page_id)
      .eq('organization_id', organizationId)
      .single()
    
    if (!page || !page.access_token) {
      console.error(`Page access token not found for form ${formId}`)
      return NextResponse.json({ error: 'Page access token not found' }, { status: 404 })
    }
    
    console.log(`🔗 Registering webhook for form: ${formId} (${leadForm.form_name}) on page ${page.page_name}`)
    
    // Subscribe the page to webhooks
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/webhooks/facebook-leads`
    const verifyToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'gym_webhook_verify_2024'
    
    try {
      // First, ensure the app is subscribed to the page
      const subscribeResponse = await fetch(
        `https://graph.facebook.com/v18.0/${leadForm.facebook_page_id}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscribed_fields: 'leadgen',
            access_token: page.access_token
          })
        }
      )
      
      const subscribeData = await subscribeResponse.json()
      console.log('Page subscription response:', subscribeData)
      
      if (!subscribeResponse.ok && subscribeData.error) {
        throw new Error(subscribeData.error.message || 'Failed to subscribe page')
      }
      
      // Store webhook configuration in database
      const { error: updateError } = await supabase
        .from('facebook_lead_forms')
        .update({
          webhook_enabled: true,
          webhook_url: webhookUrl,
          updated_at: new Date().toISOString()
        })
        .eq('facebook_form_id', formId)
        .eq('organization_id', organizationId)
      
      if (updateError) {
        console.error('Failed to update webhook status in database:', updateError)
      }
      
      return NextResponse.json({
        success: true,
        formId,
        formName: leadForm.form_name,
        pageName: page.page_name,
        webhookUrl,
        message: 'Real-time sync enabled successfully! New leads will now appear instantly.',
        subscribed: true
      })
      
    } catch (fbError) {
      console.error('Facebook API error:', fbError)
      return NextResponse.json({
        error: 'Failed to enable real-time sync. Please check your Facebook permissions.',
        details: fbError instanceof Error ? fbError.message : 'Unknown error'
      }, { status: 400 })
    }
    
  } catch (error) {
    console.error('❌ Error registering webhook:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to register webhook', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}