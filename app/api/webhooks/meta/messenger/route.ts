import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { MetaMessengerClient, MetaWebhookEntry } from '@/app/lib/meta/client'
import { verifyWebhookSignature } from '@/app/lib/encryption'

// Webhook verification for Meta
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('Meta webhook verification:', { mode, token: token?.substring(0, 10) + '...' })

  const verifiedChallenge = MetaMessengerClient.verifyWebhookChallenge(
    mode || '',
    token || '',
    challenge || ''
  )

  if (verifiedChallenge) {
    return new NextResponse(verifiedChallenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// Process webhook events
export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-hub-signature-256')
  const body = await request.text()

  // Verify signature if app secret is configured
  if (process.env.META_APP_SECRET && signature) {
    const isValid = verifyWebhookSignature(body, signature, process.env.META_APP_SECRET)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const payload = JSON.parse(body)
  const supabase = await createClient()

  // Process each entry
  for (const entry of payload.entry || []) {
    try {
      await processWebhookEntry(entry, supabase)
    } catch (error) {
      console.error('Error processing webhook entry:', error)
      // Continue processing other entries
    }
  }

  // Respond quickly to avoid timeout
  return NextResponse.json({ received: true }, { status: 200 })
}

async function processWebhookEntry(entry: MetaWebhookEntry, supabase: any) {
  const pageId = entry.id

  // Get integration account for this page
  const { data: integration } = await supabase
    .from('integration_accounts')
    .select('*')
    .eq('page_id', pageId)
    .eq('provider', 'facebook')
    .eq('status', 'active')
    .single()

  if (!integration) {
    console.log(`No active integration found for page ${pageId}`)
    return
  }

  const organizationId = integration.organization_id

  // Process messaging events
  for (const event of entry.messaging || []) {
    const senderId = event.sender.id
    const recipientId = event.recipient.id
    const isEcho = event.message?.is_echo

    // Skip echo messages (our own messages)
    if (isEcho) continue

    // Skip if sender is the page itself
    if (senderId === pageId) continue

    // Process different event types
    if (event.message) {
      await processMessage(event, organizationId, pageId, supabase)
    } else if (event.delivery) {
      await processDelivery(event, organizationId, supabase)
    } else if (event.read) {
      await processRead(event, organizationId, supabase)
    } else if (event.postback) {
      await processPostback(event, organizationId, pageId, supabase)
    }
  }
}

async function processMessage(event: any, organizationId: string, pageId: string, supabase: any) {
  const senderId = event.sender.id
  const message = event.message
  const messageId = message.mid

  // Check for duplicate
  const { data: existing } = await supabase
    .from('messenger_messages')
    .select('id')
    .eq('external_message_id', messageId)
    .single()

  if (existing) {
    console.log(`Duplicate message ${messageId}, skipping`)
    return
  }

  // Upsert channel identity
  const { data: channelIdentity } = await supabase
    .from('channel_identities')
    .upsert({
      organization_id: organizationId,
      provider: 'facebook',
      external_id: senderId,
      page_id: pageId,
      display_name: `User ${senderId.substring(0, 8)}` // Will update with profile later
    }, {
      onConflict: 'organization_id,provider,external_id'
    })
    .select()
    .single()

  // Create or get contact (lead)
  let contactId = channelIdentity.contact_id

  if (!contactId) {
    // Create new lead for this contact
    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        name: channelIdentity.display_name,
        source: 'facebook_messenger',
        status: 'new',
        metadata: {
          facebook_psid: senderId,
          page_id: pageId
        }
      })
      .select()
      .single()

    contactId = newLead.id

    // Update channel identity with contact
    await supabase
      .from('channel_identities')
      .update({ contact_id: contactId })
      .eq('id', channelIdentity.id)
  }

  // Upsert conversation
  const threadId = `${pageId}:${senderId}`
  const { data: conversation } = await supabase
    .from('messenger_conversations')
    .upsert({
      organization_id: organizationId,
      contact_id: contactId,
      provider: 'facebook',
      channel_id: pageId,
      external_thread_id: threadId,
      last_inbound_at: new Date().toISOString(),
      status: 'active'
    }, {
      onConflict: 'organization_id,provider,external_thread_id'
    })
    .select()
    .single()

  // Increment unread count
  await supabase
    .from('messenger_conversations')
    .update({ 
      unread_count: conversation.unread_count + 1,
      last_inbound_at: new Date().toISOString()
    })
    .eq('id', conversation.id)

  // Parse attachments
  const attachments = []
  if (message.attachments) {
    for (const attachment of message.attachments) {
      attachments.push({
        type: attachment.type,
        url: attachment.payload?.url,
        sticker_id: attachment.payload?.sticker_id
      })
    }
  }

  // Insert message
  await supabase
    .from('messenger_messages')
    .insert({
      organization_id: organizationId,
      conversation_id: conversation.id,
      contact_id: contactId,
      provider: 'facebook',
      direction: 'in',
      external_message_id: messageId,
      message_type: attachments.length > 0 ? attachments[0].type : 'text',
      text: message.text || '',
      attachments,
      status: 'delivered',
      sent_at: new Date(event.timestamp).toISOString(),
      metadata: {
        quick_reply: message.quick_reply,
        reply_to: message.reply_to
      }
    })

  // Try to get user profile (async, don't block)
  updateUserProfile(senderId, pageId, organizationId, supabase, integration.page_access_token)
}

async function processDelivery(event: any, organizationId: string, supabase: any) {
  const delivery = event.delivery
  const mids = delivery.mids || []

  // Update message statuses
  for (const mid of mids) {
    await supabase
      .from('messenger_messages')
      .update({
        status: 'delivered',
        delivered_at: new Date(delivery.watermark).toISOString()
      })
      .eq('external_message_id', mid)
      .eq('organization_id', organizationId)
  }
}

async function processRead(event: any, organizationId: string, supabase: any) {
  const read = event.read
  const watermark = new Date(read.watermark)

  // Update all messages before watermark as read
  await supabase
    .from('messenger_messages')
    .update({
      status: 'read',
      read_at: watermark.toISOString()
    })
    .eq('organization_id', organizationId)
    .eq('direction', 'out')
    .lte('sent_at', watermark.toISOString())
    .eq('status', 'delivered')
}

async function processPostback(event: any, organizationId: string, pageId: string, supabase: any) {
  // Postbacks are button clicks from persistent menu or templates
  const senderId = event.sender.id
  const postback = event.postback
  
  // Process similar to message but with postback payload
  const threadId = `${pageId}:${senderId}`
  
  // Get conversation
  const { data: conversation } = await supabase
    .from('messenger_conversations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('external_thread_id', threadId)
    .single()

  if (conversation) {
    // Insert as a special message type
    await supabase
      .from('messenger_messages')
      .insert({
        organization_id: organizationId,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id,
        provider: 'facebook',
        direction: 'in',
        message_type: 'postback',
        text: postback.title,
        status: 'delivered',
        sent_at: new Date(event.timestamp).toISOString(),
        metadata: {
          payload: postback.payload,
          referral: postback.referral
        }
      })

    // Update conversation
    await supabase
      .from('messenger_conversations')
      .update({ 
        last_inbound_at: new Date().toISOString(),
        unread_count: conversation.unread_count + 1
      })
      .eq('id', conversation.id)
  }
}

async function updateUserProfile(psid: string, pageId: string, organizationId: string, supabase: any, encryptedToken: string) {
  try {
    const client = new MetaMessengerClient(encryptedToken)
    const profile = await client.getUserProfile(psid)

    if (profile.first_name || profile.last_name) {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')

      // Update channel identity
      await supabase
        .from('channel_identities')
        .update({
          display_name: fullName,
          profile_pic_url: profile.profile_pic
        })
        .eq('organization_id', organizationId)
        .eq('external_id', psid)

      // Update lead name if it's still the default
      const { data: identity } = await supabase
        .from('channel_identities')
        .select('contact_id')
        .eq('organization_id', organizationId)
        .eq('external_id', psid)
        .single()

      if (identity?.contact_id) {
        await supabase
          .from('leads')
          .update({ 
            name: fullName,
            metadata: supabase.raw(`metadata || '{"profile_pic": "${profile.profile_pic}"}'::jsonb`)
          })
          .eq('id', identity.contact_id)
          .match({ name: `User ${psid.substring(0, 8)}` }) // Only update if still has default name
      }
    }
  } catch (error) {
    console.error('Failed to update user profile:', error)
  }
}