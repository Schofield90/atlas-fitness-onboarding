import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'

// In-memory dedupe for rapid retries within a single lambda/container lifetime
const processedLeadIds = new Set<string>()

function safeJsonParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function verifySignature(body: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_WEBHOOK_SECRET || ''
  if (!appSecret) {
    // Allow in dev when secret not configured
    return process.env.NODE_ENV !== 'production'
  }
  if (!signatureHeader) return false
  const expected = crypto.createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')
  const provided = signatureHeader.replace('sha256=', '')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))
  } catch {
    return false
  }
}

// Handle Facebook webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')
  
  const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN || 'atlas_fitness_verify_token'
  console.log('facebook-leads webhook verify attempt', { mode })
  
  // Check if this is a subscribe request with the correct token
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('facebook-leads webhook verified')
    // Return the challenge to verify the webhook
    return new Response(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  console.warn('facebook-leads webhook verify failed')
  return new Response('Forbidden', { status: 403 })
}

// Handle actual lead webhooks
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')

    if (!verifySignature(rawBody, signature)) {
      console.warn('facebook-leads invalid signature')
      // Still acknowledge to avoid disablement; do not leak info
      return new Response('OK', { status: 200 })
    }

    const payload = safeJsonParse<any>(rawBody)
    if (!payload) {
      console.error('facebook-leads malformed JSON')
      return new Response('OK', { status: 200 })
    }

    if (payload.object !== 'page' || !Array.isArray(payload.entry)) {
      console.log('facebook-leads non-page event ignored', { object: payload.object })
      return new Response('OK', { status: 200 })
    }

    const admin = createAdminClient()

    for (const entry of payload.entry) {
      const pageId = entry.id
      const createdTime = entry.time
      if (!Array.isArray(entry.changes)) continue
      for (const change of entry.changes) {
        if (change.field !== 'leadgen' || !change.value) continue
        const value = change.value as { leadgen_id: string; form_id: string; page_id: string; created_time: number }
        const leadId = value.leadgen_id
        if (!leadId) continue

        // Idempotency: in-memory + DB upsert by webhook_id
        if (processedLeadIds.has(leadId)) {
          console.log('facebook-leads duplicate skipped', { leadId })
          continue
        }
        processedLeadIds.add(leadId)

        const webhookId = `${pageId}_${createdTime}_leadgen_${leadId}`

        // Store minimal event record for observability; ignore errors
        try {
          await admin
            .from('facebook_webhooks')
            .upsert(
              {
                organization_id: null,
                webhook_id: webhookId,
                object_type: 'page',
                event_type: 'leadgen',
                event_data: {
                  page_id: value.page_id,
                  form_id: value.form_id,
                  leadgen_id: value.leadgen_id,
                  created_time: value.created_time
                },
                processing_status: 'received'
              } as any,
              { onConflict: 'webhook_id' }
            )
        } catch (e) {
          // Non-fatal
        }

        console.log('facebook-leads event', {
          eventId: webhookId,
          page_id: value.page_id,
          created_time: value.created_time,
          type: 'leadgen'
        })
      }
    }

    const elapsedMs = Date.now() - startedAt
    if (elapsedMs > 9000) {
      console.warn('facebook-leads slow handler', { elapsedMs })
    }
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('facebook-leads handler error', { message: (error as Error).message })
    return new Response('OK', { status: 200 })
  }
}