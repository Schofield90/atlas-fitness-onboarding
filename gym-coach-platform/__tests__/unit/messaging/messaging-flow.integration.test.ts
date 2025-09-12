import { NextRequest } from 'next/server';
import { POST as createConversation } from '@/app/api/conversations/route';
import { POST as sendMessage, GET as getMessages } from '@/app/api/conversations/[id]/messages/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

// Mock database state for integration testing
class MockDatabaseState {
  private conversations: any[] = [];
  private messages: any[] = [];
  private organizations: any[] = [];
  private clients: any[] = [];
  private users: any[] = [];
  private userOrganizations: any[] = [];

  constructor() {
    this.setupMockData();
  }

  private setupMockData() {
    // Setup test data
    this.organizations = [
      { id: 'org-123', name: 'Test Gym' }
    ];

    this.users = [
      { id: 'coach-123', name: 'Coach John', email: 'coach@gym.com' },
      { id: 'client-456', name: 'Client Jane', email: 'jane@example.com' }
    ];

    this.clients = [
      { id: 'client-123', organization_id: 'org-123', name: 'Client Jane', email: 'jane@example.com' }
    ];

    this.userOrganizations = [
      { user_id: 'coach-123', organization_id: 'org-123' },
      { user_id: 'client-456', organization_id: 'org-123' }
    ];
  }

  createConversation(conversation: any) {
    const newConversation = {
      id: `conv-${Date.now()}`,
      ...conversation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    };
    this.conversations.push(newConversation);
    return newConversation.id;
  }

  findConversation(criteria: any) {
    return this.conversations.find(conv => {
      return Object.keys(criteria).every(key => conv[key] === criteria[key]);
    });
  }

  getConversation(id: string) {
    return this.conversations.find(conv => conv.id === id);
  }

  createMessage(message: any) {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      ...message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.messages.push(newMessage);
    
    // Update conversation's last_message_at
    const conversation = this.conversations.find(conv => conv.id === message.conversation_id);
    if (conversation) {
      conversation.last_message_at = newMessage.created_at;
      conversation.updated_at = newMessage.created_at;
    }
    
    return newMessage;
  }

  getMessages(conversationId: string, limit = 50, offset = 0) {
    return this.messages
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(offset, offset + limit);
  }

  getUser(id: string) {
    return this.users.find(user => user.id === id);
  }

  getClient(id: string) {
    return this.clients.find(client => client.id === id);
  }

  getUserOrganization(userId: string) {
    const userOrg = this.userOrganizations.find(uo => uo.user_id === userId);
    return userOrg ? { organization_id: userOrg.organization_id } : null;
  }

  markMessagesAsRead(messageIds: string[]) {
    messageIds.forEach(id => {
      const message = this.messages.find(msg => msg.id === id);
      if (message) {
        message.read_at = new Date().toISOString();
      }
    });
  }
}

describe('Messaging Flow Integration Tests', () => {
  let mockDb: MockDatabaseState;
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new MockDatabaseState();

    mockSupabaseClient = {
      auth: {
        getSession: jest.fn()
      },
      from: jest.fn(),
      rpc: jest.fn()
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    setupMockSupabaseClient();
  });

  function setupMockSupabaseClient() {
    mockSupabaseClient.from.mockImplementation((table: string) => {
      switch (table) {
        case 'user_organizations':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  const userId = mockSupabaseClient._currentUserId;
                  return {
                    data: mockDb.getUserOrganization(userId),
                    error: null
                  };
                })
              })
            })
          };

        case 'clients':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockImplementation(async () => {
                    const clientId = mockSupabaseClient._currentClientId;
                    const orgId = mockSupabaseClient._currentOrgId;
                    const client = mockDb.getClient(clientId);
                    if (client && client.organization_id === orgId) {
                      return { data: client, error: null };
                    }
                    return { data: null, error: null };
                  })
                })
              })
            })
          };

        case 'conversations':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string, value: any) => {
                if (field === 'id') {
                  return {
                    single: jest.fn().mockImplementation(async () => {
                      const conversation = mockDb.getConversation(value);
                      return { data: conversation, error: null };
                    })
                  };
                }
                return {
                  order: jest.fn().mockReturnValue({
                    range: jest.fn().mockImplementation(async (offset: number, limit: number) => {
                      // Simplified conversation fetching
                      return { data: mockDb.conversations, error: null };
                    })
                  })
                };
              })
            })
          };

        case 'messages':
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  range: jest.fn().mockImplementation(async (offset: number, limit: number) => {
                    const conversationId = mockSupabaseClient._currentConversationId;
                    const messages = mockDb.getMessages(conversationId, limit, offset);
                    return { data: messages, error: null };
                  })
                })
              })
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  const messageData = mockSupabaseClient._messageToCreate;
                  const message = mockDb.createMessage(messageData);
                  const user = mockDb.getUser(message.sender_id);
                  return {
                    data: {
                      ...message,
                      users: user
                    },
                    error: null
                  };
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockImplementation(async (field: string, values: string[]) => {
                if (field === 'id') {
                  mockDb.markMessagesAsRead(values);
                }
                return { data: [], error: null };
              })
            })
          };

        default:
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          };
      }
    });

    mockSupabaseClient.rpc.mockImplementation(async (functionName: string, params: any) => {
      if (functionName === 'get_or_create_conversation') {
        const { p_organization_id, p_client_id, p_coach_id } = params;
        
        // Check if conversation already exists
        let conversation = mockDb.findConversation({
          organization_id: p_organization_id,
          client_id: p_client_id,
          coach_id: p_coach_id,
          status: 'active'
        });

        if (!conversation) {
          // Create new conversation
          const conversationId = mockDb.createConversation({
            organization_id: p_organization_id,
            client_id: p_client_id,
            coach_id: p_coach_id,
            title: mockDb.getClient(p_client_id)?.name || 'New Conversation',
            status: 'active'
          });
          return { data: conversationId, error: null };
        }

        return { data: conversation.id, error: null };
      }
      
      return { data: null, error: { message: 'Unknown function' } };
    });
  }

  function setMockSessionUser(userId: string) {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: userId } } }
    });
    mockSupabaseClient._currentUserId = userId;
  }

  function setMockClientId(clientId: string) {
    mockSupabaseClient._currentClientId = clientId;
  }

  function setMockOrgId(orgId: string) {
    mockSupabaseClient._currentOrgId = orgId;
  }

  function setMockConversationId(conversationId: string) {
    mockSupabaseClient._currentConversationId = conversationId;
  }

  function setMockMessageToCreate(messageData: any) {
    mockSupabaseClient._messageToCreate = messageData;
  }

  describe('Complete Messaging Flow', () => {
    it('should handle the complete gym owner to gym goer messaging flow without foreign key errors', async () => {
      // Step 1: Gym owner (coach) creates conversation with gym goer (client)
      setMockSessionUser('coach-123');
      setMockClientId('client-123');
      setMockOrgId('org-123');

      const createConvRequest = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          client_id: 'client-123',
          title: 'Workout Discussion'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const createConvResponse = await createConversation(createConvRequest);
      const createConvData = await createConvResponse.json();

      expect(createConvResponse.status).toBe(201);
      expect(createConvData.conversation).toBeDefined();
      expect(createConvData.conversation.id).toMatch(/^conv-/);

      const conversationId = createConvData.conversation.id;

      // Step 2: Coach sends initial message
      setMockConversationId(conversationId);
      setMockMessageToCreate({
        conversation_id: conversationId,
        sender_id: 'coach-123',
        sender_type: 'coach',
        content: 'Hi! How is your workout progress going?',
        message_type: 'text'
      });

      const coachMessageRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hi! How is your workout progress going?',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const coachMessageResponse = await sendMessage(coachMessageRequest, { params: { id: conversationId } });
      const coachMessageData = await coachMessageResponse.json();

      expect(coachMessageResponse.status).toBe(201);
      expect(coachMessageData.message.content).toBe('Hi! How is your workout progress going?');
      expect(coachMessageData.message.sender_type).toBe('coach');

      // Step 3: Client (gym goer) tries to reply - this is where the bug occurred
      setMockSessionUser('client-456');
      setMockMessageToCreate({
        conversation_id: conversationId,
        sender_id: 'client-456',
        sender_type: 'client',
        content: 'Great! I just finished my leg day workout.',
        message_type: 'text'
      });

      const clientReplyRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Great! I just finished my leg day workout.',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const clientReplyResponse = await sendMessage(clientReplyRequest, { params: { id: conversationId } });
      const clientReplyData = await clientReplyResponse.json();

      // This should work without foreign key constraint errors
      expect(clientReplyResponse.status).toBe(201);
      expect(clientReplyData.message.content).toBe('Great! I just finished my leg day workout.');
      expect(clientReplyData.message.sender_type).toBe('client');

      // Step 4: Verify conversation persistence by fetching messages
      setMockSessionUser('coach-123');

      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const getMessagesResponse = await getMessages(getMessagesRequest, { params: { id: conversationId } });
      const getMessagesData = await getMessagesResponse.json();

      expect(getMessagesResponse.status).toBe(200);
      expect(getMessagesData.messages).toHaveLength(2);
      expect(getMessagesData.messages[0].content).toBe('Hi! How is your workout progress going?');
      expect(getMessagesData.messages[1].content).toBe('Great! I just finished my leg day workout.');
      expect(getMessagesData.conversation_id).toBe(conversationId);
    });

    it('should handle conversation creation race condition gracefully', async () => {
      setMockSessionUser('coach-123');
      setMockClientId('client-123');
      setMockOrgId('org-123');

      // Simulate two simultaneous conversation creation requests
      const request1 = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          client_id: 'client-123',
          title: 'Workout Discussion 1'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const request2 = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          client_id: 'client-123',
          title: 'Workout Discussion 2'
        }),
        headers: { 'content-type': 'application/json' }
      });

      // Execute both requests concurrently
      const [response1, response2] = await Promise.all([
        createConversation(request1),
        createConversation(request2)
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should succeed
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Both should return the same conversation ID (get_or_create should handle duplicates)
      expect(data1.conversation.id).toBe(data2.conversation.id);
    });

    it('should handle message sending when conversation verification fails', async () => {
      const nonExistentConversationId = 'conv-nonexistent';
      
      setMockSessionUser('coach-123');
      setMockConversationId(nonExistentConversationId);

      const messageRequest = new NextRequest(`http://localhost:3000/api/conversations/${nonExistentConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'This should fail',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await sendMessage(messageRequest, { params: { id: nonExistentConversationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should maintain conversation state across multiple message exchanges', async () => {
      // Create conversation
      setMockSessionUser('coach-123');
      setMockClientId('client-123');
      setMockOrgId('org-123');

      const createConvRequest = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const createResponse = await createConversation(createConvRequest);
      const { conversation } = await createResponse.json();
      const conversationId = conversation.id;

      setMockConversationId(conversationId);

      // Exchange multiple messages
      const messages = [
        { sender: 'coach-123', senderType: 'coach', content: 'How was your workout today?' },
        { sender: 'client-456', senderType: 'client', content: 'It was great! I increased my bench press.' },
        { sender: 'coach-123', senderType: 'coach', content: 'Awesome! What weight did you reach?' },
        { sender: 'client-456', senderType: 'client', content: '185 lbs for 5 reps!' },
        { sender: 'coach-123', senderType: 'coach', content: 'Excellent progress! Keep it up!' }
      ];

      for (const msg of messages) {
        setMockSessionUser(msg.sender);
        setMockMessageToCreate({
          conversation_id: conversationId,
          sender_id: msg.sender,
          sender_type: msg.senderType,
          content: msg.content,
          message_type: 'text'
        });

        const messageRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: msg.content,
            message_type: 'text'
          }),
          headers: { 'content-type': 'application/json' }
        });

        const response = await sendMessage(messageRequest, { params: { id: conversationId } });
        expect(response.status).toBe(201);
      }

      // Verify all messages are persisted
      setMockSessionUser('coach-123');

      const getMessagesRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);
      const getResponse = await getMessages(getMessagesRequest, { params: { id: conversationId } });
      const { messages: fetchedMessages } = await getResponse.json();

      expect(fetchedMessages).toHaveLength(5);
      expect(fetchedMessages.map((m: any) => m.content)).toEqual(messages.map(m => m.content));
    });

    it('should handle conversation creation failure gracefully and allow retry', async () => {
      setMockSessionUser('coach-123');
      setMockClientId('client-123');
      setMockOrgId('org-123');

      // Mock RPC to fail first time, succeed second time
      let callCount = 0;
      mockSupabaseClient.rpc.mockImplementation(async (functionName: string, params: any) => {
        callCount++;
        
        if (functionName === 'get_or_create_conversation') {
          if (callCount === 1) {
            // Simulate foreign key constraint error on first attempt
            return {
              data: null,
              error: {
                code: '23503',
                message: 'insert or update on table "conversations" violates foreign key constraint',
                details: 'Key (organization_id)=(invalid-org) is not present in table "organizations"'
              }
            };
          } else {
            // Succeed on retry
            const { p_organization_id, p_client_id, p_coach_id } = params;
            const conversationId = mockDb.createConversation({
              organization_id: p_organization_id,
              client_id: p_client_id,
              coach_id: p_coach_id,
              title: 'Retry Conversation',
              status: 'active'
            });
            return { data: conversationId, error: null };
          }
        }
        
        return { data: null, error: { message: 'Unknown function' } };
      });

      // First attempt should fail
      const request1 = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response1 = await createConversation(request1);
      expect(response1.status).toBe(500);

      // Second attempt should succeed
      const request2 = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response2 = await createConversation(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(201);
      expect(data2.conversation).toBeDefined();
    });
  });

  describe('Database Consistency Tests', () => {
    it('should ensure conversation exists before allowing message creation', async () => {
      // Try to create a message without a conversation first
      const fakeConversationId = 'conv-nonexistent';
      
      setMockSessionUser('coach-123');
      setMockConversationId(fakeConversationId);

      const messageRequest = new NextRequest(`http://localhost:3000/api/conversations/${fakeConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'This should fail',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await sendMessage(messageRequest, { params: { id: fakeConversationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');

      // Now create the conversation properly and verify message can be sent
      setMockClientId('client-123');
      setMockOrgId('org-123');

      const createConvRequest = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const createResponse = await createConversation(createConvRequest);
      const { conversation } = await createResponse.json();
      const realConversationId = conversation.id;

      // Now message creation should work
      setMockConversationId(realConversationId);
      setMockMessageToCreate({
        conversation_id: realConversationId,
        sender_id: 'coach-123',
        sender_type: 'coach',
        content: 'This should work now',
        message_type: 'text'
      });

      const messageRequest2 = new NextRequest(`http://localhost:3000/api/conversations/${realConversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'This should work now',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response2 = await sendMessage(messageRequest2, { params: { id: realConversationId } });
      const data2 = await response2.json();

      expect(response2.status).toBe(201);
      expect(data2.message.content).toBe('This should work now');
    });

    it('should maintain referential integrity across conversation operations', async () => {
      setMockSessionUser('coach-123');
      setMockClientId('client-123');
      setMockOrgId('org-123');

      // Create conversation
      const createRequest = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const createResponse = await createConversation(createRequest);
      const { conversation } = await createResponse.json();
      const conversationId = conversation.id;

      // Verify conversation exists in mock database
      const dbConversation = mockDb.getConversation(conversationId);
      expect(dbConversation).toBeDefined();
      expect(dbConversation.organization_id).toBe('org-123');
      expect(dbConversation.client_id).toBe('client-123');
      expect(dbConversation.coach_id).toBe('coach-123');

      // Create message and verify it references the conversation
      setMockConversationId(conversationId);
      setMockMessageToCreate({
        conversation_id: conversationId,
        sender_id: 'coach-123',
        sender_type: 'coach',
        content: 'Testing referential integrity',
        message_type: 'text'
      });

      const messageRequest = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Testing referential integrity',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const messageResponse = await sendMessage(messageRequest, { params: { id: conversationId } });
      const messageData = await messageResponse.json();

      expect(messageResponse.status).toBe(201);
      expect(messageData.message.conversation_id).toBe(conversationId);

      // Verify message exists and references conversation
      const dbMessages = mockDb.getMessages(conversationId);
      expect(dbMessages).toHaveLength(1);
      expect(dbMessages[0].conversation_id).toBe(conversationId);
    });
  });
});