import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/conversations/[id]/messages/route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

const mockSupabaseClient = {
  auth: {
    getSession: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    in: jest.fn(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn()
  }))
};

describe('/api/conversations/[id]/messages', () => {
  const conversationId = 'conv-123';
  const mockParams = { id: conversationId };

  beforeEach(() => {
    jest.clearAllMocks();
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('POST /api/conversations/[id]/messages', () => {
    const mockSession = {
      user: { id: 'user-123' }
    };

    const mockConversation = {
      id: conversationId,
      organization_id: 'org-123',
      client_id: 'client-123',
      coach_id: 'coach-123'
    };

    const mockUserOrg = {
      organization_id: 'org-123'
    };

    it('should create a message successfully when user is coach', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockConversation, coach_id: 'user-123' },
              error: null
            })
          })
        })
      });

      // Mock user organization verification
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      // Mock message creation
      const mockMessage = {
        id: 'msg-123',
        conversation_id: conversationId,
        sender_id: 'user-123',
        sender_type: 'coach',
        content: 'Hello there!',
        message_type: 'text',
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        users: {
          id: 'user-123',
          name: 'Coach Name',
          email: 'coach@example.com'
        }
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMessage,
              error: null
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Hello there!',
          message_type: 'text'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message).toEqual(mockMessage);
    });

    it('should create a message successfully when user is client', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation lookup where user is NOT the coach (so they're the client)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockConversation, coach_id: 'different-coach-id' },
              error: null
            })
          })
        })
      });

      // Mock user organization verification
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      // Mock message creation with sender_type as 'client'
      const mockMessage = {
        id: 'msg-124',
        conversation_id: conversationId,
        sender_id: 'user-123',
        sender_type: 'client',
        content: 'Thanks for the help!',
        message_type: 'text',
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        users: {
          id: 'user-123',
          name: 'Client Name',
          email: 'client@example.com'
        }
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMessage,
              error: null
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: 'Thanks for the help!'
        }),
        headers: {
          'content-type': 'application/json'
        }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.message.sender_type).toBe('client');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Test message' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 400 when message content is missing', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Message content is required');
    });

    it('should return 400 when content is only whitespace', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: '   ' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Message content is required');
    });

    it('should return 404 when conversation is not found', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Test message' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Conversation not found');
    });

    it('should return 403 when user lacks access to organization', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation lookup - success
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
              error: null
            })
          })
        })
      });

      // Mock user organization verification - fail
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

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Test message' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Access denied');
    });

    it('should return 500 when message creation fails due to foreign key constraint', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock successful conversation and organization lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
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
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      // Mock message creation failure with foreign key constraint error
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: {
                code: '23503',
                message: 'insert or update on table "messages" violates foreign key constraint "messages_conversation_id_fkey"',
                details: 'Key (conversation_id)=(invalid-conv-id) is not present in table "conversations"'
              }
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Test message' }),
        headers: { 'content-type': 'application/json' }
      });

      const response = await POST(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to send message');
    });

    it('should trim whitespace from message content', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
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
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'msg-123', content: 'Trimmed message' },
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: mockInsert
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: '   Trimmed message   ' }),
        headers: { 'content-type': 'application/json' }
      });

      await POST(request, { params: mockParams });

      // Verify content was trimmed
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Trimmed message'
        })
      );
    });
  });

  describe('GET /api/conversations/[id]/messages', () => {
    const mockSession = {
      user: { id: 'user-123' }
    };

    const mockConversation = {
      id: conversationId,
      organization_id: 'org-123',
      client_id: 'client-123',
      coach_id: 'coach-123'
    };

    const mockUserOrg = {
      organization_id: 'org-123'
    };

    it('should fetch messages successfully and mark client messages as read when user is coach', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation lookup where user is the coach
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockConversation, coach_id: 'user-123' },
              error: null
            })
          })
        })
      });

      // Mock user organization verification
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      // Mock messages fetch
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello from client',
          sender_id: 'client-123',
          sender_type: 'client',
          message_type: 'text',
          read_at: null,
          created_at: '2024-01-01T00:00:00Z',
          users: { id: 'client-123', name: 'Client', email: 'client@example.com' }
        },
        {
          id: 'msg-2',
          content: 'Hello from coach',
          sender_id: 'coach-123',
          sender_type: 'coach',
          message_type: 'text',
          read_at: '2024-01-01T01:00:00Z',
          created_at: '2024-01-01T01:00:00Z',
          users: { id: 'coach-123', name: 'Coach', email: 'coach@example.com' }
        }
      ];

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockMessages,
                error: null
              })
            })
          })
        })
      });

      // Mock message update for marking as read
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.messages).toHaveLength(2);
      expect(responseData.conversation_id).toBe(conversationId);
    });

    it('should not mark messages as read when user is not coach', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      // Mock conversation lookup where user is NOT the coach
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockConversation, coach_id: 'different-coach-id' },
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
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello from client',
          sender_type: 'client',
          read_at: null
        }
      ];

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockMessages,
                error: null
              })
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });

      expect(response.status).toBe(200);
      // Verify update was not called since user is not coach
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(3); // Only 3 calls, no update call
    });

    it('should handle pagination parameters correctly', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
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
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      const mockRange = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: mockRange
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages?limit=25&offset=10`);

      await GET(request, { params: mockParams });

      expect(mockRange).toHaveBeenCalledWith(10, 34); // offset 10, limit 25 -> range(10, 34)
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 404 when conversation is not found', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe('Conversation not found');
    });

    it('should return 403 when user lacks access to organization', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
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

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Access denied');
    });

    it('should return 500 when messages fetch fails', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockConversation,
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
                data: mockUserOrg,
                error: null
              })
            })
          })
        })
      });

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        })
      });

      const request = new NextRequest(`http://localhost:3000/api/conversations/${conversationId}/messages`);

      const response = await GET(request, { params: mockParams });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch messages');
    });
  });
});