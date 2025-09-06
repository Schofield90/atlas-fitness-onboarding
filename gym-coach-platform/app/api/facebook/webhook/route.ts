import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api/middleware'
import { createHmac } from 'crypto'

const FACEBOOK_WEBHOOK_VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'atlas-fitness-webhook-2024'
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''

interface FacebookLeadGenEvent {
  object: 'page'
  entry: Array<{
    id: string
    time: number
    changes: Array<{
      value: {
        leadgen_id: string
        page_id: string
        form_id: string
        adgroup_id?: string
        ad_id?: string
        created_time: number
      }
      field: 'leadgen'
    }>
  }>
}

interface FacebookFeedEvent {
  object: 'page'
  entry: Array<{
    id: string
    time: number
    changes: Array<{
      value: {
        item: 'post' | 'comment'
        post_id?: string
        comment_id?: string
        verb: 'add' | 'edited' | 'remove'
        created_time: number
        message?: string
        from?: {
          id: string
          name: string
        }
      }
      field: 'feed'
    }>
  }>
}

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      console.log('Facebook webhook verified successfully')
      return new NextResponse(challenge, { status: 200 })
    } else {
      console.error('Facebook webhook verification failed:', { mode, token })
      return new NextResponse('Forbidden', { status: 403 })
    }
  } catch (error) {
    console.error('Facebook webhook verification error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Webhook event handling (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    // Verify webhook signature
    // Accept even if signature missing to avoid dev flakiness; do not reject hard
    if (!verifySignature(body, signature)) {
      console.warn('Facebook webhook signature verification failed (continuing with 200)')
      return new NextResponse('OK', { status: 200 })
    }

    const webhookData = JSON.parse(body)
    
    // Handle different types of webhook events
    switch (webhookData.object) {
      case 'page':
        await handlePageEvents(webhookData)
        break
      default:
        console.log('Unhandled webhook object type:', webhookData.object)
    }

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('Facebook webhook processing error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false

  const expectedSignature = 'sha256=' + createHmac('sha256', FACEBOOK_APP_SECRET)
    .update(body, 'utf8')
    .digest('hex')

  return signature === expectedSignature
}

async function handlePageEvents(webhookData: FacebookLeadGenEvent | FacebookFeedEvent) {
  for (const entry of webhookData.entry) {
    const pageId = entry.id

    // Find the organization associated with this page
    const { data: page } = await supabaseAdmin
      .from('facebook_pages')
      .select('organization_id, integration_id')
      .eq('facebook_page_id', pageId)
      .eq('is_active', true)
      .single()

    if (!page) {
      console.log('No active page found for Facebook page ID:', pageId)
      continue
    }

    // Process each change
    for (const change of entry.changes) {
      await processWebhookEvent(page.organization_id, entry, change)
    }
  }
}

async function processWebhookEvent(organizationId: string, entry: any, change: any) {
  try {
    // Store the webhook event
    await supabaseAdmin.from('facebook_webhooks').insert({
      organization_id: organizationId,
      webhook_id: `${entry.id}_${entry.time}_${change.field}`,
      object_type: 'page',
      event_type: change.field,
      event_data: {
        entry,
        change
      },
      processing_status: 'pending'
    })

    // Process specific event types
    switch (change.field) {
      case 'leadgen':
        await processLeadGenEvent(organizationId, change.value)
        break
      case 'feed':
        await processFeedEvent(organizationId, change.value)
        break
      case 'mention':
        await processMentionEvent(organizationId, change.value)
        break
      default:
        console.log('Unhandled webhook field:', change.field)
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from('facebook_webhooks')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('webhook_id', `${entry.id}_${entry.time}_${change.field}`)

  } catch (error) {
    console.error('Error processing webhook event:', error)
    
    // Mark webhook as failed
    await supabaseAdmin
      .from('facebook_webhooks')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString()
      })
      .eq('webhook_id', `${entry.id}_${entry.time}_${change.field}`)
  }
}

async function processLeadGenEvent(organizationId: string, leadGenData: any) {
  try {
    const { leadgen_id, page_id, form_id } = leadGenData

    // Get the page and integration info
    const { data: page } = await supabaseAdmin
      .from('facebook_pages')
      .select(`
        id,
        access_token,
        facebook_integrations!inner(
          access_token
        )
      `)
      .eq('facebook_page_id', page_id)
      .eq('organization_id', organizationId)
      .single()

    if (!page) {
      console.error('Page not found for lead gen event:', page_id)
      return
    }

    // Get or create the lead form
    let { data: leadForm } = await supabaseAdmin
      .from('facebook_lead_forms')
      .select('id')
      .eq('facebook_form_id', form_id)
      .eq('organization_id', organizationId)
      .single()

    if (!leadForm) {
      // Create the lead form if it doesn't exist
      const { data: newForm } = await supabaseAdmin
        .from('facebook_lead_forms')
        .insert({
          page_id: page.id,
          organization_id: organizationId,
          facebook_form_id: form_id,
          form_name: `Form ${form_id}`, // You might want to fetch the actual name from Facebook
          status: 'active',
          questions: [],
          is_active: true
        })
        .select('id')
        .single()

      leadForm = newForm
    }

    if (!leadForm) {
      console.error('Failed to create or find lead form:', form_id)
      return
    }

    // Fetch the actual lead data from Facebook
    const leadDataUrl = `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${page.access_token}`
    const leadResponse = await fetch(leadDataUrl)
    const leadData = await leadResponse.json()

    if (leadData.error) {
      console.error('Error fetching lead data from Facebook:', leadData.error)
      return
    }

    // Store the Facebook lead
    await supabaseAdmin.from('facebook_leads').insert({
      form_id: leadForm.id,
      organization_id: organizationId,
      facebook_lead_id: leadgen_id,
      lead_data: leadData,
      processing_status: 'pending'
    })

    console.log('Facebook lead stored successfully:', leadgen_id)

  } catch (error) {
    console.error('Error processing lead gen event:', error)
    throw error
  }
}

async function processFeedEvent(organizationId: string, feedData: any) {
  // Handle feed events (posts, comments, etc.)
  // This could be used for social media engagement tracking
  console.log('Processing feed event for organization:', organizationId, feedData)
  
  // You can implement engagement tracking here
  // For example, track comments and messages for potential leads
}

async function processMentionEvent(organizationId: string, mentionData: any) {
  // Handle mention events
  // This could be used for brand monitoring and lead identification
  console.log('Processing mention event for organization:', organizationId, mentionData)
  
  // You can implement mention tracking here
  // For example, track when your page is mentioned in posts or comments
}