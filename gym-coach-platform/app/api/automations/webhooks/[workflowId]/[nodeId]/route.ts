import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { WebhookDelivery, ContentType } from '@/types/webhook-trigger'
import { ratelimit } from '@/lib/rate-limit'

// Rate limiting: 10 requests per second per webhook endpoint
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 1000 // 1 second

// Maximum request body size: 1MB
const MAX_BODY_SIZE = 1024 * 1024

// Create Supabase admin client
function createSupabaseAdmin() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string; nodeId: string } }
) {
  const startTime = Date.now()
  const { workflowId, nodeId } = params
  const sourceIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'

  console.log(`Webhook received for workflow ${workflowId}, node ${nodeId} from IP ${sourceIp}`)

  try {
    // Rate limiting
    const rateLimitKey = `webhook:${workflowId}:${nodeId}:${sourceIp}`
    const rateLimitResult = await ratelimit.limit(rateLimitKey, RATE_LIMIT, RATE_LIMIT_WINDOW)
    
    if (!rateLimitResult.success) {
      console.warn(`Rate limit exceeded for webhook ${workflowId}/${nodeId} from IP ${sourceIp}`)
      return createWebhookResponse(429, 'Rate limit exceeded', {
        retryAfter: Math.ceil(rateLimitResult.reset / 1000)
      })
    }

    // Get webhook configuration from database
    const supabase = createSupabaseAdmin()
    const { data: webhook, error: webhookError } = await supabase
      .from('automation_webhooks')
      .select(`
        *,
        workflow:automation_workflows!inner(
          id,
          organization_id,
          status
        )
      `)
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .eq('active', true)
      .single()

    if (webhookError || !webhook) {
      console.error(`Webhook not found or inactive: ${workflowId}/${nodeId}`, webhookError)
      return createWebhookResponse(404, 'Webhook not found')
    }

    // Check if webhook is paused
    if (webhook.paused) {
      console.log(`Webhook paused: ${workflowId}/${nodeId}`)
      return createWebhookResponse(503, 'Webhook temporarily unavailable')
    }

    // Check workflow status
    if (webhook.workflow.status !== 'active') {
      console.log(`Workflow not active: ${workflowId}`)
      return createWebhookResponse(503, 'Workflow not active')
    }

    // Check IP allowlist
    if (webhook.ip_allowlist && webhook.ip_allowlist.length > 0) {
      const isAllowed = await checkIpAllowlist(sourceIp, webhook.ip_allowlist)
      if (!isAllowed) {
        console.warn(`IP not allowed for webhook ${workflowId}/${nodeId}: ${sourceIp}`)
        return createWebhookResponse(403, 'IP address not allowed')
      }
    }

    // Check content type
    const contentType = request.headers.get('content-type') || ''
    const allowedTypes = webhook.content_types || ['application/json']
    
    const isContentTypeAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    )
    
    if (!isContentTypeAllowed) {
      console.warn(`Content type not allowed for webhook ${workflowId}/${nodeId}: ${contentType}`)
      return createWebhookResponse(415, 'Content type not supported')
    }

    // Get request body with size limit
    const body = await getRequestBody(request, MAX_BODY_SIZE)
    if (!body) {
      return createWebhookResponse(413, 'Request body too large')
    }

    // Verify signature and timestamp
    const signatureHeader = request.headers.get(webhook.verify.signature_header || 'X-Atlas-Signature')
    const timestampHeader = request.headers.get(webhook.verify.timestamp_header || 'X-Atlas-Timestamp')
    
    if (!signatureHeader || !timestampHeader) {
      console.warn(`Missing signature or timestamp headers for webhook ${workflowId}/${nodeId}`)
      return createWebhookResponse(401, 'Missing signature or timestamp')
    }

    const isSignatureValid = await verifyWebhookSignature(
      body,
      signatureHeader,
      timestampHeader,
      webhook.secret_hash,
      webhook.verify.tolerance_seconds || 300
    )

    if (!isSignatureValid.valid) {
      console.warn(`Invalid signature for webhook ${workflowId}/${nodeId}: ${isSignatureValid.reason}`)
      return createWebhookResponse(401, `Invalid signature: ${isSignatureValid.reason}`)
    }

    // Check for duplicates
    let dedupeKey: string | undefined
    if (webhook.dedupe_config) {
      dedupeKey = await getDedupeKey(request, body, webhook.dedupe_config)
      
      if (dedupeKey) {
        const isDuplicate = await checkDuplicateDelivery(
          workflowId,
          nodeId,
          dedupeKey,
          webhook.dedupe_config.window_seconds || 300
        )
        
        if (isDuplicate) {
          console.log(`Duplicate webhook detected: ${workflowId}/${nodeId}, key: ${dedupeKey}`)
          return createWebhookResponse(202, 'Duplicate request ignored', { duplicate: true })
        }
      }
    }

    // Store webhook delivery record
    const delivery: Partial<WebhookDelivery> = {
      id: crypto.randomUUID(),
      workflowId,
      nodeId,
      timestamp: new Date(),
      method: 'POST',
      headers: Object.fromEntries(request.headers.entries()),
      body,
      contentType: contentType as ContentType,
      sourceIp,
      signatureValid: true,
      timestampValid: true,
      dedupeKey,
      status: 'accepted',
      processingTimeMs: Date.now() - startTime
    }

    await supabase.from('webhook_deliveries').insert(delivery)

    // Trigger automation workflow
    await supabase.from('automation_triggers').insert({
      workflow_id: workflowId,
      node_id: nodeId,
      trigger_type: 'webhook',
      trigger_data: {
        headers: delivery.headers,
        body: JSON.parse(body),
        sourceIp,
        dedupeKey
      },
      organization_id: webhook.workflow.organization_id,
      status: 'pending'
    })

    // Update webhook statistics
    await updateWebhookStats(workflowId, nodeId, 'accepted', Date.now() - startTime)

    console.log(`Webhook processed successfully: ${workflowId}/${nodeId}, delivery: ${delivery.id}`)

    return createWebhookResponse(202, 'Webhook accepted', {
      deliveryId: delivery.id,
      processingTimeMs: Date.now() - startTime
    })

  } catch (error) {
    console.error(`Error processing webhook ${workflowId}/${nodeId}:`, error)
    
    // Update webhook statistics for errors
    await updateWebhookStats(workflowId, nodeId, 'rejected', Date.now() - startTime)
    
    return createWebhookResponse(500, 'Internal server error')
  }
}

// Helper function to create consistent webhook responses
function createWebhookResponse(status: number, message: string, data?: any) {
  const response = {
    status: status >= 200 && status < 300 ? 'success' : 'error',
    message,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  return NextResponse.json(response, { status })
}

// Get request body with size limit
async function getRequestBody(request: NextRequest, maxSize: number): Promise<string | null> {
  try {
    const body = await request.text()
    if (Buffer.byteLength(body, 'utf8') > maxSize) {
      return null
    }
    return body
  } catch (error) {
    console.error('Error reading request body:', error)
    return null
  }
}

// Verify webhook signature and timestamp
async function verifyWebhookSignature(
  body: string,
  signatureHeader: string,
  timestampHeader: string,
  secretHash: string,
  toleranceSeconds: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Parse signature (format: "sha256=abc123...")
    const signatureParts = signatureHeader.split('=')
    if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
      return { valid: false, reason: 'Invalid signature format' }
    }
    
    const providedSignature = signatureParts[1]
    const timestamp = parseInt(timestampHeader)
    
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(now - timestamp)
    
    if (timeDiff > toleranceSeconds) {
      return { valid: false, reason: 'Timestamp outside tolerance window' }
    }

    // Recreate the expected signature
    const payload = `${timestamp}.${body}`
    const expectedSignature = createHmac('sha256', secretHash)
      .update(payload, 'utf8')
      .digest('hex')
    
    // Compare signatures safely
    const providedBuffer = Buffer.from(providedSignature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Signature length mismatch' }
    }
    
    const isValid = timingSafeEqual(providedBuffer, expectedBuffer)
    return { valid: isValid, reason: isValid ? undefined : 'Signature mismatch' }
    
  } catch (error) {
    return { valid: false, reason: 'Signature verification error' }
  }
}

// Check IP allowlist
async function checkIpAllowlist(sourceIp: string, allowlist: string[]): Promise<boolean> {
  // Simple IP checking - in production you'd want more sophisticated CIDR matching
  for (const allowedIp of allowlist) {
    if (allowedIp.includes('/')) {
      // CIDR notation - simplified check
      const [network, prefixLength] = allowedIp.split('/')
      // This is a simplified implementation - you'd want proper CIDR matching
      if (sourceIp.startsWith(network.split('.').slice(0, -1).join('.'))) {
        return true
      }
    } else {
      // Exact IP match
      if (sourceIp === allowedIp) {
        return true
      }
    }
  }
  return false
}

// Get deduplication key from request
async function getDedupeKey(
  request: NextRequest,
  body: string,
  dedupeConfig: any
): Promise<string | undefined> {
  if (dedupeConfig.header) {
    return request.headers.get(dedupeConfig.header) || undefined
  }
  
  if (dedupeConfig.json_path) {
    try {
      const parsedBody = JSON.parse(body)
      // Simple JSON path extraction - in production you'd use a proper JSON path library
      const pathParts = dedupeConfig.json_path.split('.')
      let value = parsedBody
      
      for (const part of pathParts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part]
        } else {
          return undefined
        }
      }
      
      return typeof value === 'string' ? value : String(value)
    } catch (error) {
      console.warn('Error extracting dedupe key from JSON path:', error)
      return undefined
    }
  }
  
  return undefined
}

// Check for duplicate delivery
async function checkDuplicateDelivery(
  workflowId: string,
  nodeId: string,
  dedupeKey: string,
  windowSeconds: number
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin()
    const cutoff = new Date(Date.now() - windowSeconds * 1000)
    
    const { data } = await supabase
      .from('webhook_deliveries')
      .select('id')
      .eq('workflowId', workflowId)
      .eq('nodeId', nodeId)
      .eq('dedupeKey', dedupeKey)
      .gte('timestamp', cutoff.toISOString())
      .limit(1)
    
    return (data && data.length > 0) || false
  } catch (error) {
    console.error('Error checking for duplicate delivery:', error)
    return false // Allow delivery if we can't check for duplicates
  }
}

// Update webhook statistics
async function updateWebhookStats(
  workflowId: string,
  nodeId: string,
  status: 'accepted' | 'rejected',
  processingTimeMs: number
): Promise<void> {
  try {
    const supabase = createSupabaseAdmin()
    
    // This would update aggregated statistics in the database
    // Implementation depends on your specific statistics tracking needs
    await supabase.from('webhook_stats').upsert({
      workflow_id: workflowId,
      node_id: nodeId,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      [`${status}_count`]: 1,
      total_processing_time_ms: processingTimeMs,
      last_delivery_at: new Date().toISOString()
    }, {
      onConflict: 'workflow_id,node_id,date'
    })
  } catch (error) {
    console.error('Error updating webhook stats:', error)
    // Don't fail the webhook processing if stats update fails
  }
}

// GET endpoint for webhook information and testing
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string; nodeId: string } }
) {
  const { workflowId, nodeId } = params
  
  try {
    const supabase = createSupabaseAdmin()
    const { data: webhook, error } = await supabase
      .from('automation_webhooks')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .single()

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: 'ok',
      webhook: {
        id: webhook.id,
        workflowId,
        nodeId,
        endpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/automations/webhooks/${workflowId}/${nodeId}`,
        active: webhook.active,
        paused: webhook.paused,
        contentTypes: webhook.content_types,
        verifyConfig: webhook.verify,
        dedupeConfig: webhook.dedupe_config,
        ipAllowlist: webhook.ip_allowlist
      }
    })
  } catch (error) {
    console.error('Error getting webhook info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}