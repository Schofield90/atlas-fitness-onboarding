import { NextRequest, NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// Generate a cryptographically secure webhook secret
function generateWebhookSecret(): string {
  // Generate 32 bytes of random data and encode as base64
  const randomData = randomBytes(32)
  return `wh_${randomData.toString('base64url')}`
}

// Hash the secret for secure storage
function hashSecret(secret: string): string {
  return createHmac('sha256', process.env.WEBHOOK_SECRET_KEY || 'fallback-key')
    .update(secret)
    .digest('hex')
}

// Get last 4 characters of the secret for display
function getSecretLast4(secret: string): string {
  return secret.slice(-4)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string; nodeId: string } }
) {
  const { workflowId, nodeId } = params
  
  console.log(`Rotating webhook secret for workflow ${workflowId}, node ${nodeId}`)

  try {
    const supabase = createSupabaseAdmin()

    // Verify the webhook exists and user has permission
    const { data: webhook, error: webhookError } = await supabase
      .from('automation_webhooks')
      .select(`
        *,
        workflow:automation_workflows!inner(
          id,
          organization_id,
          created_by
        )
      `)
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .single()

    if (webhookError || !webhook) {
      console.error(`Webhook not found: ${workflowId}/${nodeId}`, webhookError)
      return NextResponse.json(
        { error: 'Webhook not found' }, 
        { status: 404 }
      )
    }

    // TODO: Add proper authentication check here
    // For now, we'll allow the rotation if the webhook exists
    // In production, you'd verify the user has permission to modify this webhook

    // Generate new secret
    const newSecret = generateWebhookSecret()
    const newSecretHash = hashSecret(newSecret)
    const newLast4 = getSecretLast4(newSecret)

    // Create a one-time reveal token for the frontend
    const revealToken = crypto.randomUUID()
    const revealTokenExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Update webhook with new secret
    const { error: updateError } = await supabase
      .from('automation_webhooks')
      .update({
        secret_hash: newSecretHash,
        secret_last4: newLast4,
        secret_rotated_at: new Date().toISOString(),
        reveal_token: revealToken,
        reveal_token_expires_at: revealTokenExpiry.toISOString()
      })
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)

    if (updateError) {
      console.error('Error updating webhook secret:', updateError)
      return NextResponse.json(
        { error: 'Failed to update webhook secret' },
        { status: 500 }
      )
    }

    // Store the actual secret temporarily for one-time retrieval
    await supabase.from('webhook_secret_reveals').insert({
      reveal_token: revealToken,
      secret: newSecret,
      workflow_id: workflowId,
      node_id: nodeId,
      expires_at: revealTokenExpiry.toISOString()
    })

    // Log the secret rotation for audit purposes
    await supabase.from('webhook_audit_log').insert({
      webhook_id: webhook.id,
      workflow_id: workflowId,
      node_id: nodeId,
      action: 'secret_rotated',
      organization_id: webhook.workflow.organization_id,
      user_id: webhook.workflow.created_by, // TODO: Use actual authenticated user
      metadata: {
        old_secret_last4: webhook.secret_last4,
        new_secret_last4: newLast4,
        rotated_at: new Date().toISOString()
      }
    })

    console.log(`Webhook secret rotated successfully: ${workflowId}/${nodeId}`)

    return NextResponse.json({
      success: true,
      secretId: crypto.randomUUID(), // New secret identifier
      last4: newLast4,
      revealToken,
      expiresAt: revealTokenExpiry.toISOString(),
      message: 'Webhook secret rotated successfully'
    })

  } catch (error) {
    console.error(`Error rotating webhook secret ${workflowId}/${nodeId}:`, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve the secret one-time using reveal token
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string; nodeId: string } }
) {
  const { searchParams } = new URL(request.url)
  const revealToken = searchParams.get('reveal_token')
  
  if (!revealToken) {
    return NextResponse.json(
      { error: 'Reveal token required' },
      { status: 400 }
    )
  }

  try {
    const supabase = createSupabaseAdmin()

    // Get the secret using the reveal token
    const { data: secretReveal, error: revealError } = await supabase
      .from('webhook_secret_reveals')
      .select('*')
      .eq('reveal_token', revealToken)
      .eq('workflow_id', params.workflowId)
      .eq('node_id', params.nodeId)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (revealError || !secretReveal) {
      return NextResponse.json(
        { error: 'Invalid or expired reveal token' },
        { status: 404 }
      )
    }

    // Delete the reveal token after use (one-time use)
    await supabase
      .from('webhook_secret_reveals')
      .delete()
      .eq('reveal_token', revealToken)

    // Log the secret access
    await supabase.from('webhook_audit_log').insert({
      workflow_id: params.workflowId,
      node_id: params.nodeId,
      action: 'secret_revealed',
      metadata: {
        reveal_token: revealToken,
        revealed_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      secret: secretReveal.secret,
      last4: secretReveal.secret.slice(-4),
      message: 'Secret revealed (one-time only)'
    })

  } catch (error) {
    console.error('Error revealing webhook secret:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to invalidate current secret (disable webhook)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { workflowId: string; nodeId: string } }
) {
  const { workflowId, nodeId } = params

  try {
    const supabase = createSupabaseAdmin()

    // Verify the webhook exists
    const { data: webhook, error: webhookError } = await supabase
      .from('automation_webhooks')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .single()

    if (webhookError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Invalidate the secret by setting it to null and marking as inactive
    const { error: updateError } = await supabase
      .from('automation_webhooks')
      .update({
        secret_hash: null,
        secret_last4: null,
        active: false,
        secret_invalidated_at: new Date().toISOString()
      })
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)

    if (updateError) {
      console.error('Error invalidating webhook secret:', updateError)
      return NextResponse.json(
        { error: 'Failed to invalidate webhook secret' },
        { status: 500 }
      )
    }

    // Log the secret invalidation
    await supabase.from('webhook_audit_log').insert({
      webhook_id: webhook.id,
      workflow_id: workflowId,
      node_id: nodeId,
      action: 'secret_invalidated',
      metadata: {
        invalidated_at: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook secret invalidated and webhook disabled'
    })

  } catch (error) {
    console.error('Error invalidating webhook secret:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}