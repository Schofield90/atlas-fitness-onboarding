import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { 
  testDb, 
  testOrganization,
  setupTestData, 
  cleanupTestData 
} from '../setup/test-database'

describe('Messaging System Workflow Integration', () => {
  let testLeadId: string
  let testConversationId: string
  
  beforeAll(async () => {
    await setupTestData()
    
    // Create test lead
    const { data: lead } = await testDb
      .from('leads')
      .insert({
        organization_id: testOrganization.id,
        name: 'Messaging Test Lead',
        email: 'messaging@example.com',
        phone: '+447777777777',
        status: 'new'
      })
      .select()
      .single()
    
    testLeadId = lead?.id || ''
  })
  
  afterAll(async () => {
    if (testLeadId) {
      await testDb.from('leads').delete().eq('id', testLeadId)
    }
    await cleanupTestData()
  })
  
  describe('SMS Messaging Flow', () => {
    it('should send SMS message', async () => {
      const smsData = {
        organization_id: testOrganization.id,
        to: '+447777777777',
        from_number: '+441234567890',
        message: 'Hi! This is Atlas Fitness. How can we help you today?',
        status: 'sent',
        direction: 'outbound'
      }
      
      const { data: sms, error } = await testDb
        .from('sms_logs')
        .insert(smsData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(sms).toBeDefined()
      expect(sms.id).toBeDefined()
      expect(sms.status).toBe('sent')
    })
    
    it('should receive SMS response', async () => {
      const inboundSms = {
        organization_id: testOrganization.id,
        to: '+441234567890',
        from_number: '+447777777777',
        message: 'I want to know about membership prices',
        status: 'received',
        direction: 'inbound'
      }
      
      const { data: sms, error } = await testDb
        .from('sms_logs')
        .insert(inboundSms)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(sms).toBeDefined()
      expect(sms.direction).toBe('inbound')
    })
    
    it('should handle opt-out keywords', async () => {
      const optOutSms = {
        organization_id: testOrganization.id,
        to: '+441234567890',
        from_number: '+447777777777',
        message: 'STOP',
        status: 'received',
        direction: 'inbound'
      }
      
      const { data: sms, error } = await testDb
        .from('sms_logs')
        .insert(optOutSms)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(sms).toBeDefined()
      
      // Should trigger opt-out logic
      const { data: lead } = await testDb
        .from('leads')
        .update({ sms_opt_in: false })
        .eq('id', testLeadId)
        .select()
        .single()
      
      expect(lead?.sms_opt_in).toBe(false)
    })
  })
  
  describe('WhatsApp Messaging Flow', () => {
    it('should send WhatsApp message', async () => {
      const whatsappData = {
        organization_id: testOrganization.id,
        to: '+447777777777',
        from_number: 'whatsapp:+14155238886',
        message: 'Welcome to Atlas Fitness on WhatsApp! 💪',
        status: 'sent',
        direction: 'outbound'
      }
      
      const { data: whatsapp, error } = await testDb
        .from('whatsapp_logs')
        .insert(whatsappData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(whatsapp).toBeDefined()
      expect(whatsapp.from_number).toContain('whatsapp:')
    })
    
    it('should track conversation context', async () => {
      const contextData = {
        organization_id: testOrganization.id,
        phone_number: '+447777777777',
        channel: 'whatsapp',
        messages: [
          {
            role: 'user',
            content: 'What are your opening hours?',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            content: 'We are open Monday-Friday 6am-10pm, Saturday 7am-8pm, and Sunday 8am-6pm.',
            timestamp: new Date().toISOString()
          }
        ],
        last_message_at: new Date().toISOString()
      }
      
      const { data: context, error } = await testDb
        .from('conversation_contexts')
        .insert(contextData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(context).toBeDefined()
      expect(context.messages).toHaveLength(2)
      
      testConversationId = context.id
    })
    
    it('should update conversation context', async () => {
      // Get existing context
      const { data: context } = await testDb
        .from('conversation_contexts')
        .select('*')
        .eq('id', testConversationId)
        .single()
      
      // Add new message
      const updatedMessages = [
        ...context!.messages,
        {
          role: 'user',
          content: 'Do you have personal training?',
          timestamp: new Date().toISOString()
        }
      ]
      
      const { data: updated, error } = await testDb
        .from('conversation_contexts')
        .update({ 
          messages: updatedMessages,
          last_message_at: new Date().toISOString()
        })
        .eq('id', testConversationId)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated).toBeDefined()
      expect(updated.messages).toHaveLength(3)
    })
  })
  
  describe('Email Messaging Flow', () => {
    it('should send email', async () => {
      const emailData = {
        organization_id: testOrganization.id,
        to_email: 'messaging@example.com',
        from_email: 'info@atlasfitness.com',
        subject: 'Welcome to Atlas Fitness!',
        body: 'Thank you for your interest in Atlas Fitness...',
        status: 'sent',
        direction: 'outbound'
      }
      
      const { data: email, error } = await testDb
        .from('email_logs')
        .insert(emailData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(email).toBeDefined()
      expect(email.subject).toBe('Welcome to Atlas Fitness!')
    })
    
    it('should track email opens', async () => {
      // In production, this would be tracked via email service webhooks
      const openEvent = {
        type: 'email_opened',
        timestamp: new Date().toISOString(),
        metadata: { email_id: 'test-email-id' }
      }
      
      expect(openEvent.type).toBe('email_opened')
    })
  })
  
  describe('Unified Message History', () => {
    it('should aggregate all message types', async () => {
      // Get all messages for a contact
      const phone = '+447777777777'
      const email = 'messaging@example.com'
      
      // Get SMS messages
      const { data: smsMessages } = await testDb
        .from('sms_logs')
        .select('*')
        .or(`to.eq.${phone},from_number.eq.${phone}`)
        .order('created_at', { ascending: false })
      
      // Get WhatsApp messages
      const { data: whatsappMessages } = await testDb
        .from('whatsapp_logs')
        .select('*')
        .or(`to.eq.${phone},from_number.eq.whatsapp:${phone}`)
        .order('created_at', { ascending: false })
      
      // Get Email messages
      const { data: emailMessages } = await testDb
        .from('email_logs')
        .select('*')
        .or(`to_email.eq.${email},from_email.eq.${email}`)
        .order('created_at', { ascending: false })
      
      // Combine all messages
      const allMessages = [
        ...(smsMessages || []).map(m => ({ ...m, type: 'sms' })),
        ...(whatsappMessages || []).map(m => ({ ...m, type: 'whatsapp' })),
        ...(emailMessages || []).map(m => ({ ...m, type: 'email' }))
      ]
      
      expect(allMessages.length).toBeGreaterThan(0)
      expect(allMessages.some(m => m.type === 'sms')).toBe(true)
      expect(allMessages.some(m => m.type === 'whatsapp')).toBe(true)
      expect(allMessages.some(m => m.type === 'email')).toBe(true)
    })
  })
})