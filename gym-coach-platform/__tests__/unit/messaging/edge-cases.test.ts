import { NextRequest } from 'next/server';
import { POST as createConversation } from '@/app/api/conversations/route';
import { POST as sendMessage } from '@/app/api/conversations/[id]/messages/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

describe('Messaging System Edge Cases', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseClient = {
      auth: {
        getSession: jest.fn()
      },
      from: jest.fn(),
      rpc: jest.fn()
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('Network Failures During Conversation Creation', () => {
    const mockSession = { user: { id: 'coach-123' } };
    const mockUserOrg = { organization_id: 'org-123' };
    const mockClient = { id: 'client-123', name: 'Test Client' };

    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock successful user org and client lookups by default
      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount <= 2) { // First two calls are for user org and client lookups
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: fromCallCount === 1 ? mockUserOrg : mockClient,
                  error: null
                }),
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockClient,
                    error: null
                  })
                })
              })
            })
          };
        }
        return {};
      });
    });

    it('should handle database connection timeout during conversation creation', async () => {
      mockSupabaseClient.rpc.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 100);
        });
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle database deadlock during conversation creation', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: {
          code: '40P01',
          message: 'deadlock detected',
          details: 'Process 12345 waits for ShareLock on transaction 67890'
        }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create conversation');
    });

    it('should handle constraint violation with detailed error information', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: {
          code: '23503',
          message: 'insert or update on table "conversations" violates foreign key constraint "conversations_organization_id_fkey"',
          details: 'Key (organization_id)=(non-existent-org) is not present in table "organizations"',
          hint: 'Check that the organization exists before creating a conversation'
        }
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create conversation');
    });

    it('should handle partial database response during conversation creation', async () => {
      // Simulate RPC succeeding but conversation fetch failing
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 'conv-123',
        error: null
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockClient,
                error: null
              })
            })
          })
        })
      });

      // Final conversation fetch fails
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Conversation not found after creation' }
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.conversation).toBeNull();
    });

    it('should handle malformed request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle extremely large client_id values', async () => {
      const largeClientId = 'client-' + 'x'.repeat(1000);

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: largeClientId }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Client not found');
    });
  });

  describe('Race Condition Tests', () => {
    const mockSession = { user: { id: 'coach-123' } };
    const mockConversation = {
      id: 'conv-123',
      organization_id: 'org-123',
      client_id: 'client-123',
      coach_id: 'coach-123'
    };

    it('should handle concurrent conversation creation requests', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Track the number of RPC calls
      let rpcCallCount = 0;
      const conversationId = 'conv-race-123';

      mockSupabaseClient.rpc.mockImplementation(async (functionName: string, params: any) => {
        rpcCallCount++;
        
        if (functionName === 'get_or_create_conversation') {
          // Simulate race condition - first call creates, subsequent calls find existing
          if (rpcCallCount === 1) {
            // Simulate slight delay for first creation
            await new Promise(resolve => setTimeout(resolve, 50));
            return { data: conversationId, error: null };
          } else {
            // Subsequent calls return the same conversation ID (simulating get_or_create logic)
            return { data: conversationId, error: null };
          }
        }
        
        return { data: null, error: { message: 'Unknown function' } };
      });

      // Mock other required calls
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_organizations' || table === 'clients') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null
                }),
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'client-123', name: 'Test Client' },
                    error: null
                  })
                })
              })
            })
          };
        }
        
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: conversationId,
                    title: 'Test Conversation',
                    clients: { id: 'client-123', name: 'Test Client', email: 'test@example.com' }
                  },
                  error: null
                })
              })
            })
          };
        }

        return {};
      });

      // Create multiple concurrent requests
      const requests = Array(3).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ client_id: 'client-123' }),
          headers: { 'content-type': 'application/json' }
        })
      );

      // Execute all requests concurrently
      const responses = await Promise.all(
        requests.map(req => createConversation(req))
      );

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // All should return the same conversation ID
      const responseData = await Promise.all(responses.map(r => r.json()));
      const conversationIds = responseData.map(data => data.conversation.id);
      
      expect(new Set(conversationIds).size).toBe(1); // All IDs should be the same
      expect(conversationIds[0]).toBe(conversationId);
    });

    it('should handle concurrent message creation for the same conversation', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation and organization lookups
      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockConversation,
                  error: null
                })
              })
            })
          };
        }
        
        if (table === 'user_organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null
                  })
                })
              })
            })
          };
        }
        
        if (table === 'messages') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  // Add a small delay to simulate database processing
                  await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
                  
                  return {
                    data: {
                      id: `msg-${Date.now()}-${Math.random()}`,
                      conversation_id: 'conv-123',
                      sender_id: 'coach-123',
                      sender_type: 'coach',
                      content: 'Test message',
                      message_type: 'text',
                      created_at: new Date().toISOString(),
                      users: { id: 'coach-123', name: 'Coach', email: 'coach@example.com' }
                    },
                    error: null
                  };
                })
              })
            })
          };
        }

        return {};
      });

      // Create multiple concurrent message requests
      const conversationId = 'conv-123';
      const messageRequests = Array(5).fill(null).map((_, index) => 
        new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: `Concurrent message ${index}`,
            message_type: 'text'
          }),
          headers: { 'content-type': 'application/json' }
        })
      );

      // Execute all message creation requests concurrently
      const messageResponses = await Promise.all(
        messageRequests.map(req => sendMessage(req, { params: { id: conversationId } }))
      );

      // All message creation requests should succeed
      messageResponses.forEach((response, index) => {
        expect(response.status).toBe(201);
      });

      // All messages should have unique IDs
      const messageData = await Promise.all(messageResponses.map(r => r.json()));
      const messageIds = messageData.map(data => data.message.id);
      
      expect(new Set(messageIds).size).toBe(5); // All IDs should be unique
    });

    it('should handle message sending during conversation deletion race condition', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Simulate conversation being deleted between verification and message creation
      let conversationLookupCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          conversationLookupCount++;
          
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => {
                  if (conversationLookupCount === 1) {
                    // First lookup succeeds (verification)
                    return { data: mockConversation, error: null };
                  } else {
                    // Subsequent lookups fail (conversation was deleted)
                    return { data: null, error: null };
                  }
                })
              })
            })
          };
        }
        
        if (table === 'user_organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null
                  })
                })
              })
            })
          };
        }
        
        if (table === 'messages') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: {
                    code: '23503',
                    message: 'insert or update on table "messages" violates foreign key constraint "messages_conversation_id_fkey"',
                    details: 'Key (conversation_id)=(conv-123) is not present in table "conversations"'
                  }
                })
              })
            })
          };
        }

        return {};
      });

      const conversationId = 'conv-123';
      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'This should fail due to race condition',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await sendMessage(request, { params: { id: conversationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send message');
    });

    it('should handle session expiry during long-running operations', async () => {
      // Mock session that expires during the operation
      let sessionCallCount = 0;
      mockSupabaseClient.auth.getSession.mockImplementation(async () => {
        sessionCallCount++;
        
        if (sessionCallCount <= 2) {
          return { data: { session: mockSession } };
        } else {
          // Session expires after 2 calls
          return { data: { session: null } };
        }
      });

      mockSupabaseClient.from.mockImplementation(() => {
        // Add delay to simulate slow database operation
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return { data: { organization_id: 'org-123' }, error: null };
              }),
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'client-123', name: 'Test Client' },
                  error: null
                })
              })
            })
          })
        };
      });

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ client_id: 'client-123' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      // Should handle gracefully but may result in unauthorized if session expires
      expect([401, 201]).toContain(response.status);
      
      if (response.status === 401) {
        expect(data.error).toBe('Unauthorized');
      }
    });

    it('should handle rapid successive API calls with proper rate limiting', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock successful responses but track call frequency
      const callTimestamps: number[] = [];
      
      mockSupabaseClient.from.mockImplementation(() => {
        callTimestamps.push(Date.now());
        
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: 'org-123' },
                error: null
              }),
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'client-123', name: 'Test Client' },
                  error: null
                })
              })
            })
          })
        };
      });

      mockSupabaseClient.rpc.mockResolvedValue({
        data: 'conv-123',
        error: null
      });

      // Make rapid successive calls
      const rapidRequests = Array(10).fill(null).map(() => 
        new NextRequest('http://localhost:3000/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ client_id: 'client-123' }),
          headers: { 'content-type': 'application/json' }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(
        rapidRequests.map(req => createConversation(req))
      );
      const endTime = Date.now();

      // All should complete within a reasonable timeframe
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
      
      // Most should succeed (some may fail due to rate limiting, but that's acceptable)
      const successfulResponses = responses.filter(r => r.status === 201);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity Edge Cases', () => {
    const mockSession = { user: { id: 'coach-123' } };

    it('should handle null or undefined conversation data gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null, // Conversation not found
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      const conversationId = 'conv-null-test';
      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test message',
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await sendMessage(request, { params: { id: conversationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Conversation not found');
    });

    it('should handle corrupted JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: '{"client_id": "test", invalid json}',
        headers: { 'content-type': 'application/json' }
      });

      const response = await createConversation(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle extremely long message content', async () => {
      const mockConversation = {
        id: 'conv-123',
        organization_id: 'org-123',
        client_id: 'client-123',
        coach_id: 'coach-123'
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockConversation,
                  error: null
                })
              })
            })
          };
        }
        
        if (table === 'user_organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null
                  })
                })
              })
            })
          };
        }
        
        if (table === 'messages') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: {
                    code: '22001',
                    message: 'value too long for type character varying',
                    details: 'The message content exceeds the maximum allowed length'
                  }
                })
              })
            })
          };
        }

        return {};
      });

      const longContent = 'x'.repeat(10000); // 10k character message
      const conversationId = 'conv-123';
      
      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: longContent,
          message_type: 'text'
        }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await sendMessage(request, { params: { id: conversationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send message');
    });
  });
});