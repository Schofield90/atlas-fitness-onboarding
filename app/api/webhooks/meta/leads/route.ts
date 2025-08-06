import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import crypto from 'crypto'

interface MetaWebhookEntry {
  id: string; // Page ID
  time: number;
  changes: Array<{
    field: string;
    value: {
      page_id: string;
      form_id: string;
      leadgen_id: string;
      created_time: number;
      ad_id?: string;
      adset_id?: string;
      campaign_id?: string;
    };
  }>;
}

interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const formattedSignature = signature.replace('sha256=', '')
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(formattedSignature, 'hex')
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

async function processLeadgenWebhook(entry: MetaWebhookEntry) {
  const supabase = await createClient()
  
  for (const change of entry.changes) {
    if (change.field !== 'leadgen') continue

    const { page_id, form_id, leadgen_id, created_time, ad_id, adset_id, campaign_id } = change.value

    try {
      // Find the organization that owns this page
      const { data: pageRecord } = await supabase
        .from('facebook_pages')
        .select(`
          id,
          organization_id,
          page_name,
          facebook_lead_forms (
            id,
            form_name
          )
        `)
        .eq('facebook_page_id', page_id)
        .eq('is_active', true)
        .single()

      if (!pageRecord) {
        console.warn(`No active page record found for page ID: ${page_id}`)
        return
      }

      // Find the specific form
      const formRecord = await supabase
        .from('facebook_lead_forms')
        .select('id, form_name')
        .eq('facebook_form_id', form_id)
        .eq('organization_id', pageRecord.organization_id)
        .eq('is_active', true)
        .single()

      if (!formRecord.data) {
        console.warn(`No active form record found for form ID: ${form_id}`)
        return
      }

      // Create a webhook event record for processing
      const webhookData = {
        organization_id: pageRecord.organization_id,
        object_type: 'page',
        event_type: 'leadgen',
        event_data: {
          page_id,
          form_id,
          leadgen_id,
          created_time,
          ad_id,
          adset_id,
          campaign_id,
          page_name: pageRecord.page_name,
          form_name: formRecord.data.form_name
        },
        processing_status: 'pending'
      }

      // Store the webhook event
      const { error: webhookError } = await supabase
        .from('facebook_webhooks')
        .insert(webhookData)

      if (webhookError) {
        console.error('Failed to store webhook event:', webhookError)
        return
      }

      // Try to process the lead immediately
      try {
        await processLeadCapture({
          organizationId: pageRecord.organization_id,
          pageId: page_id,
          formId: form_id,
          leadId: leadgen_id,
          formDbId: formRecord.data.id
        })
      } catch (processError) {
        console.error('Failed to process lead immediately, will retry later:', processError)
        // The webhook record is stored for retry processing
      }

    } catch (error) {
      console.error(`Error processing leadgen webhook for lead ${leadgen_id}:`, error)
    }
  }
}

async function processLeadCapture({
  organizationId,
  pageId,
  formId,
  leadId,
  formDbId
}: {
  organizationId: string;
  pageId: string;
  formId: string;
  leadId: string;
  formDbId: string;
}) {
  const supabase = await createClient()

  // Get the integration to retrieve access token
  const { data: integration } = await supabase
    .from('facebook_integrations')
    .select('access_token')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!integration?.access_token) {
    throw new Error('No active Meta integration found')
  }

  // Fetch lead data from Meta API
  const leadResponse = await fetch(
    `https://graph.facebook.com/v18.0/${leadId}?fields=id,created_time,field_data&access_token=${integration.access_token}`
  )

  if (!leadResponse.ok) {
    throw new Error(`Failed to fetch lead data: ${leadResponse.statusText}`)
  }

  const leadData = await leadResponse.json()

  if (leadData.error) {
    throw new Error(`Meta API error: ${leadData.error.message}`)
  }

  // Transform field_data to usable format
  const transformedData: any = {}
  if (leadData.field_data) {
    for (const field of leadData.field_data) {
      const fieldName = field.name?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
      transformedData[fieldName] = field.values?.[0] || field.value || null
    }
  }

  // Store the Facebook lead record
  const { error: fbLeadError } = await supabase
    .from('facebook_leads')
    .insert({
      form_id: formDbId,
      organization_id: organizationId,
      facebook_lead_id: leadId,
      lead_data: {
        ...transformedData,
        raw_field_data: leadData.field_data,
        created_time: leadData.created_time,
        captured_via: 'webhook'
      },
      processing_status: 'pending'
    })

  if (fbLeadError && fbLeadError.code !== '23505') { // Ignore duplicates
    throw fbLeadError
  }

  console.log(`Successfully processed webhook lead ${leadId} for organization ${organizationId}`)
}

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'atlas_fitness_verify_token'

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Meta webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.error('❌ Meta webhook verification failed')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// Webhook payload processing (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256') || ''
    
    // Verify webhook signature
    const webhookSecret = process.env.META_WEBHOOK_SECRET || process.env.FACEBOOK_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ Meta webhook secret not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook payload
    const payload: MetaWebhookPayload = JSON.parse(body)
    
    if (payload.object !== 'page') {
      console.warn(`Ignoring webhook for object type: ${payload.object}`)
      return NextResponse.json({ received: true })
    }

    // Process each entry
    const processPromises = payload.entry.map(entry => 
      processLeadgenWebhook(entry).catch(error => {
        console.error(`Failed to process webhook entry ${entry.id}:`, error)
      })
    )

    await Promise.allSettled(processPromises)

    return NextResponse.json({ 
      received: true,
      processed: payload.entry.length
    })

  } catch (error) {
    console.error('Meta webhook processing error:', error)
    
    // Always return 200 to prevent Meta from retrying
    // We'll handle errors through our internal retry mechanism
    return NextResponse.json({ 
      received: true,
      error: 'Internal processing error'
    })
  }
}