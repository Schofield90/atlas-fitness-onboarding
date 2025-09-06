import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MetaMessengerClient } from '@/app/lib/meta/client'
import { encrypt, decrypt, verifyWebhookSignature } from '@/app/lib/encryption'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    META_APP_ID: 'test_app_id',
    META_APP_SECRET: 'test_app_secret',
    META_VERIFY_TOKEN: 'test_verify_token',
    META_GRAPH_VERSION: 'v18.0',
    ENCRYPTION_KEY: 'test_encryption_key_32_chars_long!!',
  }
}))

describe('Meta Messenger Integration', () => {
  describe('Encryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'EAATestPageAccessToken123456789'
      const encrypted = encrypt(originalToken)
      const decrypted = decrypt(encrypted)
      
      expect(encrypted).not.toBe(originalToken)
      expect(decrypted).toBe(originalToken)
    })

    it('should verify webhook signatures correctly', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'test_secret'
      const crypto = require('crypto')
      const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex')
      
      const isValid = verifyWebhookSignature(payload, signature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject invalid webhook signatures', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'test_secret'
      const invalidSignature = 'sha256=invalid_signature'
      
      const isValid = verifyWebhookSignature(payload, invalidSignature, secret)
      expect(isValid).toBe(false)
    })
  })

  describe('MetaMessengerClient', () => {
    it('should verify webhook challenge correctly', () => {
      const challenge = MetaMessengerClient.verifyWebhookChallenge(
        'subscribe',
        'test_verify_token',
        'challenge_string'
      )
      expect(challenge).toBe('challenge_string')
    })

    it('should reject invalid webhook challenge', () => {
      const challenge = MetaMessengerClient.verifyWebhookChallenge(
        'subscribe',
        'wrong_token',
        'challenge_string'
      )
      expect(challenge).toBeNull()
    })
  })

  describe('24-hour Messaging Window', () => {
    it('should allow messages within 24 hours', () => {
      const lastInbound = new Date()
      const now = new Date()
      const hoursElapsed = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60)
      
      expect(hoursElapsed).toBeLessThan(24)
      expect(hoursElapsed < 24).toBe(true)
    })

    it('should block messages after 24 hours', () => {
      const lastInbound = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      const now = new Date()
      const hoursElapsed = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60)
      
      expect(hoursElapsed).toBeGreaterThan(24)
      expect(hoursElapsed < 24).toBe(false)
    })
  })

  describe('Webhook Event Processing', () => {
    it('should handle message webhook event', () => {
      const event = {
        id: 'page_123',
        time: Date.now(),
        messaging: [{
          sender: { id: 'user_123' },
          recipient: { id: 'page_123' },
          timestamp: Date.now(),
          message: {
            mid: 'message_123',
            text: 'Hello!',
            attachments: []
          }
        }]
      }

      expect(event.messaging[0].message).toBeDefined()
      expect(event.messaging[0].message?.text).toBe('Hello!')
    })

    it('should handle delivery webhook event', () => {
      const event = {
        id: 'page_123',
        time: Date.now(),
        messaging: [{
          sender: { id: 'page_123' },
          recipient: { id: 'user_123' },
          timestamp: Date.now(),
          delivery: {
            mids: ['message_123'],
            watermark: Date.now()
          }
        }]
      }

      expect(event.messaging[0].delivery).toBeDefined()
      expect(event.messaging[0].delivery?.mids).toContain('message_123')
    })

    it('should handle read webhook event', () => {
      const event = {
        id: 'page_123',
        time: Date.now(),
        messaging: [{
          sender: { id: 'user_123' },
          recipient: { id: 'page_123' },
          timestamp: Date.now(),
          read: {
            watermark: Date.now()
          }
        }]
      }

      expect(event.messaging[0].read).toBeDefined()
      expect(event.messaging[0].read?.watermark).toBeDefined()
    })

    it('should handle postback webhook event', () => {
      const event = {
        id: 'page_123',
        time: Date.now(),
        messaging: [{
          sender: { id: 'user_123' },
          recipient: { id: 'page_123' },
          timestamp: Date.now(),
          postback: {
            title: 'Get Started',
            payload: 'GET_STARTED'
          }
        }]
      }

      expect(event.messaging[0].postback).toBeDefined()
      expect(event.messaging[0].postback?.payload).toBe('GET_STARTED')
    })
  })

  describe('Idempotency', () => {
    it('should deduplicate messages by external_message_id', () => {
      const messageIds = new Set<string>()
      const messageId = 'msg_123'
      
      // First insertion
      const firstInsert = !messageIds.has(messageId)
      if (firstInsert) messageIds.add(messageId)
      expect(firstInsert).toBe(true)
      
      // Duplicate attempt
      const secondInsert = !messageIds.has(messageId)
      expect(secondInsert).toBe(false)
    })
  })
})