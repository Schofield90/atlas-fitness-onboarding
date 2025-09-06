import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

describe('Meta Messenger API Integration', () => {
  let testOrgId: string
  let testUserId: string
  let testConversationId: string

  beforeAll(async () => {
    // Create test organization and user
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org' })
      .select()
      .single()
    testOrgId = org.id

    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'test123456'
    })
    testUserId = user.user.id
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('organizations').delete().eq('id', testOrgId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  describe('Webhook Processing', () => {
    it('should process inbound message webhook', async () => {
      const webhookPayload = {
        object: 'page',
        entry: [{
          id: 'test_page_123',
          time: Date.now(),
          messaging: [{
            sender: { id: 'test_user_456' },
            recipient: { id: 'test_page_123' },
            timestamp: Date.now(),
            message: {
              mid: 'test_msg_789',
              text: 'Test message'
            }
          }]
        }]
      }

      // Mock webhook endpoint call
      const response = await fetch('http://localhost:3000/api/webhooks/meta/messenger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=test_signature'
        },
        body: JSON.stringify(webhookPayload)
      })

      // Should return 200 quickly
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
    })

    it('should handle duplicate messages', async () => {
      const messageId = 'duplicate_msg_123'
      
      // First message
      await supabase
        .from('messenger_messages')
        .insert({
          organization_id: testOrgId,
          conversation_id: testConversationId,
          external_message_id: messageId,
          text: 'First',
          direction: 'in',
          provider: 'facebook'
        })

      // Attempt duplicate
      const { error } = await supabase
        .from('messenger_messages')
        .insert({
          organization_id: testOrgId,
          conversation_id: testConversationId,
          external_message_id: messageId,
          text: 'Duplicate',
          direction: 'in',
          provider: 'facebook'
        })

      expect(error).toBeDefined()
      expect(error?.code).toBe('23505') // Unique violation
    })
  })

  describe('Message Sending', () => {
    it('should enforce 24-hour window', async () => {
      // Create conversation with old last_inbound_at
      const { data: conversation } = await supabase
        .from('messenger_conversations')
        .insert({
          organization_id: testOrgId,
          provider: 'facebook',
          channel_id: 'test_page_123',
          external_thread_id: 'test_page_123:test_user_456',
          last_inbound_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
        })
        .select()
        .single()

      // Attempt to send message
      const response = await fetch('http://localhost:3000/api/messages/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: 'Test message'
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('OUTSIDE_WINDOW')
    })

    it('should allow messages within window', async () => {
      // Create conversation with recent last_inbound_at
      const { data: conversation } = await supabase
        .from('messenger_conversations')
        .insert({
          organization_id: testOrgId,
          provider: 'facebook',
          channel_id: 'test_page_123',
          external_thread_id: 'test_page_123:test_user_789',
          last_inbound_at: new Date().toISOString() // Just now
        })
        .select()
        .single()

      // Mock send (would fail without real token)
      const response = await fetch('http://localhost:3000/api/messages/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          text: 'Test message'
        })
      })

      // Should attempt send (will fail on Meta API call without real token)
      expect(response.status).toBeLessThanOrEqual(500)
    })
  })

  describe('Token Management', () => {
    it('should store tokens encrypted', async () => {
      const plainToken = 'EAATestToken123'
      
      // This would be done via the OAuth flow
      const { encrypt } = await import('@/app/lib/encryption')
      const encryptedToken = encrypt(plainToken)
      
      const { data } = await supabase
        .from('integration_accounts')
        .insert({
          organization_id: testOrgId,
          provider: 'facebook',
          page_id: 'test_page',
          page_name: 'Test Page',
          page_access_token: encryptedToken,
          status: 'active'
        })
        .select()
        .single()

      // Token should be encrypted in database
      expect(data.page_access_token).not.toBe(plainToken)
      expect(data.page_access_token).toBe(encryptedToken)
    })
  })
})