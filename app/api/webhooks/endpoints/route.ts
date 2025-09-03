import { NextRequest, NextResponse } from 'next/server'
import { handleApiRoute, getSupabaseAdmin } from '@/lib/api/middleware'
import { z } from 'zod'

const webhookEndpointSchema = z.object({
  name: z.string().min(1),
  endpoint_url: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  allowed_methods: z.array(z.string()).default(['POST']),
  expected_headers: z.record(z.string()).default({}),
  response_format: z.enum(['json', 'xml', 'text']).default('json'),
  success_response: z.record(z.any()).default({ status: 'success' }),
  error_response: z.record(z.any()).default({ status: 'error' }),
  payload_mapping: z.record(z.any()).default({})
})

const webhookUpdateSchema = webhookEndpointSchema.partial()

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    // Fetch all webhook endpoints for the organization
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
    const { data: webhooks, error } = await admin
      .from('webhook_endpoints')
      .select(`
        id,
        name,
        endpoint_url,
        description,
        is_active,
        allowed_methods,
        response_format,
        total_requests,
        successful_requests,
        failed_requests,
        last_request_at,
        created_at,
        updated_at
      `)
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Failed to fetch webhook endpoints')
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      total: webhooks?.length || 0
    })
  })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    
    let validatedData: z.infer<typeof webhookEndpointSchema>
    try {
      validatedData = webhookEndpointSchema.parse(body)
    } catch (error) {
      throw new Error('Invalid request body')
    }

    const webhookData = {
      ...validatedData,
      organization_id: user.organization_id
    }

    // Create the webhook endpoint
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
    const { data: webhook, error } = await admin
      .from('webhook_endpoints')
      .insert(webhookData)
      .select(`
        id,
        name,
        endpoint_url,
        description,
        is_active,
        allowed_methods,
        response_format,
        total_requests,
        successful_requests,
        failed_requests,
        last_request_at,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      throw new Error('Failed to create webhook endpoint')
    }

    // Log analytics event
    await admin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'webhook',
      event_name: 'webhook_endpoint_created',
      properties: {
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        endpoint_url: webhook.endpoint_url
      },
      user_id: user.id
    })

    return NextResponse.json(webhook)
  })
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      throw new Error('Webhook endpoint ID is required')
    }

    let validatedData: z.infer<typeof webhookUpdateSchema>
    try {
      validatedData = webhookUpdateSchema.parse(updateData)
    } catch (error) {
      throw new Error('Invalid request body')
    }

    // Verify the webhook belongs to the user's organization
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
    const { data: existingWebhook, error: fetchError } = await admin
      .from('webhook_endpoints')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !existingWebhook) {
      throw new Error('Webhook endpoint not found')
    }

    // Update the webhook endpoint
    const { data: webhook, error } = await admin
      .from('webhook_endpoints')
      .update(validatedData)
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .select(`
        id,
        name,
        endpoint_url,
        description,
        is_active,
        allowed_methods,
        response_format,
        total_requests,
        successful_requests,
        failed_requests,
        last_request_at,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      throw new Error('Failed to update webhook endpoint')
    }

    return NextResponse.json(webhook)
  })
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      throw new Error('Webhook endpoint ID is required')
    }

    // Verify the webhook belongs to the user's organization
    const admin = getSupabaseAdmin()
    if (!admin) return NextResponse.json({ error: 'Service Unavailable' }, { status: 503 })
    const { data: existingWebhook, error: fetchError } = await admin
      .from('webhook_endpoints')
      .select('id, organization_id, name')
      .eq('id', id)
      .eq('organization_id', user.organization_id)
      .single()

    if (fetchError || !existingWebhook) {
      throw new Error('Webhook endpoint not found')
    }

    // Delete the webhook endpoint
    const { error } = await admin
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('organization_id', user.organization_id)

    if (error) {
      throw new Error('Failed to delete webhook endpoint')
    }

    // Log analytics event
    await admin.from('analytics_events').insert({
      organization_id: user.organization_id,
      event_type: 'webhook',
      event_name: 'webhook_endpoint_deleted',
      properties: {
        webhook_id: id,
        webhook_name: existingWebhook.name
      },
      user_id: user.id
    })

    return NextResponse.json({ success: true, id })
  })
}